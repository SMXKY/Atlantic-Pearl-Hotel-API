import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";

export interface IInventoryCategory extends Document {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },

    // Short code used in reports and SKU generation e.g. "HK", "FB", "MNT"
    code: {
      type: String,
      required: [true, "Category code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [10, "Category code cannot exceed 10 characters"],
    },

    description: {
      type: String,
      trim: true,
    },

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
inventoryCategorySchema.index({ code: 1 });

// Index to filter active categories quickly in dropdowns
inventoryCategorySchema.index({ isActive: 1 });

// Normalize code to uppercase before save
inventoryCategorySchema.pre("save", function (next) {
  if (this.isModified("code")) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

export const InventoryCategoryModel = mongoose.model<IInventoryCategory>(
  "inventorycategories",
  inventoryCategorySchema
);
