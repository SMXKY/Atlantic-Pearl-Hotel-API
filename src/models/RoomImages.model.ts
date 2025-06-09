import * as mongoose from "mongoose";
import * as validator from "validator";
import { RoomModel } from "./Room.model";
import { RoomTypeModel } from "./RoomType.model";

const roomTypeMediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      validate: {
        validator: function (url: string) {
          return validator.isURL(url);
        },
        message: "Invalid url format",
      },
      required: [true, "Room media url is required."],
    },
    mediaType: {
      type: String,
      enum: {
        values: ["Image", "Video"],
        message: "media types allowed can only be Image or Video",
      },
      required: true,
    },
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
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const RoomMedia = mongoose.model("room_type_media", roomTypeMediaSchema);
