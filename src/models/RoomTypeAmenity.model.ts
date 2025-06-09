import * as mongoose from "mongoose";
import { AmenityModel } from "./Amenity.model";
import { RoomTypeModel } from "./RoomType.model";

const roomTypeAmenitySchema = new mongoose.Schema(
  {
    roomType: {
      type: mongoose.Types.ObjectId,
      ref: "roomtypes",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await RoomTypeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid room Id.",
      },
    },
    amenity: {
      type: mongoose.Types.ObjectId,
      ref: "amenities",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await AmenityModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid amenity Id.",
      },
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const roomTypeAmenities = mongoose.model(
  "roomamenities",
  roomTypeAmenitySchema
);
