import * as mongoose from "mongoose";
import { GuestModel } from "./Guest.model";
import { TransactionModel } from "./Transaction.model";

const recieptSchema = new mongoose.Schema(
  {
    amountInCFA: {
      type: Number,
    },
    issued: {
      type: Boolean,
    },
    method: {
      type: String,
      enum: {
        values: ["Email", "Onsite"],
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
        message: "Invalid room guest Id.",
      },
    },
    transaction: {
      type: mongoose.Types.ObjectId,
      ref: "transactions",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await TransactionModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid room type Id.",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const RecieptModel = mongoose.model("reciepts", recieptSchema);
