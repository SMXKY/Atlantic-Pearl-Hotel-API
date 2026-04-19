import * as mongoose from "mongoose";
import { MODULES, SUBMODULES } from "../../types/Permissions.type";

import { Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  description?: string;
  module?: string;
  submodule?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MODULE_ENUM = Object.values(MODULES) as string[];
const SUBMODULE_ENUM = Object.values(SUBMODULES) as string[];

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

    // new fields
    module: {
      type: String,
      enum: MODULE_ENUM,
      required: [true, "Permission must belong to a module"],
    },

    submodule: {
      type: String,
      enum: SUBMODULE_ENUM,
      required: [true, "Permission must belong to a submodule"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// optional: index for quick lookups by module/submodule
permisionSchema.index({ module: 1, submodule: 1 });

export const PermissionModel = mongoose.model("permissions", permisionSchema);
