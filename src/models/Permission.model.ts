import * as mongoose from "mongoose";

import { Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const PermissionModel = mongoose.model("permissions", permisionSchema);
