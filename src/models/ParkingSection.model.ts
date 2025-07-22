import mongoose, { Schema, Document, Model } from "mongoose";
import { ParkingSectionTypeModel } from "./ParkingSectionType.model";
import { ParkingSpotModel } from "./ParkingSpot.model";

export interface IParkingSection extends Document {
  name: string;
  type: mongoose.Types.ObjectId;
  description?: string;
  capacity?: number;
  isActive: boolean;
}

const parkingSectionSchema: Schema<IParkingSection> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    type: {
      type: Schema.Types.ObjectId,
      ref: "parking_sections_types",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await ParkingSectionTypeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Parking Section Type Id not found iin the database.",
      },
    },
    description: {
      type: String,
      default: "",
    },
    capacity: {
      type: Number,
      default: 0,
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

parkingSectionSchema.virtual("parkingSpots", {
  ref: "parking_spots",
  localField: "_id",
  foreignField: "section",
});

parkingSectionSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await ParkingSpotModel.deleteMany({ section: doc._id });
  }
});

export const ParkingSectionModel: Model<IParkingSection> =
  mongoose.model<IParkingSection>("parking_sections", parkingSectionSchema);
