import * as mongoose from "mongoose";
import * as validator from "validator";
import { RoomModel } from "./Room.model";
import { RoomTypeModel } from "./RoomType.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";

const roomTypeMediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      // validate: {
      //   validator: function (url: string) {
      //     return validator.isURL(url);
      //   },
      //   message: "Invalid url format",
      // },
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

const applySupportDocTransformation = (docOrDocs: any) => {
  const baseUrl = process.env.FTP_BASE_URL;
  if (!baseUrl) {
    throw new AppError(
      "No ftp base url in config file.",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const transform = (doc: any) => {
    if (doc && doc.url && !doc.url.startsWith("https://")) {
      doc.url = baseUrl + doc.url;
    }
  };

  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(transform);
  } else {
    transform(docOrDocs);
  }
};

roomTypeMediaSchema.post("find", function (docs) {
  applySupportDocTransformation(docs);
});

roomTypeMediaSchema.post("findOne", function (doc) {
  applySupportDocTransformation(doc);
});

roomTypeMediaSchema.post("findOneAndUpdate", function (doc) {
  applySupportDocTransformation(doc);
});

roomTypeMediaSchema.post("findOneAndDelete", function (doc) {
  applySupportDocTransformation(doc);
});

export const RoomMedia = mongoose.model("room_type_media", roomTypeMediaSchema);
