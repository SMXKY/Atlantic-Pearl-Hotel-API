import * as mongoose from "mongoose";
import { RoomTypeModel } from "./RoomType.model";
import { GuestModel } from "./Guest.model";

// Interface
export interface IRoomTypeReview extends mongoose.Document {
  roomType: mongoose.Types.ObjectId;
  cleanliness: number;
  amenities: number;
  comfort: number;
  location: number;
  wifiConnection: number;
  guest?: mongoose.Types.ObjectId;
  review: string;
  reviewTitle: string;
  createdAt: Date;
  updatedAt: Date;
  finalRating?: {
    rating: number;
    remark: string;
  };
}

// Schema
const roomTypeReviewSchema = new mongoose.Schema<IRoomTypeReview>(
  {
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "roomtypes",
      required: [true, "Room type ID is required."],
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          return (await RoomTypeModel.exists({ _id: id })) !== null;
        },
        message: "Invalid room type ID.",
      },
    },
    cleanliness: {
      type: Number,
      required: [true, "Cleanliness rating is required."],
      min: [1, "Cleanliness must be at least 1."],
      max: [10, "Cleanliness cannot exceed 10."],
    },
    amenities: {
      type: Number,
      required: [true, "Amenities rating is required."],
      min: [1, "Amenities must be at least 1."],
      max: [10, "Amenities cannot exceed 10."],
    },
    comfort: {
      type: Number,
      required: [true, "Comfort rating is required."],
      min: [1, "Comfort must be at least 1."],
      max: [10, "Comfort cannot exceed 10."],
    },
    location: {
      type: Number,
      required: [true, "Location rating is required."],
      min: [1, "Location must be at least 1."],
      max: [10, "Location cannot exceed 10."],
    },
    wifiConnection: {
      type: Number,
      required: [true, "WiFi connection rating is required."],
      min: [1, "WiFi must be at least 1."],
      max: [10, "WiFi cannot exceed 10."],
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          return (await GuestModel.exists({ _id: id })) !== null;
        },
        message: "Invalid guest ID.",
      },
      required: [true, "Guest ID is required."],
    },
    review: {
      type: String,
      required: [true, "Review text is required."],
      trim: true,
    },
    reviewTitle: {
      type: String,
      required: [true, "Review title is required."],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for final rating
roomTypeReviewSchema
  .virtual("finalRating")
  .get(function (this: IRoomTypeReview) {
    const avg =
      (this.cleanliness +
        this.amenities +
        this.location +
        this.comfort +
        this.wifiConnection) /
      5;

    let remark = "";
    if (avg > 8.5) remark = "Excellent";
    else if (avg > 6.5) remark = "Very Good";
    else if (avg > 5) remark = "Average";
    else if (avg > 2.5) remark = "Poor";
    else remark = "Very Bad";

    return {
      rating: parseFloat(avg.toFixed(1)),
      remark,
    };
  });

export const RoomTypeReviewModel = mongoose.model<IRoomTypeReview>(
  "room_type_reviews",
  roomTypeReviewSchema
);
