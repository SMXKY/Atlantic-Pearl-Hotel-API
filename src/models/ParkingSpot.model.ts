import mongoose, { Schema, Document, Model } from "mongoose";
import { ParkingSectionModel } from "./ParkingSection.model";

export interface IParkingSpot extends Document {
  section: mongoose.Types.ObjectId;
  spotNumber: string;
  type?: string;
  status?:
    | "available"
    | "reserved"
    | "occupied"
    | "maintenance"
    | "disabled"
    | "free";
  isActive: boolean;
}

const parkingSpotSchema: Schema<IParkingSpot> = new Schema(
  {
    section: {
      type: Schema.Types.ObjectId,
      ref: "parking_sections",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await ParkingSectionModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Parking Section Id not found in the database.",
      },
    },
    spotNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      trim: true,
      default: "standard",
    },
    status: {
      type: String,
      enum: [
        "available",
        "reserved",
        "occupied",
        "maintenance",
        "disabled",
        "free",
      ],
      default: "free",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

parkingSpotSchema.index({ section: 1, spotNumber: 1 }, { unique: true });

export const ParkingSpotModel: Model<IParkingSpot> =
  mongoose.model<IParkingSpot>("parking_spots", parkingSpotSchema);
