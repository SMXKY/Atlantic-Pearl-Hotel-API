import * as mongoose from "mongoose";
import dayjs from "dayjs";
import { BuildingModel } from "./Building.model";
import { RoomTypeModel } from "./RoomType.model";
import { GuestModel } from "./Guest.model";
import { ReservationModel } from "./Reservation.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";

interface ILockUntil {
  until: Date | null;
  reservation: mongoose.Types.ObjectId | null;
}

export interface IRoom extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  number: string;
  floorNumber: number;
  status:
    | "occupied"
    | "free"
    | "reserved"
    | "unavailable"
    | "in maintanace"
    | "renovation";
  state: "clean" | "dirty";
  basePriceInCFA: number;
  veiwType?: string;
  isActive?: boolean;
  description: string;
  sizeInSquareMeters?: number;
  accessType: "key" | "code" | "key-card";
  building?: mongoose.Types.ObjectId;
  type?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  lock?: ILockUntil;
  imageUrl: string;
}

const roomSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      required: [true, "Room number is required."],
    },
    floorNumber: {
      type: Number,
      required: [true, "Room floor number is required."],
    },
    status: {
      type: String,
      required: [true, "Room status is required."],
      enum: {
        values: [
          "occupied",
          "free",
          "reserved",
          "unavailable",
          "in maintanace",
          "renovation",
        ],
        message: `Room status are limited to: ${[
          "occupied",
          "free",
          "reserved",
          "unavailable",
          "in maintanace",
          "renovation",
        ]}`,
      },
      default: "free",
    },
    state: {
      type: String,
      enum: {
        values: ["clean", "dirty"],
        message: "Room states are limited to clean or dirty",
      },
      default: "clean",
    },
    veiwType: {
      type: String,
      default: "Ocean view",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      required: [true, "Room description is required"],
    },
    sizeInSquareMeters: {
      type: Number,
      select: false,
    },
    accessType: {
      type: String,
      enum: {
        values: ["key", "code", "key-card"],
      },
      default: "key",
      required: [true, "Room access type is required"],
    },
    building: {
      type: mongoose.Types.ObjectId,
      ref: "discounts",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await BuildingModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid building Id.",
      },
    },
    type: {
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
    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await GuestModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid guest Id.",
      },
    },
    lock: {
      until: {
        type: Date,
        default: null,
        required: false,
      },
      reservation: {
        type: mongoose.Types.ObjectId,
        ref: "reservations",
        validate: {
          validator: async function (id: mongoose.Types.ObjectId) {
            const exists = await ReservationModel.exists({ _id: id });
            return exists !== null;
          },
          message: "Invalid reservation Id for room lock.",
        },
        required: false,
      },
    },
    imageUrl: {
      type: String,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.virtual("size").get(function () {
  return `${this.sizeInSquareMeters} sqmtrs`;
});

// Keep pre and post hooks for populate, filtering, and transformations
roomSchema.pre(/^find/, function (this: mongoose.Query<any, IRoom>, next) {
  this.where({
    isActive: { $ne: false },
  });

  this.populate({
    path: "type",
    model: "roomtypes",
  });

  next();
});

const applySupportDocTransformation = (docOrDocs: any) => {
  const baseUrl = process.env.FTP_BASE_URL;
  if (!baseUrl) {
    throw new AppError(
      "No ftp base url in config file.",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const transform = (doc: any) => {
    if (doc && doc.imageUrl && !doc.imageUrl.startsWith("https://")) {
      doc.imageUrl = baseUrl + doc.imageUrl;
    }
  };

  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(transform);
  } else {
    transform(docOrDocs);
  }
};

roomSchema.post("find", function (docs) {
  applySupportDocTransformation(docs);
});

roomSchema.post("findOne", function (doc) {
  applySupportDocTransformation(doc);
});

roomSchema.post("findOneAndUpdate", function (doc) {
  applySupportDocTransformation(doc);
});

roomSchema.post("findOneAndDelete", function (doc) {
  applySupportDocTransformation(doc);
});

import { Schema, Document, Query } from "mongoose";

roomSchema.pre<Query<IRoom[], IRoom>>(/^find/, function (next) {
  this.populate({
    path: "type",
    populate: { path: "rates" },
  });
  next();
});

export const RoomModel = mongoose.model<IRoom>("rooms", roomSchema);
