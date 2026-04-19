import mongoose, { Schema, Document, Model } from "mongoose";

export interface IParkingSectionType extends Document {
  name: string;
  description?: string;
  hourlyRateInCFA: number;
}

const parkingSectionTypeSchema: Schema<IParkingSectionType> = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    hourlyRateInCFA: {
      type: Number,
      required: [true, "Parking Section Hourly rate in CFA is required."],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const ParkingSectionTypeModel: Model<IParkingSectionType> =
  mongoose.model<IParkingSectionType>(
    "parking_sections_types",
    parkingSectionTypeSchema
  );
