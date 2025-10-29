import * as mongoose from "mongoose";

const stationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "station name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    code: {
      type: String,
      required: [true, "Station Code is required"],
      trim: true,
      unique: true,
      upppercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const StationModel = mongoose.model("stations", stationSchema);
