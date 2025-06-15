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
import { expirePay } from "../external-apis/fapshi.api";
import path from "path";
import fs from "fs";

const CRUDReservation: CRUD = new CRUD(ReservationModel);

const createReservation = catchAsync(async (req, res, next) => {
  let email = req.body.guestEmail;

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

const updateReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
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

      invoice.paymentStatus =
        data.amount === invoice.grandTotal ? "paid" : "partial";
      invoice.amountPaid += data.amount;
      invoice.amountDue = invoice.grandTotal - invoice.amountPaid;

      const reservedRooms = await RoomModel.find({
        "lock.reservation": reservation._id,
      });

      // console.log("ReservedRooms", reservedRooms, reservation._id);

      reservation.markModified("status");
      reservation.status = "confirmed";

      await reservation.save();
      invoice.markModified("amountDue");
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

export const reservationControllers = {
  createReservation,
  readOneReservation,
  readAllReservations,
  updateReservation,
  deleteReservation,
  depositPaymentRedirect,
};
