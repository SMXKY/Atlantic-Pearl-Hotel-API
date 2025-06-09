import * as mongoose from "mongoose";

const buildingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Building name is required"],
      unique: true,
    },
    numberOfFloors: {
      type: Number,
      required: [true, "Building number of rooms is required."],
    },
    code: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Building descripiton is required"],
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const BuildingModel = mongoose.model("buildings", buildingSchema);
