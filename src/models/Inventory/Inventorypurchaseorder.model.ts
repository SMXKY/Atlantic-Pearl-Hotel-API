import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventorySupplierModel } from "./Inventorysupplier.model";
import { InventoryLocationModel } from "./Inventorylocation.model";
import { InventoryItemModel } from "./Inventoryitem.model";

export type POStatus =
  | "draft" // Created but not yet submitted for approval
  | "pending" // Submitted, awaiting hotel manager approval
  | "approved" // Approved, ready to be sent to supplier
  | "rejected" // Rejected by hotel manager
  | "sent" // Sent to supplier, awaiting delivery
  | "partial" // Partially received
  | "received" // Fully received via GoodsReceipt
  | "cancelled"; // Cancelled before receipt

export interface IPOItem {
  item: Types.ObjectId;
  quantityOrdered: number;
  unitCostInCFA: number;
  totalCostInCFA: number;
  notes?: string;
}

export interface IInventoryPurchaseOrder extends Document {
  poNumber: string;
  supplier: Types.ObjectId;
  location: Types.ObjectId;
  status: POStatus;
  items: IPOItem[];
  totalAmountInCFA: number;
  expectedDeliveryDate: Date;
  isOverdue: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  sentAt?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poItemSchema = new mongoose.Schema(
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

    quantityOrdered: {
      type: Number,
      required: [true, "Ordered quantity is required"],
      min: [0.001, "Ordered quantity must be greater than zero"],
    },

    unitCostInCFA: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },

    // Computed: quantityOrdered * unitCostInCFA
    totalCostInCFA: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [300, "Item notes cannot exceed 300 characters"],
    },
  },
  { _id: false }
);

const inventoryPurchaseOrderSchema = new mongoose.Schema(
  {
    // Auto-generated in the format PO-{YEAR}-{SEQUENCE}
    // e.g. PO-2026-0001
    poNumber: {
      type: String,
      // required: [true, "PO number is required"],
      unique: true,
      trim: true,
    },

    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "inventorysuppliers",
      required: [true, "Supplier reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const supplier = await InventorySupplierModel.findById(id);
          if (!supplier) return false;
          if (supplier.isBlacklisted) return false;
          return true;
        },
        message:
          "Supplier not found or is blacklisted and cannot be used on new purchase orders",
      },
    },

    // The location this order is being placed for.
    // Goods will be received into this location.
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

    status: {
      type: String,
      required: [true, "PO status is required"],
      enum: {
        values: [
          "draft",
          "pending",
          "approved",
          "rejected",
          "sent",
          "partial",
          "received",
          "cancelled",
        ],
        message:
          "Invalid PO status. Must be one of: draft, pending, approved, rejected, sent, partial, received, cancelled",
      },
      default: "draft",
    },

    items: {
      type: [poItemSchema],
      validate: {
        validator: function (items: IPOItem[]) {
          return items.length > 0;
        },
        message: "A purchase order must contain at least one item",
      },
    },

    // Sum of all item totalCostInCFA values.
    // Recomputed in pre-save hook whenever items change.
    totalAmountInCFA: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },

    expectedDeliveryDate: {
      type: Date,
      required: [true, "Expected delivery date is required"],
    },

    // Computed virtual -- true when status is sent/partial
    // and today is past expectedDeliveryDate.
    // Stored as a field so we can query overdue POs directly.
    isOverdue: {
      type: Boolean,
      default: false,
    },

    approvedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    approvedAt: {
      type: Date,
    },

    rejectedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    rejectedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },

    // Timestamp when the PO was marked as sent to the supplier
    sentAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
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

// Indexes for common query patterns
inventoryPurchaseOrderSchema.index({ poNumber: 1 });
inventoryPurchaseOrderSchema.index({ supplier: 1, status: 1, createdAt: -1 });
inventoryPurchaseOrderSchema.index({ location: 1, status: 1, createdAt: -1 });
inventoryPurchaseOrderSchema.index({ isOverdue: 1, status: 1 });
inventoryPurchaseOrderSchema.index({ expectedDeliveryDate: 1, status: 1 });

// Auto-generate PO number before first save.
inventoryPurchaseOrderSchema.pre("save", async function (next) {
  if (!this.isNew || this.poNumber) return next();

  try {
    const year = new Date().getFullYear();
    const count = await InventoryPurchaseOrderModel.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    this.poNumber = `PO-${year}-${String(count + 1).padStart(4, "0")}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compute each line's totalCostInCFA then sum into totalAmountInCFA.
inventoryPurchaseOrderSchema.pre("save", function (next) {
  if (!this.isModified("items")) return next();

  this.totalAmountInCFA = this.items.reduce((sum, item) => {
    item.totalCostInCFA = parseFloat(
      (item.quantityOrdered * item.unitCostInCFA).toFixed(2)
    );
    return sum + item.totalCostInCFA;
  }, 0);

  next();
});

// Enforce rejectionReason when rejecting a PO.
inventoryPurchaseOrderSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "rejected" &&
    (!this.rejectionReason || this.rejectionReason.trim() === "")
  ) {
    return next(
      new Error(
        "A rejection reason is required when rejecting a purchase order"
      )
    );
  }
  next();
});

// Stamp approval/rejection/sent timestamps when status changes.
inventoryPurchaseOrderSchema.pre("save", function (next) {
  if (!this.isModified("status")) return next();

  if (this.status === "approved" && !this.approvedAt)
    this.approvedAt = new Date();
  if (this.status === "rejected" && !this.rejectedAt)
    this.rejectedAt = new Date();
  if (this.status === "sent" && !this.sentAt) this.sentAt = new Date();

  next();
});

// Update isOverdue flag.
inventoryPurchaseOrderSchema.pre("save", function (next) {
  if (!this.isModified("expectedDeliveryDate") && !this.isModified("status"))
    return next();

  this.isOverdue =
    ["sent", "partial"].includes(this.status) &&
    new Date() > this.expectedDeliveryDate;

  next();
});

// Prevent line item edits after submission.
inventoryPurchaseOrderSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("items") && this.status !== "draft") {
    return next(
      new Error(
        "Line items cannot be changed after a purchase order has been submitted for approval"
      )
    );
  }
  next();
});

// Populate item references after save so the response includes full item details.
inventoryPurchaseOrderSchema.post("find", async function (docs) {
  const session = (this as any).options?.session;
  if (session) return;
  for (const doc of docs) {
    await doc.populate([
      { path: "items.item", select: "name unitOfMeasure" },
      { path: "supplier", select: "name code" },
      { path: "location", select: "name" },
    ]);
  }
});

inventoryPurchaseOrderSchema.post("findOne", async function (doc) {
  if (!doc) return;
  const session = (this as any).options?.session;
  if (session) return;
  await doc.populate([
    { path: "items.item", select: "name unitOfMeasure" },
    { path: "supplier", select: "name code" },
    { path: "location", select: "name" },
  ]);
});

export const InventoryPurchaseOrderModel =
  mongoose.model<IInventoryPurchaseOrder>(
    "inventorypurchaseorders",
    inventoryPurchaseOrderSchema
  );
