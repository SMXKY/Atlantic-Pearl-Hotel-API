import * as mongoose from "mongoose";

const permisionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Permissions must have names"],
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

export const PermissionModel = mongoose.model("permissions", permisionSchema);
