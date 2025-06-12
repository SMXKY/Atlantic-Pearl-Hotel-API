import { Schema, model, Types, Document, models } from "mongoose";
import * as validator from "validator";
import { RoomTypeModel } from "./RoomType.model";
import { RateModel } from "./Rate.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ReservationModel } from "./Reservation.model";
const { v4: uuidv4 } = require("uuid");
import { initiatePay, InitiatePayData } from "../external-apis/fapshi.api";
import * as mongoose from "mongoose";
import { RoomModel } from "./Room.model";

interface IRoomEntry {
  room: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
}

// Line item interface
interface IInvoiceLine {
  roomType: mongoose.Types.ObjectId;
  rate: mongoose.Types.ObjectId;
  rooms: IRoomEntry[];
  quantity?: number;
}

// Invoice interface
interface IInvoice extends Document {
  reservation: Types.ObjectId;
  issuedAt: Date;
  lineItems: IInvoiceLine[];
  netAmount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  paymentLink: string;
  invoiceNumber: string;
  dueDate: Date;
  discount: Types.ObjectId;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    reservation: {
      type: Schema.Types.ObjectId,
      ref: "reservations",
      required: true,
    },
    invoiceNumber: {
      type: String,
    },
    issuedAt: { type: Date, default: Date.now },
    lineItems: [
      new mongoose.Schema(
        {
          roomType: {
            type: mongoose.Types.ObjectId,
            ref: "roomtypes",
            required: [true, "Room type is required for a reservation item"],
            validate: {
              validator: async function (id: mongoose.Types.ObjectId) {
                return (await RoomTypeModel.exists({ _id: id })) !== null;
              },
              message: "Invalid room type Id for this reservation item.",
            },
          },
          rate: {
            type: mongoose.Types.ObjectId,
            ref: "rates",
            required: [true, "Rate is required for each reservation item"],
            validate: {
              validator: async function (id: mongoose.Types.ObjectId) {
                return (await RateModel.exists({ _id: id })) !== null;
              },
              message: "Invalid rate Id in reservation item.",
            },
          },
          rooms: [
            {
              room: {
                type: mongoose.Types.ObjectId,
                ref: "rooms",
                required: [true, "Room is required in reservation entry"],
                validate: {
                  validator: async function (id: mongoose.Types.ObjectId) {
                    return (await RoomModel.exists({ _id: id })) !== null;
                  },
                  message: "Invalid room Id in reservation.",
                },
              },
              checkIn: { type: Date, required: true },
              checkOut: { type: Date, required: true },
            },
          ],
        },
        { _id: false }
      ),
    ],
    netAmount: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, required: true },
    discount: {
      type: Schema.Types.ObjectId,
      ref: "discounts",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    paymentLink: {
      type: String,
      validate: {
        validator: (url: string) => validator.isURL(url),
        message: "Invalid URL format",
      },
      required: [true, "Payment link is required."],
    },
    dueDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

//Generating Invoice number
InvoiceSchema.pre("save", async function (next) {
  if (this.invoiceNumber) return next();

  const MAX_ATTEMPTS = 10;
  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const ref = uuidv4().split("-")[0].toUpperCase();
    const exists = await models.invoices.exists({
      invoiceNumber: ref,
    });
    if (!exists) {
      this.invoiceNumber = ref;
      return next();
    }
  }

  return next(
    new AppError(
      "Failed to generate unique invoice number.",
      StatusCodes.INTERNAL_SERVER_ERROR
    )
  );
});

//Calcualating due price and generating payment link
InvoiceSchema.pre("validate", async function (next) {
  const reservation = await ReservationModel.findById(this.reservation);

  if (!reservation?.checkOutDate) {
    return next(
      new AppError(
        "Error determining reservation check-out date.",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  this.dueDate = reservation?.checkOutDate;
  const priceAndTax = await reservation.calculateTotalPriceAndTax();

  if (!priceAndTax) {
    return next(
      new AppError(
        "Cant find the tax and bill calculation virtual prop on the reservation object",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  this.netAmount = priceAndTax.subTotal;
  this.taxAmount = priceAndTax.totalTaxes;
  this.grandTotal = priceAndTax.totalBill;
  this.amountDue = priceAndTax.totalBill;

  const payData: InitiatePayData = {
    amount: Math.round(priceAndTax.totalBill * 0.3),
    // redirectUrl: "localhost:8000/",
    userId: this.reservation.toString(),
    message: "Atlantic Pearl Hotel and Resort, Reservation Deposit", // Optional message shown to user
  };

  this.paymentLink = (await initiatePay(payData)).link;

  next();
});

/*
To calculate tax I'll need to see if the rates include tax or not 
 */

export const InvoiceModel = model<IInvoice>("invoices", InvoiceSchema);
