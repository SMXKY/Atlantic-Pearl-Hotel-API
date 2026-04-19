import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";

// Single-document collection. There will only ever be one record.
// The service layer uses upsert with a fixed key to enforce this.
// The hotel manager sets how long each type of inventory record
// is kept before being eligible for archival or deletion.

export interface IInventoryRetentionConfig extends Document {
  // Sentinel field -- always "singleton". Enforces one document via unique index.
  key: "singleton";
  // How long to retain completed/cancelled movements in days
  movementRetentionDays: number;
  // How long to retain posted goods receipts in days
  goodsReceiptRetentionDays: number;
  // How long to retain purchase orders in days (all statuses)
  purchaseOrderRetentionDays: number;
  // How long to retain posted stock takes in days
  stockTakeRetentionDays: number;
  // How long to retain financial events in days
  financialEventRetentionDays: number;
  // How long to retain supplier payments in days
  supplierPaymentRetentionDays: number;
  // How long to retain fulfilled or cancelled requisitions in days
  requisitionRetentionDays: number;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryRetentionConfigSchema = new mongoose.Schema(
  {
    // Fixed sentinel value that enforces only one document exists.
    // Always set to "singleton" by the service layer on upsert.
    key: {
      type: String,
      required: true,
      default: "singleton",
      enum: {
        values: ["singleton"],
        message: "key must be singleton",
      },
      unique: true,
    },

    // Minimum 90 days to preserve enough history for quarterly audits.
    // Maximum 3650 days (10 years) to prevent accidental infinite retention.
    movementRetentionDays: {
      type: Number,
      required: [true, "Movement retention period is required"],
      min: [90, "Movement retention must be at least 90 days"],
      max: [3650, "Movement retention cannot exceed 3650 days"],
      default: 365,
    },

    goodsReceiptRetentionDays: {
      type: Number,
      required: [true, "Goods receipt retention period is required"],
      min: [90, "Goods receipt retention must be at least 90 days"],
      max: [3650, "Goods receipt retention cannot exceed 3650 days"],
      default: 730,
    },

    purchaseOrderRetentionDays: {
      type: Number,
      required: [true, "Purchase order retention period is required"],
      min: [90, "Purchase order retention must be at least 90 days"],
      max: [3650, "Purchase order retention cannot exceed 3650 days"],
      default: 730,
    },

    stockTakeRetentionDays: {
      type: Number,
      required: [true, "Stock take retention period is required"],
      min: [90, "Stock take retention must be at least 90 days"],
      max: [3650, "Stock take retention cannot exceed 3650 days"],
      default: 730,
    },

    // Financial events have a higher minimum -- 365 days -- because
    // they serve as the accounting audit trail and may be required
    // for tax or regulatory purposes.
    financialEventRetentionDays: {
      type: Number,
      required: [true, "Financial event retention period is required"],
      min: [365, "Financial event retention must be at least 365 days"],
      max: [3650, "Financial event retention cannot exceed 3650 days"],
      default: 1825, // 5 years default
    },

    supplierPaymentRetentionDays: {
      type: Number,
      required: [true, "Supplier payment retention period is required"],
      min: [365, "Supplier payment retention must be at least 365 days"],
      max: [3650, "Supplier payment retention cannot exceed 3650 days"],
      default: 1825, // 5 years default
    },

    requisitionRetentionDays: {
      type: Number,
      required: [true, "Requisition retention period is required"],
      min: [90, "Requisition retention must be at least 90 days"],
      max: [3650, "Requisition retention cannot exceed 3650 days"],
      default: 365,
    },

    // The hotel manager who last updated this config
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Updated by user is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent any updates or deletes via query operators.
// All changes must go through the document save lifecycle
// so pre-save hooks and validation always run.
inventoryRetentionConfigSchema.pre("findOneAndUpdate", function (next) {
  return next(
    new Error(
      "Use document save to update retention config so validation hooks run."
    )
  );
});

inventoryRetentionConfigSchema.pre("updateOne", function (next) {
  return next(
    new Error(
      "Use document save to update retention config so validation hooks run."
    )
  );
});

// Enforce financial retention is never set below movement retention.
// Movements are the source of truth for financial events --
// having financial events outlive movements would create orphaned records.
inventoryRetentionConfigSchema.pre("save", function (next) {
  if (this.financialEventRetentionDays < this.movementRetentionDays) {
    return next(
      new Error(
        "Financial event retention must be greater than or equal to movement retention to prevent orphaned financial records."
      )
    );
  }
  next();
});

// Enforce supplier payment retention is never below goods receipt retention.
// A payment without its GRN context loses traceability.
inventoryRetentionConfigSchema.pre("save", function (next) {
  if (this.supplierPaymentRetentionDays < this.goodsReceiptRetentionDays) {
    return next(
      new Error(
        "Supplier payment retention must be greater than or equal to goods receipt retention."
      )
    );
  }
  next();
});

export const InventoryRetentionConfigModel =
  mongoose.model<IInventoryRetentionConfig>(
    "inventoryretentionconfigs",
    inventoryRetentionConfigSchema
  );
