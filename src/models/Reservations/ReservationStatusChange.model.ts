import * as mongoose from "mongoose";
import { ReservationModel } from "./Reservation.model";

const reservationStatusChangeSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Types.ObjectId,
      ref: "reservations",
      required: [true, "Reservation ID is required."],
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          return await ReservationModel.exists({ _id: id });
        },
        message: "Invalid reservation ID.",
      },
    },
    statusChange: {
      type: String,
      enum: {
        values: [
          "checked in",
          "no showed",
          "canceled",
          "pending",
          "expired",
          "confirmed",
          "checked out",
        ],
        message: "Invalid status change value.",
      },
      required: [true, "Status change value is required."],
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const ReservationStatusChangeModel = mongoose.model(
  "reservation-status-changes",
  reservationStatusChangeSchema
);
