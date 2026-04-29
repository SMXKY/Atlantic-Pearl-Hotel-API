import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryCategoryModel } from "./Inventorycategory.model";
import { InventorySupplierModel } from "./Inventorysupplier.model";

// Embedded supplier reference on the item
// An item can have multiple suppliers, one marked as preferred
interface IItemSupplier {
  supplier: Types.ObjectId;
  unitCostInCFA: number;
  isPreferred: boolean;
}

export interface IInventoryItem extends Document {
  name: string;
  sku: string;
  description?: string;
  category: Types.ObjectId;
  unitOfMeasure: string;
  abcClassification: "A" | "B" | "C";
  suppliers: IItemSupplier[];
  trackExpiry: boolean;
  reorderQuantity: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Embedded schema for supplier references on an item
const itemSupplierSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "inventorysuppliers",
      required: [true, "Supplier reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventorySupplierModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Supplier Id not found in the database",
      },
    },

    // Unit cost at the time of item setup. Updated when a new GoodsReceipt
    // is posted and the price has changed. Used for suggested PO pricing.
    unitCostInCFA: {
      type: Number,
      required: [true, "Unit cost is required for each supplier"],
      min: [0, "Unit cost cannot be negative"],
    },

    isPreferred: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      unique: true,
    },

    // Auto-generated in the format {CATEGORY_CODE}-{SEQUENCE}
    // e.g. HK-0001, FB-0023, MNT-0004
    // select: false keeps it off general responses unless explicitly requested
    sku: {
      type: String,
      // required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
      unique: true,
      select: false,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: mongoose.Types.ObjectId,
      ref: "inventorycategories",
      required: [true, "Category is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryCategoryModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Category Id not found in the database",
      },
    },

    // e.g. "pieces", "litres", "kg", "boxes", "rolls"
    unitOfMeasure: {
      type: String,
      required: [true, "Unit of measure is required"],
      trim: true,
    },

    // ABC classification determines how closely this item is monitored.
    // A: high value, low quantity -- tightest control
    // B: moderate value and demand -- standard control
    // C: low value, high quantity (e.g. toilet paper) -- loose control
    abcClassification: {
      type: String,
      required: [true, "ABC classification is required"],
      enum: {
        values: ["A", "B", "C"],
        message:
          "ABC classification must be A (high value), B (moderate), or C (low value high volume)",
      },
    },

    // An item can be sourced from multiple suppliers.
    // Exactly one must be marked isPreferred: true.
    // Validated in pre-save hook below.
    suppliers: {
      type: [itemSupplierSchema],
      validate: {
        validator: function (suppliers: IItemSupplier[]) {
          return suppliers.length > 0;
        },
        message: "At least one supplier is required per item",
      },
    },

    // When true, individual stock batches will carry an expiryDate.
    // The system alerts when batches are within the configured alert window.
    trackExpiry: {
      type: Boolean,
      default: false,
    },

    // How many units to order when a reorder is triggered.
    // This is the default quantity placed on auto-suggested POs.
    reorderQuantity: {
      type: Number,
      required: [true, "Reorder quantity is required"],
      min: [1, "Reorder quantity must be at least 1"],
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

// Indexes
inventoryItemSchema.index({ sku: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ isActive: 1 });
inventoryItemSchema.index({ abcClassification: 1 });

// Enforce exactly one preferred supplier per item.
// Multiple preferred flags would cause ambiguity when auto-generating POs.
inventoryItemSchema.pre("save", function (next) {
  if (!this.isModified("suppliers")) return next();

  const preferredCount = this.suppliers.filter((s) => s.isPreferred).length;

  if (preferredCount === 0) {
    return next(new Error("Exactly one supplier must be marked as preferred"));
  }

  if (preferredCount > 1) {
    return next(
      new Error("Only one supplier can be marked as preferred per item")
    );
  }

  next();
});

// Auto-generate SKU if not provided.
// Format: {CATEGORY_CODE}-{ZERO_PADDED_SEQUENCE}
// e.g. HK-0001, FB-0023
// The sequence is the total count of items in that category + 1.
inventoryItemSchema.pre("save", async function (next) {
  console.log("Here");
  if (!this.isNew || this.sku) return next();

  try {
    const category = await InventoryCategoryModel.findById(this.category);

    if (!category) {
      return next(new Error("Category not found, cannot generate SKU"));
    }

    const count = await InventoryItemModel.countDocuments({
      category: this.category,
    });

    const sequence = String(count + 1).padStart(4, "0");
    this.sku = `${category.code}-${sequence}`;

    next();
  } catch (err: any) {
    console.log(err);
    next(err);
  }
});

inventoryItemSchema.pre("save", async function (next) {
  if (!this.isNew || this.sku) return next();

  try {
    const category = await InventoryCategoryModel.findById(this.category);
    if (!category)
      return next(new Error("Category not found, cannot generate SKU"));

    const count = await InventoryItemModel.countDocuments({
      category: this.category,
    });
    const sequence = String(count + 1).padStart(4, "0");
    this.sku = `${category.code}-${sequence}`;

    if (!this.sku) return next(new Error("SKU generation failed"));

    next();
  } catch (err: any) {
    next(err);
  }
});

export const InventoryItemModel = mongoose.model<IInventoryItem>(
  "inventoryitems",
  inventoryItemSchema
);
