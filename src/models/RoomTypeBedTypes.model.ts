import * as mongoose from "mongoose";
import { RoomTypeModel } from "./RoomType.model";
import { BedTypeModel } from "./BedType.model";

const roomTypeBedTypesSchema = new mongoose.Schema(
  {
    roomType: {
      type: mongoose.Types.ObjectId,
      ref: "roomtypes",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await RoomTypeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid room type Id.",
      },
    },
    bedType: {
      type: mongoose.Types.ObjectId,
      ref: "bed_types",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await BedTypeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid bed type Id.",
      },
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

export const RoomTypeBedTypesModel = mongoose.model(
  "room_types_bed_types",
  roomTypeBedTypesSchema
);
