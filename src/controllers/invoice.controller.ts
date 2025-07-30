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
    /*
    I have to get the reservation id or the refrence code
    I need to know if the reservation is by credit card, momo, or cash
    find the invoice and bill associated with the reservation ( bill may not exist)
    if it by cash, update the bill and invoice to paid
    send a response.
    else:
    calcluate the bill total and the invoice amout due
    create a payment link with fapshi 
    email the user the payment link, and also send to the front end
    //only sette the buill and invoice on fapshi redirect and expirte the payment link
     */

    const { reservationId, bookingReference, method } = req.body;

    if (!reservationId || !bookingReference) {
      return next(
        new AppError(
          "Reservation Id or booking reference is required to settle bill or reservation invoice",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findOne({
      $or: [{ _id: reservationId }, { bookingReference: bookingReference }],
    });

    if (!reservation) {
      return next(
        new AppError(
          "No such reservation booking reference or Id",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const bill = await BillModel.findOne({
      reservationId: reservationId,
    }).populate("billItems");

    const invoice = await InvoiceModel.findOne({ reservation: reservationId });

    if (!invoice) {
      return next(
        new AppError(
          "No invoice associated with the reservation. FATAL SERVER ERORR have the DEV FIX THIS ASAP",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    let totalDebtInCFA = 0;

    if (bill) {
      bill.billItems.forEach((item) => {
        totalDebtInCFA += item.amount;
      });
    }

    totalDebtInCFA += invoice.amountDue;

    if (method === "cash") {
      invoice.amountPaid += invoice.amountDue;
      invoice.amountDue = 0;
      invoice.paymentStatus = "paid";
      await invoice.save();

      if (bill) {
        bill.status = "paid";
        bill.paidAt = new Date(Date.now());
        await bill.save();
      }

      return appResponder(
        StatusCodes.OK,
        {
          message: `Reservation  with amount ${totalDebtInCFA.toLocaleString()}XAF Invoice and Or Bill have been settled, guest may now checkout, assuming the money has been colleted by the front the des the server will save this transaction as done`,
        },
        res
      );
    }

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.PROD_BASE_URL
        : process.env.BASE_URL;

    console.log(baseUrl);

    if (
      !process.env.BASE_URL ||
      !process.env.NODE_ENV ||
      !process.env.PROD_BASE_URL
    ) {
      return next(
        new AppError(
          "Node Env and Base url missing from enviroment varaibles",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const data = {
      amount: totalDebtInCFA,
      reservationId: String(reservation._id),
    };

    const dataString = encodeURIComponent(JSON.stringify(data));
    const redirectUrl = `${baseUrl}/api/v1/invoices/settlement-redirect?data=${dataString}`;

    const payData: InitiatePayData = {
      amount: reservation.depositInCFA,
      redirectUrl,
      userId: reservation._id.toString(),
      message: "Atlantic Pearl Hotel and Resort, Bill and Invoice settlement", // Optional message shown to user
    };

    const payment = await initiatePay(payData);

    reservation.settlementUrl = payment;

    appResponder(
      StatusCodes.OK,
      {
        message:
          "Email with payment links sent to guest email, proceed to email, click  and click on the payment button to pay with credit card or mobile money",
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

    if (bill && bill.billItems?.length) {
      bill.billItems.forEach((item: any) => {
        totalDebtInCFA += item.amount;
      });
    }

    totalDebtInCFA += invoice.amountDue;

    appResponder(
      StatusCodes.OK,
      {
        invoice: {
          ref: invoice.invoiceNumber,
          lineItems: invoice.lineItems,
        },
        bill: {
          ref: bill?._id ?? null,
          items: bill?.billItems ?? [],
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
