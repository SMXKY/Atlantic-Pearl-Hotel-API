import mongoose, { Schema, Document, Model } from "mongoose";
import { IBillItem } from "./BillItem.model";
import { ReservationModel } from "./Reservation.model";
import { UserModel } from "./User.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { GuestModel } from "./Guest.model";

export interface IBill extends Document {
  guestId: mongoose.Types.ObjectId;
  reservationId?: mongoose.Types.ObjectId;
  status: "pending" | "paid" | "cancelled";
  issuedAt: Date;
  paidAt?: Date;
  notes?: string;
  billItems: IBillItem[];
}

const billSchema = new Schema<IBill>(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          const exists = await mongoose.model("guests").exists({ _id: id });
          return exists !== null;
        },
        message: "Guest not found",
      },
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "reservations",
      required: false,
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          const exists = await mongoose
            .model("reservations")
            .exists({ _id: id });
          return exists !== null;
        },
        message: "Guest not found",
      },
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: Date,
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "bills",
  }
);

billSchema.virtual("billItems", {
  ref: "bill_items",
  localField: "_id",
  foreignField: "billId",
});

billSchema.pre("save", async function (next) {
  try {
    const reservation = await ReservationModel.findById(this.reservationId);

    if (!reservation) {
      return next(
        new AppError(
          "The reservation tied to this bill does not exist in the database",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Only allow billing for checked-in reservations
    if (reservation.status !== "checked in") {
      return next(
        new AppError(
          "You may only bill a guest's reservation that has been checked in",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const guest = await GuestModel.findById(reservation.guest);
    if (!reservation.guest || !guest) {
      return next(
        new AppError(
          "Reservation does not have a corresponding guest",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    this.guestId = new mongoose.Types.ObjectId(
      guest._id as mongoose.Types.ObjectId
    );

    console.log("auto assigned guest id to bill");

    next();
  } catch (err: any) {
    next(err);
  }
});

export const BillModel: Model<IBill> = mongoose.model<IBill>(
  "bills",
  billSchema
);
