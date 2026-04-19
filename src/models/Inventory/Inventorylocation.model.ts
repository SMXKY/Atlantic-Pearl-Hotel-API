import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";

export interface IInventoryLocation extends Document {
  name: string;
  code: string;
  description?: string;
  departments: Types.ObjectId[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      unique: true,
    },

    // Short code used in reports and SKU generation e.g. "MAIN", "HK", "FB"
    code: {
      type: String,
      required: [true, "Location code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [10, "Location code cannot exceed 10 characters"],
    },

    description: {
      type: String,
      trim: true,
    },

    // Departments that are allowed to raise requisitions from this location.
    // Store managers and admins can add or remove departments at any time.
    departments: [
      {
        type: mongoose.Types.ObjectId,
        ref: "departments",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },

    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast lookup by code
inventoryLocationSchema.index({ code: 1 });

// Index to quickly find all active locations
inventoryLocationSchema.index({ isActive: 1 });

// Prevent deletion of a location that still has active stock.
// This is enforced at the service layer, not here, because it requires
// querying InventoryItemLocation. This hook just sanitizes the update.

// Normalize code to uppercase before save in case the uppercase: true
// on the field definition is bypassed via direct update operations
inventoryLocationSchema.pre("save", function (next) {
  if (this.isModified("code")) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

export const InventoryLocationModel = mongoose.model<IInventoryLocation>(
  "inventorylocations",
  inventoryLocationSchema
);
