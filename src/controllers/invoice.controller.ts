import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { InvoiceModel } from "../models/Invoice.model";
import { ReservationModel } from "../models/Reservation.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../util/appResponder.util";
import { BillModel } from "../models/Bill.model";
import { IBillItem } from "../models/BillItem.model";
import {
  expirePay,
  initiatePay,
  InitiatePayData,
} from "../external-apis/fapshi.api";
import { TransactionModel } from "../models/Transaction.model";
import {
  EmailData,
  renderInvoiceEmail,
} from "../util/generateInvoiceAndBillSettlementEmail.template";
import { sendEmail } from "../util/sendEmail.util";
import { RecieptModel } from "../models/Reciept.model";
import path from "path";
import fs from "fs";

const CRUDInvoice: CRUD = new CRUD(InvoiceModel);

const createInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.create(req.body, res, req);
  }
);

const readOneInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.readOne(req.params.id, res, [], req);
  }
);

const readAllInvoices = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.readAll(res, req, 1, 100, []);
  }
);

const updateInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.update(req.params.id, res, req);
  }
);

const deleteInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.delete(req.params.id, res, req);
  }
);

const settleBillAndInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reservationId, bookingReference, method } = req.body;

    if (!reservationId && !bookingReference) {
      return next(
        new AppError(
          "Reservation ID or booking reference is required to settle bill or invoice.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findById(reservationId);

    if (!reservation) {
      return next(
        new AppError(
          "No reservation found with the provided ID or reference.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const bill = await BillModel.findOne({
      reservationId: reservation._id,
    }).populate("billItems");

    const invoice = await InvoiceModel.findOne({
      reservation: reservation._id,
    });

    if (!invoice) {
      return next(
        new AppError(
          "No invoice found for the reservation. This is a critical error; developer intervention required.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    if (
      (bill && invoice.paymentStatus === "paid" && bill.status === "paid") ||
      (!bill && invoice.paymentStatus === "paid")
    ) {
      return next(
        new AppError(
          "Reservation payment link has already been sent or bill and invoice have already been paid.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    let totalDebtInCFA = invoice.amountDue;
    let totalBill = 0;

    if (bill) {
      for (const item of bill.billItems) {
        totalDebtInCFA += item.amount;
        totalBill += item.amount;
      }
    }

    // Handle CASH PAYMENT
    if (method === "cash") {
      invoice.amountPaid += invoice.amountDue;
      invoice.amountDue = 0;
      invoice.paymentStatus = "paid";
      await invoice.save();

      if (bill) {
        bill.status = "paid";
        bill.paidAt = new Date();
        await bill.save();
      }

      return appResponder(
        StatusCodes.OK,
        {
          message: `Reservation invoice and bill totaling ${totalDebtInCFA.toLocaleString()} XAF have been marked as settled. Guest may proceed to checkout.`,
        },
        res
      );
    }

    // HANDLE PAYMENT LINK
    const envBaseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.PROD_BASE_URL
        : process.env.BASE_URL;

    if (!envBaseUrl) {
      return next(
        new AppError(
          "Base URL is not set in environment variables.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    // console.log(reservation);
    // return next(new AppError("test here", 404));
    const paymentDataPayload = {
      amount: totalDebtInCFA,
      reservationId: reservation._id.toString(),
    };

    const encodedPayload = encodeURIComponent(
      JSON.stringify(paymentDataPayload)
    );

    const redirectUrl = `${envBaseUrl}/api/v1/invoices/settlement-redirect?data=${encodedPayload}`;

    console.log(totalDebtInCFA);

    const payData: InitiatePayData = {
      amount: totalDebtInCFA,
      redirectUrl,
      userId: reservation._id.toString(),
      message: "Atlantic Pearl Hotel and Resort - Bill & Invoice Settlement",
    };

    const paymentLink = await initiatePay(payData);
    // console.log(paymentLink);
    // return;
    // reservation.settlementUrl = paymentLink.link;
    // await reservation.save();
    await ReservationModel.findByIdAndUpdate(
      reservation._id,
      {
        settlementUrl: paymentLink.link,
      },
      { runValidators: true, new: true }
    );

    // Prepare email data
    const emailData: EmailData = {
      guestName: reservation.guestName,
      invoice: {
        ref: invoice.invoiceNumber,
        lineItems: invoice.lineItems,
        total: invoice.grandTotal,
        amountPaid: invoice.amountPaid,
        amountDue: invoice.amountDue,
      },
      bill: {
        ref: bill ? String(bill._id) : undefined,
        items: bill?.billItems ?? [],
        total: totalBill,
      },
      total: totalDebtInCFA,
      paymentLink: paymentLink.link,
      issueDate: new Date().toISOString(),
      redirect: redirectUrl,
    };

    if (!reservation.guestEmail) {
      return next(
        new AppError(
          "Reservation guest email is missing. Cannot send payment email.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const emailHTML = await renderInvoiceEmail(emailData);

    await sendEmail(
      reservation.guestEmail,
      "BILL and RESERVATION SETTLEMENT - ATLANTIC PEARL HOTEL and RESORT",
      "",
      emailHTML
    );

    return appResponder(
      StatusCodes.OK,
      {
        message:
          "Email sent to guest with payment link. User can pay via mobile money or card.",
        paymentLink,
      },
      res
    );
  }
);

const settleBillAndInvoiceRedirect = catchAsync(
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
        transactionType: "Bill and Invoice payment",
        reason: "Settlement of Reservation Invoice and Bill Payments.",
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
        transactionType: "Bill and Invoice payment",
        reason: "Settlement of Reservation Invoice and Bill Payments.",
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

      await invoice.save();

      // const expirePaymentLink = await expirePay(reservation.settlementUrl);

      // if (expirePaymentLink.status !== "EXPIRED") {
      //   console.log(expirePaymentLink);
      //   console.log("Transaction Id", reservation.settlementUrl);
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

      console.log("ldjfal");

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

const showBillAndInvoiceSettleMentData = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reservationId, bookingReference } = req.body;

    if (!reservationId && !bookingReference) {
      return next(
        new AppError(
          "Either reservationId or bookingReference is required to fetch billing and invoice details.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findOne({
      $or: [{ _id: reservationId }, { bookingReference }],
    });

    if (!reservation) {
      return next(
        new AppError(
          "No reservation found with the provided ID or booking reference.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const bill = await BillModel.findOne({
      reservationId: reservation._id,
    }).populate("billItems");

    const invoice = await InvoiceModel.findOne({
      reservation: reservation._id,
    });

    if (!invoice) {
      return next(
        new AppError(
          "Invoice not found for this reservation. FATAL SERVER ERROR — have a developer fix this ASAP.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    let totalDebtInCFA = 0;
    let totalBill = 0;

    if (bill && bill.billItems?.length) {
      bill.billItems.forEach((item: any) => {
        totalDebtInCFA += item.amount;
        totalBill += item.amount;
      });
    }

    totalDebtInCFA += invoice.amountDue;

    appResponder(
      StatusCodes.OK,
      {
        invoice: {
          ref: invoice.invoiceNumber,
          lineItems: invoice.lineItems,
          total: invoice.grandTotal,
          amountPaid: invoice.amountPaid,
          amountDue: invoice.amountDue,
        },
        bill: {
          ref: bill?._id ?? null,
          items: bill?.billItems ?? [],
          total: totalBill,
        },
        total: totalDebtInCFA,
      },
      res
    );
  }
);

export const invoiceControllers = {
  createInvoice,
  readOneInvoice,
  readAllInvoices,
  updateInvoice,
  deleteInvoice,
  settleBillAndInvoice,
  showBillAndInvoiceSettleMentData,
  settleBillAndInvoiceRedirect,
};
