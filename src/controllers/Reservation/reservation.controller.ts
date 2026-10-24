import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { ReservationModel } from "../../models/Reservations/Reservation.model";
import { RoomModel } from "../../models/Properties/Room.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { InvoiceModel } from "../../models/Finance/Invoice.model";
import { GuestModel } from "../../models/HR/Guest.model";
import { IUser } from "../../models/HR/User.model";
import { sendEmail } from "../../util/sendEmail.util";
import { appResponder } from "../../util/appResponder.util";
import {
  generateInvoiceEmailTemplateData,
  renderInvoiceHTMLFromTemplate,
} from "../../util/generateInvoiceEmailTemplate.util";
import * as mongoose from "mongoose";
import { ReceiptModel } from "../../models/Finance/Receipt.model";
import { TransactionModel } from "../../models/Finance/Transaction.model";
import { expirePay, payout } from "../../services/fapshi.api";
import path from "path";
import { promises as promFs } from "fs";
import { AdminConfigurationModel } from "../../models/Config/AdminConfiguration.model";
import { getGuestDetailsFromReservation } from "../../util/getGuestFromReservation.util";
import { validateReservationItemsAvailability } from "../../util/validateReservationItems.util";
import { BillModel } from "../../models/Finance/Bill.model";
import { io } from "../../socket";
import { UserModel } from "../../models/HR/User.model";
import { EmployeeModel } from "../../models/HR/Employee.model";
import * as generatePassword from "generate-password";
import { PhoneNumber } from "libphonenumber-js";
import { RoleModel } from "../../models/Authorization/Role.model";
import fs from "fs";
import { ReservationSnapshotModel } from "../../models/Reservations/ReservationSnapShot.model";
import { iptv } from "../../services/iptv.api";

const CRUDReservation: CRUD = new CRUD(ReservationModel);

const createReservation = catchAsync(async (req, res, next) => {
  let email = req.body.guestEmail;
  req.body.status = undefined;

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
    throw err;
  }
});

const readOneReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.readOne(req.params.id, res, [], req);
  }
);

const readAllReservations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.readAll(res, req, 1, 1000, []);
  }
);

async function fillTemplate(
  templatePath: string,
  replacements: Record<string, string>
) {
  let html: string = await promFs.readFile(templatePath, "utf-8");
  for (const key in replacements) {
    html = html.replace(new RegExp(`\\[${key}\\]`, "g"), replacements[key]);
  }
  return html;
}

export const updateReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const reservationId = req.params.id;

    const reservation = await ReservationModel.findById(reservationId);

    if (!reservation) {
      return next(
        new AppError(
          "No such reservation in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    delete req.body.items;

    // ── Check-out logic ──────────────────────────────────────────────────
    if (req.body.status === "checked out") {
      const invoice = await InvoiceModel.findOne({
        reservation: reservationId,
      }).lean();
      if (!invoice) {
        return next(
          new AppError(
            "No invoice found for this reservation",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      if (["unpaid", "partial"].includes(invoice.paymentStatus)) {
        return next(
          new AppError(
            "Guest must settle their invoice before checking out",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      const bill = await BillModel.findOne({ reservationId }).lean();
      if (bill?.status === "pending") {
        return next(
          new AppError(
            "Guest must settle their bill before checking out",
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    // ── Check-in logic ───────────────────────────────────────────────────
    if (
      req.body.status === "checked in" &&
      reservation.status !== "checked in"
    ) {
      const frontEndUrl =
        process.env.NODE_ENV === "production"
          ? process.env.FRONT_END_URL_PROD
          : process.env.FRONT_END_URL_DEV;

      if (!frontEndUrl) {
        return next(
          new AppError(
            "Front-end base URL is missing from environment variables",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      if (!req.body.wifi?.name || !req.body.wifi?.password) {
        return next(
          new AppError(
            "Guest may not be checked in without wifi credentials",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const userExist = await UserModel.findOne({
        email: reservation.guestEmail,
      });

      if (userExist) {
        const guest = await GuestModel.findOne({ user: userExist._id });
        const employee = await EmployeeModel.findOne({ user: userExist._id });

        if (!guest) {
          return next(
            new AppError(
              "Corresponding guest account does not exist",
              StatusCodes.INTERNAL_SERVER_ERROR
            )
          );
        }
        if (employee) {
          return next(
            new AppError(
              "Account is already in use as an employee. Please use a different email",
              StatusCodes.BAD_REQUEST
            )
          );
        }

        const emailHtml = await fillTemplate(
          __dirname + "/../../templates/alreadyHaveAnAccount.template.html",
          {
            "Guest Name": userExist.name,
            "Login URL": `${frontEndUrl}/authentication/login`,
            "Password Reset URL": `${frontEndUrl}/authentication/password-reset`,
          }
        );
        await sendEmail(
          userExist.email,
          "ALREADY HAVE AN ACCOUNT",
          "",
          emailHtml
        );
        req.body.guest = guest._id;
      } else {
        const randomGeneratedPassword = generatePassword.generate({
          length: 8,
          numbers: true,
          uppercase: true,
          lowercase: true,
          strict: true,
        });

        const role = await RoleModel.findOne({ name: "guest" });
        if (!role) {
          return next(
            new AppError(
              "No guest role found on the server",
              StatusCodes.INTERNAL_SERVER_ERROR
            )
          );
        }

        const newUser = await UserModel.create({
          name: reservation.guestName,
          email: reservation.guestEmail,
          phoneNumber: reservation.guestPhoneNumber,
          password: randomGeneratedPassword,
          passwordConfirm: randomGeneratedPassword,
          role: role._id,
          userType: "Guest",
        });

        let guest;
        try {
          guest = await GuestModel.create({
            ...req.body,
            user: newUser._id,
            preferedLanguage: reservation.preferedLanguage,
          });
        } catch (err) {
          await UserModel.findByIdAndDelete(newUser._id);
          throw err;
        }

        const emailHtml = await fillTemplate(
          __dirname + "/../../templates/guestCredentials.template.html",
          {
            "Guest Name": newUser.name,
            "Guest Email": newUser.email,
            "Login URL": `${frontEndUrl}/authentication/login`,
            "Temporary Password": randomGeneratedPassword,
          }
        );
        await sendEmail(
          newUser.email,
          "YOUR ATLANTIC PEARL HOTEL LOGIN CREDENTIALS - CHANGE PASSWORD ASAP",
          "",
          emailHtml
        );
        req.body.guest = guest._id;
      }
    }

    await CRUDReservation.update(reservationId, res, req);
  }
);

const deleteReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const reservation = await ReservationModel.findById(req.params.id);

    if (!reservation) {
      return next(
        new AppError(
          "Invalid reservation ID or the reservation has already been deleted.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (
      reservation.status === "checked in" ||
      reservation.status === "confirmed"
    ) {
      return next(
        new AppError(
          "You cannot delete a confirmed or checked-in reservation. Please update its status to 'cancelled' or 'no-show' instead.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

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

      const reciept = await ReceiptModel.create({
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
        "/../../templates/receipt.template.html"
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

    const reciept = await ReceiptModel.create({
      amountInCFA: refundAmount,
      issued: true,
      method: isOnline ? "Email" : "Onsite",
      // guest: "6669f1d34f1f8d5d8e3d91a1",
      transaction: transaction._id,
    });

    if (isOnline) {
      const templatePath = path.join(
        __dirname,
        "/../../templates/receipt.template.html"
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
    const { id: reservationId } = req.params;
    const { reservationItems, station } = req.body;

    if (!reservationId || !reservationItems) {
      throw new AppError(
        "Invalid request. Reservation ID and new reservation items are required.",
        StatusCodes.BAD_REQUEST
      );
    }

    const reservation = await ReservationModel.findById(reservationId)
      .populate("guest")
      .populate("items.roomType")
      .populate("items.rate")
      .populate("items.rooms.room");

    if (!reservation) {
      throw new AppError("Reservation not found", StatusCodes.NOT_FOUND);
    }

    if (reservation.status !== "checked in") {
      throw new AppError(
        "Only checked-in reservations can be updated.",
        StatusCodes.BAD_REQUEST
      );
    }

    if (!reservation.checkInDate || !reservation.checkOutDate) {
      throw new AppError(
        "Cannot find reservation check-in or check-out date.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const snapshot = await ReservationSnapshotModel.create({
      reservation: reservation._id,
      operation: "before_rooms_update",
      state: JSON.stringify(reservation.toObject()),
    });

    for (const item of reservationItems) {
      for (const room of item.rooms) {
        const roomCheckIn = new Date(room.checkIn);
        const roomCheckOut = new Date(room.checkOut);
        const resCheckIn = reservation.checkInDate as Date;
        const resCheckOut = reservation.checkOutDate as Date;

        if (roomCheckIn < resCheckIn) {
          throw new AppError(
            "Room check-in date cannot be before the reservation check-in date.",
            StatusCodes.BAD_REQUEST
          );
        }

        if (roomCheckOut > resCheckOut) {
          throw new AppError(
            "Room check-out date cannot be after the reservation check-out date.",
            StatusCodes.BAD_REQUEST
          );
        }

        if (roomCheckOut <= roomCheckIn) {
          throw new AppError(
            "Room check-out date must be after its check-in date.",
            StatusCodes.BAD_REQUEST
          );
        }
      }
    }

    const validateRooms = await validateReservationItemsAvailability(
      reservationItems
    );
    if (!validateRooms.ok) {
      throw new AppError(
        validateRooms.invalidItems[0].reason,
        StatusCodes.BAD_REQUEST
      );
    }

    const previousItems = reservation.items;

    try {
      reservation.items = reservationItems;
      reservation.roomUpdateStation = station;
      await reservation.save();

      const invoice = await InvoiceModel.findOne({
        reservation: reservationId,
      });
      if (!invoice) {
        reservation.items = previousItems;
        await reservation.save();
        throw new AppError(
          "Associated invoice not found.",
          StatusCodes.NOT_FOUND
        );
      }

      invoice.isRoomUpdate = true;
      await invoice.save();

      const guest = await getGuestDetailsFromReservation(
        reservation._id.toString()
      );
      if (!guest?.email) {
        reservation.items = previousItems;
        await reservation.save();
        invoice.isRoomUpdate = false;
        await invoice.save();
        throw new AppError(
          "Guest email not found.",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // ✅ Correct
      const emailData = await generateInvoiceEmailTemplateData(
        String(invoice._id)
      );
      const emailHtml = renderInvoiceHTMLFromTemplate(emailData);
      await sendEmail(
        guest.email,
        "Updated Invoice for Your Reservation",
        "",
        emailHtml
      );

      await sendEmail(
        guest.email,
        "Updated Invoice for Your Reservation",
        "",
        emailHtml
      );

      await ReservationSnapshotModel.create({
        reservation: reservation._id,
        operation: "after_rooms_update",
        state: JSON.stringify(reservation.toObject()),
      });

      if (process.env.IPTV === "true") {
        console.log("sending...");
        await iptv.roomMove(String(reservation._id), String(snapshot._id));
      }

      return appResponder(
        StatusCodes.OK,
        {
          message:
            "Reservation and invoice updated successfully. Email sent to guest.",
          reservation: reservation.toObject(),
          invoice: invoice.toObject(),
        },
        res
      );
    } catch (err: any) {
      console.error("Room update error:", err);

      reservation.items = previousItems;
      await reservation.save();

      const invoice = await InvoiceModel.findOne({
        reservation: reservationId,
      });
      if (invoice) {
        invoice.isRoomUpdate = false;
        await invoice.save();
      }

      throw err;
    }
  }
);

const reservationCalendar = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const reservations = await ReservationModel.find({
      $or: [
        { status: "confirmed" },
        { status: "checked in" },
        { status: "checked out" },
      ],
    });

    const data = [];

    for (const mutant of reservations) {
      const unwinded = await mutant.mutateForCalendar();
      data.push(...unwinded);
    }

    appResponder(StatusCodes.OK, data, res);
  }
);

const searchReservations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { q, filter } = req.query;

    if (!q || typeof q !== "string") {
      return next(
        new AppError("Search query `q` is required", StatusCodes.BAD_REQUEST)
      );
    }

    // Escape regex chars to prevent regex DoS
    const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeRegex, "i");

    const conditions: any = {
      $or: [
        { bookingReference: regex },
        { guestName: regex },
        { guestEmail: regex },
        { guestPhoneNumber: regex },
      ],
    };

    // active = only checked-in reservations
    if (filter === "active") {
      conditions.status = "checked in"; // adjust to match your schema values
    }

    const results = await ReservationModel.find(conditions)
      .populate({
        path: "guest",
        select: "name email phoneNumber",
      })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(StatusCodes.OK).json({
      success: true,
      count: results.length,
      data: results,
    });
  }
);

const getCheckedInReservationsByEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { guestEmail } = req.query;

    if (!guestEmail) {
      return next(
        new AppError(
          "Guest email is required to fetch reservations.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservations = await ReservationModel.find({
      guestEmail,
      status: "checked in",
    })
      .populate("guest")
      .populate({
        path: "items.roomType",
      })
      .populate({
        path: "items.rate",
      })
      .populate({
        path: "items.rooms.room",
      })
      .lean();

    if (!reservations || reservations.length === 0) {
      return next(
        new AppError(
          "No checked-in reservations found for this email.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    appResponder(StatusCodes.OK, reservations, res);
  }
);

const getGuestReservationPortal = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.user._id;

    // 1. Get user
    const user = await UserModel.findById(userId).lean();

    if (!user) {
      return next(
        new AppError("No such user in the database", StatusCodes.BAD_REQUEST)
      );
    }

    if (user.userType !== "Guest") {
      return next(
        new AppError(
          "You may not access guest only feature",
          StatusCodes.FORBIDDEN
        )
      );
    }

    // 2. Get guest profile
    const guest = await GuestModel.findOne({
      user: user._id,
    }).lean();

    if (!guest) {
      return next(
        new AppError("No such guest in the database", StatusCodes.BAD_REQUEST)
      );
    }

    // 3. Get current reservation (checked in)
    // Get current reservation (checked in)
    const currentReservation = await ReservationModel.findOne({
      guest: guest._id,
      status: "checked in",
    })
      .populate({
        path: "items.roomType",
        select: "name description amenities images",
      })
      .populate({
        path: "items.rooms.room",
        select: "roomNumber floor",
      });

    let currentStay = null;
    if (currentReservation) {
      // Calculate totals BEFORE any .lean() conversion
      const { totalBill, totalTaxes } =
        await currentReservation.calculateTotalPriceAndTax();

      // Get current bill
      const currentBill = await BillModel.findOne({
        reservationId: currentReservation._id,
        status: { $in: ["pending", "paid"] },
      })
        .populate("billItems")
        .lean();

      // Get invoice
      const currentInvoice = await InvoiceModel.findOne({
        reservation: currentReservation._id,
      })
        .populate("lineItems.roomType", "name description")
        .populate("lineItems.rate", "name totalPriceInCFA mealPlan")
        .lean();

      // Get all transactions for current reservation
      const transactions = await TransactionModel.find({
        reservation: currentReservation._id,
        guest: guest._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      // Calculate spending breakdown by category
      const spendingByCategory = transactions.reduce((acc, txn) => {
        const category = txn.transactionType;
        acc[category] = (acc[category] || 0) + txn.amountInCFA;
        return acc;
      }, {} as Record<string, number>);

      const additionalCharges = transactions
        .filter((t) => t.isCharge)
        .reduce((sum, t) => sum + t.amountInCFA, 0);

      const totalSpent = transactions.reduce(
        (sum, t) => sum + t.amountInCFA,
        0
      );

      currentStay = {
        reservation: currentReservation.toObject(), // Convert to plain object for response
        bill: currentBill,
        invoice: currentInvoice,
        transactions,
        spendingByCategory,
        financials: {
          roomTotal: totalBill,
          tax: totalTaxes,
          depositPaid: currentReservation.depositInCFA || 0,
          additionalCharges,
          totalSpent,
          balance:
            totalBill +
            additionalCharges -
            (currentReservation.depositInCFA || 0),
          amountDue: currentInvoice?.amountDue || 0,
        },
        wifi: currentReservation.wifi,
      };
    }

    if (currentReservation) {
      // Get current bill
      const currentBill = await BillModel.findOne({
        reservationId: currentReservation._id,
        status: { $in: ["pending", "paid"] },
      })
        .populate("billItems")
        .lean();

      // Get invoice
      const currentInvoice = await InvoiceModel.findOne({
        reservation: currentReservation._id,
      })
        .populate("lineItems.roomType", "name description")
        .populate("lineItems.rate", "name totalPriceInCFA mealPlan")
        .lean();

      // Get all transactions for current reservation
      const transactions = await TransactionModel.find({
        reservation: currentReservation._id,
        guest: guest._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      // Calculate spending breakdown by category
      const spendingByCategory = transactions.reduce((acc, txn) => {
        const category = txn.transactionType;
        acc[category] = (acc[category] || 0) + txn.amountInCFA;
        return acc;
      }, {} as Record<string, number>);

      // Calculate totals
      const { totalBill, totalTaxes } =
        await currentReservation.calculateTotalPriceAndTax();

      const additionalCharges = transactions
        .filter((t) => t.isCharge)
        .reduce((sum, t) => sum + t.amountInCFA, 0);

      const totalSpent = transactions.reduce(
        (sum, t) => sum + t.amountInCFA,
        0
      );

      currentStay = {
        reservation: currentReservation,
        bill: currentBill,
        invoice: currentInvoice,
        transactions,
        spendingByCategory,
        financials: {
          roomTotal: totalBill,
          tax: totalTaxes,
          depositPaid: currentReservation.depositInCFA || 0,
          additionalCharges,
          totalSpent,
          balance:
            totalBill +
            additionalCharges -
            (currentReservation.depositInCFA || 0),
          amountDue: currentInvoice?.amountDue || 0,
        },
        wifi: currentReservation.wifi,
      };
    }

    // 4. Get past reservations (stay history)
    const pastReservations = await ReservationModel.find({
      guest: guest._id, // Use guest._id
      status: "checked out",
    })
      .populate({
        path: "items.roomType",
        select: "name description",
      })
      .populate({
        path: "items.rooms.room",
        select: "roomNumber floor",
      })
      .sort({ checkOutDate: -1 })
      .limit(10) // Limit for performance
      .lean();

    // Get bills and transactions for each past reservation
    const stayHistory = await Promise.all(
      pastReservations.map(async (reservation) => {
        const bill = await BillModel.findOne({
          reservationId: reservation._id,
        })
          .populate("billItems")
          .lean();

        const invoice = await InvoiceModel.findOne({
          reservation: reservation._id,
        }).lean();

        const transactions = await TransactionModel.find({
          reservation: reservation._id,
          guest: guest._id,
        }).lean();

        const totalSpent = transactions.reduce(
          (sum, t) => sum + t.amountInCFA,
          0
        );

        const nights = Math.ceil(
          (new Date(String(reservation.checkOutDate)).getTime() -
            new Date(String(reservation.checkInDate)).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          reservation,
          bill,
          invoice,
          totalSpent,
          nights,
        };
      })
    );

    // 5. Get upcoming reservations
    const upcomingReservations = await ReservationModel.find({
      guest: guest._id, // Use guest._id
      status: { $in: ["pending", "confirmed"] },
      checkInDate: { $gte: new Date() }, // Only future reservations
    }).sort({ checkInDate: 1 });

    // 6. Calculate lifetime stats
    const lifetimeStats = {
      totalStays: pastReservations.length,
      totalNightsStayed: stayHistory.reduce(
        (sum, stay) => sum + stay.nights,
        0
      ),
      totalLifetimeSpending: stayHistory.reduce(
        (sum, stay) => sum + stay.totalSpent,
        0
      ),
      firstStayDate: pastReservations.length
        ? pastReservations[pastReservations.length - 1].checkInDate
        : null,
      mostRecentStay: pastReservations.length
        ? pastReservations[0].checkOutDate
        : null,
    };

    // 7. Send comprehensive response
    appResponder(
      StatusCodes.OK,
      {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          userType: user.userType,
        },
        guest: {
          _id: guest._id,
          // Add other guest fields as needed
          languagePreference: guest.preferedLanguage,
          currencyPreference: guest.preferedCurrency,
          guestType: guest.guestType,
          // etc.
        },
        currentStay,
        stayHistory,
        upcomingReservations,
        lifetimeStats,
      },
      res
    );
  }
);

export const getReservationKPIs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    // ── Period boundaries ──────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // ── Parallel queries ───────────────────────────────────────────────────
    const [
      // Checked in — current and previous 30-day window
      checkedInCurrent,
      checkedInPrevious,

      // Checked out — current and previous 7-day window
      checkedOutCurrent,
      checkedOutPrevious,

      // Total reservations — current and previous 30-day window
      totalCurrent,
      totalPrevious,

      // For check-in rate: all time totals
      allTimeCheckedIn,
      allTimeTotal,
    ] = await Promise.all([
      ReservationModel.countDocuments({
        status: "checked in",
        createdAt: { $gte: thirtyDaysAgo },
      }),
      ReservationModel.countDocuments({
        status: "checked in",
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),

      ReservationModel.countDocuments({
        status: "checked out",
        createdAt: { $gte: sevenDaysAgo },
      }),
      ReservationModel.countDocuments({
        status: "checked out",
        createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
      }),

      ReservationModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
      ReservationModel.countDocuments({
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),

      ReservationModel.countDocuments({ status: "checked in" }),
      ReservationModel.countDocuments(),
    ]);

    // ── Percentage change helper ───────────────────────────────────────────
    const pctChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // ── Check-in rate: checked in as % of all reservations ────────────────
    const percentCheckedInLogs =
      allTimeTotal === 0
        ? 0
        : Math.round((allTimeCheckedIn / allTimeTotal) * 100);

    appResponder(
      StatusCodes.OK,
      {
        checkedInCount: checkedInCurrent,
        checkedInPercentage: pctChange(checkedInCurrent, checkedInPrevious),
        checkedOutCount: checkedOutCurrent,
        checkedOutPercentage: pctChange(checkedOutCurrent, checkedOutPrevious),
        totalReservationsCount: totalCurrent,
        totalReservationsPercentage: pctChange(totalCurrent, totalPrevious),
        percentCheckedInLogs,
      },
      res
    );
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
  updatingGuestRooms,
  reservationCalendar,
  searchReservations,
  getCheckedInReservationsByEmail,
  getGuestReservationPortal,
  getReservationKPIs,
};
