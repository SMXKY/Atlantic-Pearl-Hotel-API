import * as mongoose from "mongoose";
import { RateModel } from "./Rate.model";
import { RoomModel } from "./Room.model";
import { RoomMedia } from "./RoomImages.model";

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface IRoomType {
  name: string;
  description?: string;
  minimumPriceInCFA: number;
  maxNumberOfGuest: number;
  maxNumberOfAdultGuests: number;
  createdAt?: Date;
  updatedAt?: Date;
  isSmokingAllowed?: boolean;
}

// Optional: define Room and RoomMedia types properly
interface IRoom {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: mongoose.Types.ObjectId;
  status: string;
  // ... other fields
}

interface IRoomMedia {
  _id: mongoose.Types.ObjectId;
  roomType: mongoose.Types.ObjectId;
  imageUrl: string;
  // ... other fields
}

export interface IRoomTypeEnriched extends IRoomType {
  numberOfRooms: number;
  images: IRoomMedia[];
  rooms: IRoom[];
}

export interface IRoomTypeDocument extends mongoose.Document, IRoomType {
  mutate(): Promise<IRoomTypeEnriched>;
}

// ----------------------------------------
// Schema
// ----------------------------------------

const roomTypeSchema = new mongoose.Schema<IRoomTypeDocument>(
  {
    name: {
      type: String,
      required: [true, "Room type name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    minimumPriceInCFA: {
      type: Number,
      required: [true, "Minimum price for a room type must be set."],
    },
    maxNumberOfGuest: {
      type: Number,
      required: [true, "Maximum number of guests is required."],
    },
    maxNumberOfAdultGuests: {
      type: Number,
      required: [true, "Maximum number of adult guests is required."],
    },
    isSmokingAllowed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roomTypeSchema.post("save", async function (doc, next) {
  try {
    const existingRate = await RateModel.findOne({
      roomType: doc._id,
      mealPlan: "RO",
    });

    if (!existingRate) {
      await RateModel.create({
        code: `DEF-${doc.name.toUpperCase().replace(/\s+/g, "-")}-RO`,
        name: `${doc.name} - Room Only`,
        description: `Default room only rate for ${doc.name}`,
        totalPriceInCFA: doc.minimumPriceInCFA,
        taxIncluded: false,
        mealPlan: "RO",
        occupancy: 1,
        validFrom: new Date(),
        validTo: new Date(
          new Date().setFullYear(new Date().getFullYear() + 10)
        ),
        roomType: doc._id,
        cancelationPolicy: null,
      });
    }

    next();
  } catch (error) {
    console.error("Error creating default rate:", error);
    next();
  }
});

roomTypeSchema.methods.mutate = async function () {
  const obj = this.toObject();

  const rooms = await RoomModel.find({ type: this._id, status: "free" });
  const allRooms = await RoomModel.find({ type: this._id });
  const images = (await RoomMedia.find({ roomType: this._id }))[0];
  const rates = await RateModel.find({ roomType: this._id });

  return {
    ...obj,
    numberOfFreeRooms: rooms.length,
    numberOfRooms: allRooms.length,
    image: images,
    rooms,
    rates,
  };
};

roomTypeSchema.virtual("rooms", {
  ref: "rooms", // The model to use
  localField: "_id", // Find rooms where 'type' == this _id
  foreignField: "type", // 'type' field in Room refers to RoomType _id
  justOne: false, // Return array
});

roomTypeSchema.virtual("rates", {
  ref: "rates", // The model to use
  localField: "_id", // Find rooms where 'type' == this _id
  foreignField: "roomType", // 'type' field in Room refers to RoomType _id
  justOne: false, // Return array
});

roomTypeSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await RoomModel.deleteMany({ type: doc._id });
  }
});

import type { Query } from "mongoose";

roomTypeSchema.pre<Query<any, any>>(/^find/, function (next) {
  this.populate("rates");
  next();
});

export const RoomTypeModel = mongoose.model<IRoomTypeDocument>(
  "roomtypes",
  roomTypeSchema
);
