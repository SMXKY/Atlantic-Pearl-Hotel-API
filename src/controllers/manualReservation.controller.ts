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

//manual reservation the front end has to send status:confirmed,
// Create Manual Reservation
const createManualReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.status = undefined;

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
      return next(err);
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

    appResponder(
      StatusCodes.OK,
      {
        message: "Payment recorded successfully",
        invoice: updatedInvoice,
      },
      res
    );
  }
);

export const manualReservationControllers = {
  createManualReservation,
  payForReservation,
};
