import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryItemModel } from "./Inventoryitem.model";
import { InventoryLocationModel } from "./Inventorylocation.model";

// Embedded schema for seasonal par level overrides.
// When a seasonal override is active (today is within validFrom/validTo),
// it takes precedence over the base reorderPoint and maxStock values.
interface ISeasonalParLevel {
  label: string;
  reorderPoint: number;
  maxStock: number;
  validFrom: Date;
  validTo: Date;
}

export interface IInventoryItemLocation extends Document {
  item: Types.ObjectId;
  location: Types.ObjectId;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  seasonalParLevels: ISeasonalParLevel[];
  isBlocked: boolean;
  blockedReason?: string;
  blockedBy?: Types.ObjectId;
  blockedAt?: Date;
  // FIFO cost batches -- each receipt adds a batch, issues consume from oldest first
  costBatches: ICostBatch[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Each time stock is received a cost batch is pushed here.
// Issues and wastage consume from the front of the array (FIFO).
// This gives us accurate FIFO stock valuation at any point in time.
interface ICostBatch {
  receivedAt: Date;
  unitCostInCFA: number;
  remainingQuantity: number;
  expiryDate?: Date;
}

// Helper function outside the schema
function calculateBatchValue(batch: ICostBatch): number {
  const qty = batch.remainingQuantity || 0;
  const cost = batch.unitCostInCFA || 0;
  return qty * cost;
}

const costBatchSchema = new mongoose.Schema(
  {
    receivedAt: {
      type: Date,
      required: [true, "Batch received date is required"],
    },

    unitCostInCFA: {
      type: Number,
      required: [true, "Batch unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },

    // Decremented as stock is issued or wasted.
    // When this hits 0 the batch is exhausted.
    remainingQuantity: {
      type: Number,
      required: [true, "Batch remaining quantity is required"],
      min: [0, "Remaining quantity cannot be negative"],
    },

    // Only populated when the parent item has trackExpiry: true
    expiryDate: {
      type: Date,
    },
  },
  { _id: false }
);

const seasonalParLevelSchema = new mongoose.Schema(
  {
    // Human readable label e.g. "Peak Season", "Rainy Season"
    label: {
      type: String,
      required: [true, "Seasonal par level label is required"],
      trim: true,
    },

    reorderPoint: {
      type: Number,
      required: [true, "Seasonal reorder point is required"],
      min: [0, "Reorder point cannot be negative"],
    },

    maxStock: {
      type: Number,
      required: [true, "Seasonal max stock is required"],
      min: [1, "Max stock must be at least 1"],
    },

    validFrom: {
      type: Date,
      required: [true, "Seasonal par level valid from date is required"],
    },

    validTo: {
      type: Date,
      required: [true, "Seasonal par level valid to date is required"],
    },
  },
  { _id: false }
);

const inventoryItemLocationSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Types.ObjectId,
      ref: "inventoryitems",
      required: [true, "Item reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryItemModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Item Id not found in the database",
      },
    },

    location: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
      required: [true, "Location reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryLocationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Location Id not found in the database",
      },
    },

    // Current quantity on hand at this location.
    // Never updated directly -- always via InventoryMovement
    // to maintain a clean audit trail.
    currentStock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },

    // Base reorder point for this item at this location.
    // Overridden by an active seasonalParLevel if one exists.
    reorderPoint: {
      type: Number,
      required: [true, "Reorder point is required"],
      min: [0, "Reorder point cannot be negative"],
    },

    // Maximum stock level for this location.
    // Used to prevent over-ordering.
    maxStock: {
      type: Number,
      required: [true, "Max stock is required"],
      min: [1, "Max stock must be at least 1"],
    },

    // Seasonal overrides for par levels.
    // The service layer checks if today falls within any validFrom/validTo
    // range and uses that reorderPoint/maxStock instead of the base values.
    seasonalParLevels: {
      type: [seasonalParLevelSchema],
      default: [],
    },

    // When true, no further issues can be made for this item at this location
    // until the block is explicitly lifted by a store manager or inventory admin.
    // Automatically set when currentStock hits the critical threshold defined
    // in InventoryAlertConfig.
    isBlocked: {
      type: Boolean,
      default: false,
    },

    blockedReason: {
      type: String,
      trim: true,
    },

    blockedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    blockedAt: {
      type: Date,
    },

    // FIFO cost batches. Oldest batch is always index 0.
    // Service layer pops from the front when issuing stock.
    costBatches: {
      type: [costBatchSchema],
      default: [],
      // select: false,
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

// A specific item can only exist once per location
inventoryItemLocationSchema.index({ item: 1, location: 1 }, { unique: true });

// Fast lookup for low stock queries across a location
inventoryItemLocationSchema.index({ location: 1, currentStock: 1 });

// Fast lookup for blocked items at a location
inventoryItemLocationSchema.index({ location: 1, isBlocked: 1 });

// Virtual: current FIFO stock valuation for this item at this location.
// Sum of (remainingQuantity * unitCostInCFA) across all cost batches.
inventoryItemLocationSchema.virtual("stockValueInCFA").get(function () {
  if (!this.costBatches) return 0;
  return this.costBatches.reduce(
    (total, batch) => total + calculateBatchValue(batch as ICostBatch),
    0
  );
});

// Enforce that maxStock is always greater than reorderPoint.
// Having a max lower than the reorder threshold would immediately
// trigger a reorder on every receipt which makes no sense.
inventoryItemLocationSchema.pre("save", function (next) {
  if (this.maxStock <= this.reorderPoint) {
    return next(new Error("Max stock must be greater than the reorder point"));
  }
  next();
});

// Validate seasonal par levels do not have overlapping date ranges.
// Overlapping seasons would cause ambiguity in which threshold to apply.
inventoryItemLocationSchema.pre("save", function (next) {
  if (!this.isModified("seasonalParLevels")) return next();

  const levels = this.seasonalParLevels;

  for (let i = 0; i < levels.length; i++) {
    if (levels[i].validTo <= levels[i].validFrom) {
      return next(
        new Error(
          `Seasonal par level "${levels[i].label}" has an invalid date range: validTo must be after validFrom`
        )
      );
    }

    for (let j = i + 1; j < levels.length; j++) {
      const aStart = levels[i].validFrom.getTime();
      const aEnd = levels[i].validTo.getTime();
      const bStart = levels[j].validFrom.getTime();
      const bEnd = levels[j].validTo.getTime();

      const overlaps = aStart < bEnd && bStart < aEnd;

      if (overlaps) {
        return next(
          new Error(
            `Seasonal par levels "${levels[i].label}" and "${levels[j].label}" have overlapping date ranges`
          )
        );
      }
    }
  }

  next();
});

// Enforce that blockedReason and blockedBy are set when blocking.
// A block without a reason gives the team no context for why issues are halted.
inventoryItemLocationSchema.pre("save", function (next) {
  if (this.isModified("isBlocked") && this.isBlocked) {
    if (!this.blockedReason || this.blockedReason.trim() === "") {
      return next(new Error("A reason is required when blocking an item"));
    }
    if (!this.blockedBy) {
      return next(new Error("The user blocking the item must be recorded"));
    }
    this.blockedAt = new Date();
  }

  // Clear block fields when unblocking
  if (this.isModified("isBlocked") && !this.isBlocked) {
    this.blockedReason = undefined;
    this.blockedBy = undefined;
    this.blockedAt = undefined;
  }

  next();
});

export const InventoryItemLocationModel =
  mongoose.model<IInventoryItemLocation>(
    "inventoryitemlocations",
    inventoryItemLocationSchema
  );
