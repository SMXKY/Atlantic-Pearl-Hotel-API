import mongoose, { Document, Schema } from "mongoose";
import { ReservationModel, IReservation } from "./Reservation.model";

// Define the interface
export interface IReservationSnapshot extends Document {
  reservation: mongoose.Types.ObjectId | IReservation;
  operation: "before_rooms_update" | "after_rooms_update";
  state: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReservationSnapshotSchema = new Schema<IReservationSnapshot>(
  {
    reservation: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          return (await ReservationModel.exists({ _id: id })) !== null;
        },
        message: "Invalid reservation Id.",
      },
    },
    operation: {
      type: String,
      enum: ["before_rooms_update", "after_rooms_update"],
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const ReservationSnapshotModel = mongoose.model<IReservationSnapshot>(
  "reservation_snapshot",
  ReservationSnapshotSchema
);
