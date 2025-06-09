import * as mongoose from "mongoose";
import { RateModel } from "./Rate.model";

const roomTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room type name, is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    minimumPriceInCFA: {
      type: Number,
      required: [true, "Minum price for a room type must be set."],
    },
    maxNumberOfGuest: {
      type: Number,
      required: [true, "Room maximum number of guests is required."],
    },
    maxNumberOfAdultGuests: {
      type: Number,
      required: [true, "Maxum number of adult occupants is required."],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
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

export const RoomTypeModel = mongoose.model("roomtypes", roomTypeSchema);
