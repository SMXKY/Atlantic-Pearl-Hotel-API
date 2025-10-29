import mongoose, { Schema, Document, Model } from "mongoose";
import { ReservationModel } from "./Reservation.model";
import { GuestModel } from "./Guest.model";
import { RefundModel } from "./Refund.model";
import { StationModel } from "./Station.model";
import { RoomModel } from "./Room.model";

export interface ITransaction extends Document {
  transactionType:
    | "bill payment"
    | "refund"
    | "reservation payment"
    | "Bill and Invoice payment"
    | "restuarant order"
    | "parking reservation";
  reason: string;
  amountInCFA: number;
  status: "pending" | "success" | "failed";
  reservation?: mongoose.Types.ObjectId;
  guest?: mongoose.Types.ObjectId;
  refunds?: mongoose.Types.ObjectId;
  station: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  transactionDate: string;
  transactionTime: string;
  trancode: "401" | "501" | "601";
  reference: number;
  referenceDoc: {
    id: string;
    collection: string;
  };
  isCharge: boolean;
}

export const transactionCodes = {
  internetCharge: 401,
  payMovieTvCharge: 501,
  foodCharge: 601,
};

const transactionSchema = new Schema<ITransaction>(
  {
    transactionType: {
      type: String,
      enum: [
        "bill payment",
        "refund",
        "reservation payment",
        "Bill and Invoice payment",
        "restuarant order",
        "parking reservation",
      ],
      required: [true, "Transaction type is required."],
    },
    reason: {
      type: String,
      required: [true, "Reason for transaction is required."],
      minlength: [3, "Reason must be at least 3 characters long."],
    },
    amountInCFA: {
      type: Number,
      required: [true, "Transaction amount in CFA is required."],
      min: [1, "Transaction amount must be greater than 0."],
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    reservation: {
      type: mongoose.Types.ObjectId,
      ref: "reservations",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          if (!id) return true;
          return (await ReservationModel.exists({ _id: id })) !== null;
        },
        message: "Invalid reservation Id.",
      },
    },
    guest: {
      type: mongoose.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          if (!id) return true;
          return (await GuestModel.exists({ _id: id })) !== null;
        },
        message: "Invalid guest Id.",
      },
    },
    refunds: {
      type: mongoose.Types.ObjectId,
      ref: "refunds",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          if (!id) return true;
          return (await RefundModel.exists({ _id: id })) !== null;
        },
        message: "Invalid refund Id.",
      },
    },
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "stations",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          return (await StationModel.exists({ _id: id })) !== null;
        },
        message: "Invalid station Id.",
      },
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "rooms",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          return (await RoomModel.exists({ _id: id })) !== null;
        },
        message: "Invalid room Id.",
      },
    },
    transactionDate: {
      type: String,
      validate: {
        validator: (val: string) => /^\d{8}$/.test(val),
        message: "Transaction date must be in DDMMYYYY format.",
      },
    },
    transactionTime: {
      type: String,
      validate: {
        validator: (val: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val),
        message: "Transaction time must be in HH:mm format.",
      },
    },
    trancode: {
      type: String,
      enum: ["401", "501", "601"],
    },
    reference: {
      type: Number,
      unique: true,
      index: true,
      immutable: true,
    },
    referenceDoc: {
      id: {
        type: String,
      },
      collection: {
        type: String,
      },
    },
    //differentiates charge transactions from regular bell settlements
    isCharge: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const CounterModel =
  mongoose.models.TransactionCounter ||
  mongoose.model("TransactionCounter", counterSchema);

transactionSchema.pre<ITransaction>("save", async function (next) {
  if (this.isNew) {
    const updatedCounter = await CounterModel.findByIdAndUpdate(
      { _id: "transactionRef" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.reference = updatedCounter.seq;
  }
  next();
});

export const TransactionModel: Model<ITransaction> =
  mongoose.model<ITransaction>("transactions", transactionSchema);
