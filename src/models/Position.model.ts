import * as mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "position name required"],
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PositionModel = mongoose.model("positions", positionSchema);
