import * as mongoose from "mongoose";
import { ReservationModel } from "./Reservation.model";
import { GuestModel } from "./Guest.model";
import { RefundModel } from "./Refund.model";

const transactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: {
        values: ["bill payment", "refund", "reservation payment"],
      },
      required: [true, "transaction type required"],
    },
    reason: {
      type: String,
      required: [true, "Reason for transaction required!!"],
    },
    amountInCFA: {
      type: Number,
      required: [true, "Transaction amount in CFA required."],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "success", "failed"],
      },
    },
    reservation: {
      type: mongoose.Types.ObjectId,
      ref: "reservations",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await ReservationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid reservation Id.",
      },
    },
    guest: {
      type: mongoose.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await GuestModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid guest Id.",
      },
    },
    refunds: {
      type: mongoose.Types.ObjectId,
      ref: "refunds",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await RefundModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid refund Id.",
      },
    },
    // roomType: {
    //   type: mongoose.Types.ObjectId,
    //   ref: "bills",
    //   validate: {
    //     validator: async function (id: mongoose.Types.ObjectId) {
    //       const exists = await RoomTypeModel.exists({ _id: id });
    //       return exists !== null;
    //     },
    //     message: "Invalid bill Id.",
    //   },
    // },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

export const TransactionModel = mongoose.model(
  "transactions",
  transactionSchema
);
