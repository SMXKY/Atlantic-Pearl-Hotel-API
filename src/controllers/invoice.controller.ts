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
import { initiatePay, InitiatePayData } from "../external-apis/fapshi.api";
import { TransactionModel } from "../models/Transaction.model";
import {
  EmailData,
  renderInvoiceEmail,
} from "../util/generateInvoiceAndBillSettlementEmail.template";
import { sendEmail } from "../util/sendEmail.util";

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

    const payData: InitiatePayData = {
      amount: totalDebtInCFA,
      redirectUrl,
      userId: reservation._id.toString(),
      message: "Atlantic Pearl Hotel and Resort - Bill & Invoice Settlement",
    };

    const paymentLink = await initiatePay(payData);
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
      paymentLink,
      issueDate: new Date().toISOString(),
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
  async (req: Request, res: Response, next: NextFunction) => {}
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
};
