import mongoose, { Schema, Document, Model } from "mongoose";

export interface IParkingSectionType extends Document {
  name: string;
  description?: string;
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
