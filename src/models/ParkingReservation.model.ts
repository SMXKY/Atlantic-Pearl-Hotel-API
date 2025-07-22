import mongoose, { Schema, Document, Model } from "mongoose";
import { ParkingSpotModel } from "./ParkingSpot.model";
import { GuestModel } from "./Guest.model";

export interface IParkingReservation extends Document {
  guest: mongoose.Types.ObjectId;
  spot: mongoose.Types.ObjectId;
  reservedFrom: Date;
  reservedTo: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: "reserved" | "active" | "completed" | "cancelled" | "no_show";
}

const parkingReservationSchema: Schema<IParkingReservation> = new Schema(
  {
    guest: {
      type: Schema.Types.ObjectId,
      ref: "guests",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await GuestModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Guest ID not found in the database.",
      },
    },
    spot: {
      type: Schema.Types.ObjectId,
      ref: "parking_spots",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = ParkingSpotModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Parking Spot ID not found in the database.",
      },
    },
    reservedFrom: {
      type: Date,
      required: true,
    },
    reservedTo: {
      type: Date,
      required: true,
      validate: {
        validator: function (value: Date) {
          return this.reservedFrom < value;
        },
        message: "reservedTo must be after reservedFrom.",
      },
    },
    checkInTime: Date,
    checkOutTime: Date,
    status: {
      type: String,
      enum: ["reserved", "active", "completed", "cancelled", "no_show"],
      default: "reserved",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const ParkingReservationModel: Model<IParkingReservation> =
  mongoose.model<IParkingReservation>(
    "parking_reservations",
    parkingReservationSchema
  );
