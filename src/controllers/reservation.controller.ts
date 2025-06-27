import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ReservationModel } from "../models/Reservation.model";
import { RoomModel } from "../models/Room.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { InvoiceModel } from "../models/Invoice.model";
import { GuestModel } from "../models/Guest.model";
import { IUser } from "../models/User.model";
import { sendEmail } from "../util/sendEmail.util";
import { appResponder } from "../util/appResponder.util";
import {
  generateInvoiceEmailTemplateData,
  renderInvoiceHTMLFromTemplate,
} from "../util/generateInvoiceEmailTemplate.util";
import * as mongoose from "mongoose";
import { RecieptModel } from "../models/Reciept.model";
import { TransactionModel } from "../models/Transaction.model";
import { expirePay, payout } from "../external-apis/fapshi.api";
import path from "path";
import fs from "fs";
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";
import { getGuestDetailsFromReservation } from "../util/getGuestFromReservation.util";

const CRUDReservation: CRUD = new CRUD(ReservationModel);

const createReservation = catchAsync(async (req, res, next) => {
  let email = req.body.guestEmail;
  req.body.status = undefined;

  const guest = await GuestModel.findById(req.body.guest).populate("user");

  if (!email && guest?.user && "email" in guest.user) {
    email = guest.user.email;
  }

  let reservation;
  try {
    reservation = new ReservationModel(req.body);
    await reservation.save();

    const invoice = await InvoiceModel.create({
      reservation: reservation._id,
      lineItems: reservation.items,
    });

    const emailData = await generateInvoiceEmailTemplateData(
      String(invoice._id)
    );

    const html = renderInvoiceHTMLFromTemplate(emailData);

    await sendEmail(email, "RESERVATION INVOICE", "", html);

    appResponder(
      StatusCodes.OK,
      {
        message: "Reservation and Invoice created. Email sent.",
        reservation,
        invoice,
      },
      res
    );
  } catch (err) {
    if (reservation?._id) {
      await ReservationModel.findByIdAndDelete(reservation._id);
    }
    return next(err);
  }
});

const readOneReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.readOne(req.params.id, res, [], req);
  }
);

const readAllReservations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.readAll(res, req, 1, 100, []);
  }
);

//use it for updating reservation
const updateReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.status = undefined;
    await CRUDReservation.update(req.params.id, res, req);
  }
);

const deleteReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.delete(req.params.id, res, req);
  }
);

const depositPaymentRedirect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (typeof req.query.data !== "string") {
      return next(new AppError("Invalid data format", StatusCodes.BAD_REQUEST));
    }

    const data = JSON.parse(decodeURIComponent(req.query.data));

    if (!data.amount || !data.reservationId) {
      return next(
        new AppError("Invalid data object format", StatusCodes.BAD_REQUEST)
      );
    }

    try {
      const reservation = await ReservationModel.findById(
        data.reservationId
      ).populate({
        path: "guest",
        populate: {
          path: "user",
        },
      });

      if (!reservation) {
        throw new AppError(
          "No such reservation Id in the database.",
          StatusCodes.BAD_REQUEST
        );
      }

      const guestId = reservation.guest?._id;

      const existingTransaction = await TransactionModel.find({
        transactionType: "bill payment",
        reason: "Payment of reservation down payment.",
        amountInCFA: data.amount,
        status: "success",
        reservation: data.reservationId,
      });

      if (existingTransaction.length > 0) {
        return next(
          new AppError(
            "Transaction has already been executed",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      const transaction = await TransactionModel.create({
        transactionType: "bill payment",
        reason: "Payment of reservation down payment.",
        amountInCFA: data.amount,
        status: "success",
        reservation: data.reservationId,
        guest: guestId,
      });

      const reciept = await RecieptModel.create({
        transaction: transaction._id,
        amountInCFA: data.amount,
        issued: true,
        method: "Email",
        guest: guestId,
      });

      const invoice = await InvoiceModel.findOne({
        reservation: data.reservationId,
      });

      if (!invoice) {
        throw new AppError(
          "No invoice associated with the reservation",
          StatusCodes.BAD_REQUEST
        );
      }

      if (invoice.amountPaid == null || invoice.amountDue == null) {
        throw new AppError(
          "Invoice fields amountPaid or amountDue are missing",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      invoice.amountPaid = invoice.amountPaid || 0;
      invoice.amountDue = invoice.amountDue ?? invoice.grandTotal;

      invoice.amountPaid += data.amount;
      invoice.amountDue = invoice.grandTotal - invoice.amountPaid;

      invoice.paymentStatus =
        invoice.amountPaid >= invoice.grandTotal ? "paid" : "partial";

      const reservedRooms = await RoomModel.find({
        "lock.reservation": reservation._id,
      });

      // console.log("ReservedRooms", reservedRooms, reservation._id);

      reservation.markModified("status");
      reservation.status = "confirmed";

      await reservation.save();
      // invoice.markModified("amountDue");
      await invoice.save();

      for (const room of reservedRooms) {
        room.status = "free";
        room.lock = undefined;

        // console.log(room);

        await room.save();
      }

      // const expirePaymentLink = await expirePay(invoice.paymentLinkId);

      // if (expirePaymentLink.status !== "EXPIRED") {
      //   console.log(expirePaymentLink);
      //   console.log("Transaction Id", invoice.paymentLinkId);
      //   throw new AppError(
      //     "Failed to expire the payment link",
      //     StatusCodes.INTERNAL_SERVER_ERROR
      //   );
      // }

      const templatePath = path.join(
        __dirname,
        "/../templates/receipt.template.html"
      );
      const rawHtml = fs.readFileSync(templatePath, "utf-8");

      if (!rawHtml) {
        console.log(templatePath);
        return next(
          new AppError(
            "Error finding reciept html template",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      const guestEmail =
        (reservation.guest &&
          typeof reservation.guest !== "string" &&
          (reservation.guest as any).user &&
          typeof (reservation.guest as any).user !== "string" &&
          (reservation.guest as any).user.email) ||
        reservation.guestEmail;

      if (!guestEmail) {
        throw new AppError(
          "No guest email available to send receipt.",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const finalHtml = rawHtml
        .replace(/{{receiptId}}/g, String(reciept._id))
        .replace(/{{date}}/g, reciept.createdAt.toLocaleString())
        .replace(/{{method}}/g, "Email")
        .replace(/{{transactionId}}/g, String(transaction._id))
        .replace(/{{transactionType}}/g, String(transaction.transactionType))
        .replace(/{{reason}}/g, String(transaction.reason))
        .replace(/{{reservationId}}/g, String(reservation._id))
        .replace(/{{status}}/g, String(transaction.status))
        .replace(/{{amount}}/g, data.amount.toLocaleString());

      await sendEmail(guestEmail, "RESERVATION RECEIPT", "", finalHtml);

      res.status(StatusCodes.OK).send(finalHtml);
    } catch (err) {
      return next(err);
    }
  }
);

const cancelReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    /*
    What I have to do:
    - get resrvation id
    - ensure that the reservation was first of all confirmed
    - check if the the cancelation policy is active
    - check if the reservation is valid with the number of hours allowed in the cancelation policy
    - get the invoice and find out how much has already been paid
    - send back the use the cancelation policy percentage amount
    - update the reservation as cancelled
     */

    const reservationId = req.params.id;
    const { orangeMoneyNumber, moMoNumber, isOnline } = req.body;

    if (isOnline && !orangeMoneyNumber && !moMoNumber) {
      return next(
        new AppError("Payout number required.", StatusCodes.BAD_REQUEST)
      );
    }

    if (!reservationId) {
      return next(
        new AppError(
          "resrvation id parameter is required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findById(reservationId);

    if (!reservation) {
      return next(
        new AppError(
          "No such reservation id, in the databse",
          StatusCodes.NOT_FOUND
        )
      );
    }
    // console.log(reservation.status);
    if (reservation.status !== "confirmed") {
      return next(
        new AppError(
          "Refunds can only be done for confirmed reservations",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const adminConfig = (await AdminConfigurationModel.find())[0];

    if (!adminConfig) {
      return next(
        new AppError(
          "Cannot find admin cofigurations.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    if (!adminConfig.reservations.cancelationPolicy.isRefundable) {
      return next(
        new AppError(
          "Reservation Cancelations are not possible at this moment",
          StatusCodes.NOT_ACCEPTABLE
        )
      );
    }

    const refundableHours =
      adminConfig.reservations.cancelationPolicy.refundableUntilInHours;
    const refundableMs = refundableHours * 60 * 60 * 1000;

    const reservationCreatedAtMs = reservation.createdAt.getTime();
    const nowMs = Date.now();

    const cutoffMs = reservationCreatedAtMs + refundableMs;

    console.log("Now:", new Date(nowMs).toLocaleString());
    console.log(
      "Reservation Created At:",
      new Date(reservationCreatedAtMs).toLocaleString()
    );
    console.log(
      "Cutoff for Refund Eligibility:",
      new Date(cutoffMs).toLocaleString()
    );

    if (nowMs > cutoffMs) {
      return next(
        new AppError(
          `Reservation has passed the allowed cancellation period of ${refundableHours} hours from reservation.`,
          StatusCodes.NOT_ACCEPTABLE
        )
      );
    }

    const invoice = await InvoiceModel.findOne({
      reservation: reservation._id,
    });

    if (!invoice?.amountPaid) {
      return next(
        new AppError(
          "Invoice has never paid for",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const refundAmount =
      invoice.amountPaid *
      (adminConfig.reservations.cancelationPolicy.refundablePercentage / 100);

    const guestInfo = await getGuestDetailsFromReservation(
      String(reservation._id)
    );

    if (isOnline) {
      const payOutData = await payout({
        amount: refundAmount,
        phone: orangeMoneyNumber || moMoNumber,
      });

      console.log(guestInfo);

      console.log(payOutData);

      if (`${payOutData.statusCode}`.startsWith("4")) {
        return next(
          new AppError(
            "Error implementing payout",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }
    }

    reservation.status = "canceled";
    await reservation.save();

    const transaction = await TransactionModel.create({
      transactionType: "refund",
      reason: "Refund, after canceling reservation",
      amountInCFA: refundAmount,
      status: "success",
      reservation: reservation._id,
    });

    const reciept = await RecieptModel.create({
      amountInCFA: refundAmount,
      issued: true,
      method: isOnline ? "Email" : "Onsite",
      // guest: "6669f1d34f1f8d5d8e3d91a1",
      transaction: transaction._id,
    });

    if (isOnline) {
      const templatePath = path.join(
        __dirname,
        "/../templates/receipt.template.html"
      );
      const rawHtml = fs.readFileSync(templatePath, "utf-8");

      if (!rawHtml) {
        console.log(templatePath);
        return next(
          new AppError(
            "Error finding reciept html template",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      const guestEmail =
        (reservation.guest &&
          typeof reservation.guest !== "string" &&
          (reservation.guest as any).user &&
          typeof (reservation.guest as any).user !== "string" &&
          (reservation.guest as any).user.email) ||
        reservation.guestEmail;

      if (!guestEmail) {
        throw new AppError(
          "No guest email available to send receipt.",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const finalHtml = rawHtml
        .replace(/{{receiptId}}/g, String(reciept._id))
        .replace(/{{date}}/g, reciept.createdAt.toLocaleString())
        .replace(/{{method}}/g, "Email")
        .replace(/{{transactionId}}/g, String(transaction._id))
        .replace(/{{transactionType}}/g, String(transaction.transactionType))
        .replace(/{{reason}}/g, String(transaction.reason))
        .replace(/{{reservationId}}/g, String(reservation._id))
        .replace(/{{status}}/g, String(transaction.status))
        .replace(/{{amount}}/g, refundAmount.toLocaleString());

      await sendEmail(guestEmail, "RESERVATION REFUND RECEIPT", "", finalHtml);
    }

    appResponder(
      StatusCodes.OK,
      {
        message: "Reservation canceled successfully",
        refundAmount,
        status: "success",
        reciept,
      },
      res
    );
  }
);

const updatingGuestRooms = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    /*

    what do I  want to do:
    * Get reservation Id
    * check if reservation exist
    * Ensure that only reseavtion that are marked reserved can be updated
    * the itesm array canot be 
    * Get new Items
    * Update the items in the reservation
    * Send guest the new Invoice
    * 
     */

    if (!req.params.id || !req.body) {
      return next(
        new AppError(
          "Invalid update reservation request, please ensure there resevation Id in the request parameters, and a body containign the new reservation items is in the req body",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservationId = req.params.id;
    const { reservationItems } = req.body;

    const reservation = await ReservationModel.findById(reservationId);

    if (!reservation) {
      return next(
        new AppError(
          "Reservation Id, not found in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (reservation.status !== "confirmed") {
      return next(
        new AppError(
          "Only rooms for a confirmed reservation can be updated",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    await ReservationModel.findByIdAndUpdate(reservationId, {
      items: reservationItems,
    });

    const invoice = await InvoiceModel.findOne({ reservation: reservationId });

    if (!invoice) {
      return next(
        new AppError(
          "Error finding corresponding existing reservation invoice",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

export const reservationControllers = {
  createReservation,
  readOneReservation,
  readAllReservations,
  updateReservation,
  deleteReservation,
  depositPaymentRedirect,
  cancelReservation,
};
