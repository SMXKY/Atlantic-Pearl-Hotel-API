import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";
import { GuestModel } from "../models/Guest.model";
import { ReservationModel } from "../models/Reservation.model";
import { InvoiceModel } from "../models/Invoice.model";
import {
  generateInvoiceEmailTemplateData,
  renderInvoiceHTMLFromTemplate,
} from "../util/generateInvoiceEmailTemplate.util";
import { sendEmail } from "../util/sendEmail.util";
import { appResponder } from "../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { TransactionModel } from "../models/Transaction.model";
import { RecieptModel } from "../models/Reciept.model";

//manual reservation the front end has to send status:confirmed,
// Create Manual Reservation
const createManualReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.status = undefined;

    if (!res.locals.user) {
      return next(
        new AppError(
          "User is not being monitored please check protect controller",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    req.body.createdBy = res.locals.user._id;

    let email = req.body.guestEmail;
    req.body.depositInCFA = 0;
    req.body.bookingSource = "onsite";
    req.body.paymentMethod = "Cash Payment";

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

      if (email) {
        await sendEmail(email, "RESERVATION INVOICE", "", html);
      }

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
  }
);

//send data in the body:
/*
{
invoiceId: "",
amount: "",
}
 */
// Pay For Reservation
const payForReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount, invoiceId } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return next(
        new AppError(
          "Invalid or missing payment amount",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!invoiceId) {
      return next(
        new AppError("Invoice ID is required", StatusCodes.BAD_REQUEST)
      );
    }

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      return next(new AppError("No such invoice found", StatusCodes.NOT_FOUND));
    }

    // Ensure these fields are initialized
    invoice.amountPaid = invoice.amountPaid || 0;
    invoice.amountDue = invoice.amountDue ?? invoice.grandTotal;

    invoice.amountPaid += amount;
    invoice.amountDue = invoice.grandTotal - invoice.amountPaid;

    invoice.paymentStatus =
      invoice.amountPaid >= invoice.grandTotal ? "paid" : "partial";

    const updatedInvoice = await invoice.save();

    const transaction = await TransactionModel.create({
      transactionType: "bill payment",
      reason: "Payment for reservation",
      amountInCFA: amount,
      status: "success",
      reservation: invoice.reservation,
    });

    const receipt = await RecieptModel.create({
      amountInCFA: amount,
      issued: true,
      method: "Onsite",
      // guest: "6669f1d34f1f8d5d8e3d91a1",
      transaction: transaction._id,
    });

    appResponder(
      StatusCodes.OK,
      {
        message: "Payment recorded successfully",
        invoice: updatedInvoice,
        receipt,
      },
      res
    );
  }
);

export const manualReservationControllers = {
  createManualReservation,
  payForReservation,
};
