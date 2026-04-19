import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";

// Every financial commitment or payment in the inventory module
// produces exactly one FinancialEvent. This gives accountants a clean
// append-only ledger they can pull by date range without digging through
// POs, GRNs, and payments individually.
//
// Events are written by the service layer at these moments:
//   po_approved    -- when a hotel manager approves a PO (commitment created)
//   po_cancelled   -- when an approved PO is cancelled (commitment removed)
//   goods_received -- when a GRN is posted (obligation confirmed)
//   payment_made   -- when a supplier payment is confirmed
//   payment_reversed -- when a confirmed payment is reversed

export type FinancialEventType =
  | "po_approved" // A PO was approved -- financial commitment created
  | "po_cancelled" // An approved PO was cancelled -- commitment removed
  | "goods_received" // A GRN was posted -- payable created
  | "payment_made" // A payment was confirmed against a GRN
  | "payment_reversed"; // A confirmed payment was reversed

export interface IInventoryFinancialEvent extends Document {
  type: FinancialEventType;
  amountInCFA: number;
  // Positive for commitments/obligations/payments, negative for reversals/cancellations
  direction: "debit" | "credit";
  supplier: Types.ObjectId;
  // The document that triggered this event
  referenceModel:
    | "InventoryPurchaseOrder"
    | "InventoryGoodsReceipt"
    | "InventorySupplierPayment";
  referenceId: Types.ObjectId;
  referenceNumber: string;
  category?: Types.ObjectId;
  location?: Types.ObjectId;
  description: string;
  performedBy: Types.ObjectId;
  eventDate: Date;
  createdAt: Date;
}

const inventoryFinancialEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Financial event type is required"],
      enum: {
        values: [
          "po_approved",
          "po_cancelled",
          "goods_received",
          "payment_made",
          "payment_reversed",
        ],
        message:
          "Invalid event type. Must be one of: po_approved, po_cancelled, goods_received, payment_made, payment_reversed",
      },
    },

    amountInCFA: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // debit  = money going out or obligation being created (po_approved, goods_received, payment_made)
    // credit = obligation being removed or money coming back (po_cancelled, payment_reversed)
    direction: {
      type: String,
      required: [true, "Direction is required"],
      enum: {
        values: ["debit", "credit"],
        message: "Direction must be debit or credit",
      },
    },

    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "inventorysuppliers",
      required: [true, "Supplier reference is required"],
    },

    referenceModel: {
      type: String,
      required: [true, "Reference model is required"],
      enum: {
        values: [
          "InventoryPurchaseOrder",
          "InventoryGoodsReceipt",
          "InventorySupplierPayment",
        ],
        message:
          "Invalid reference model. Must be one of: InventoryPurchaseOrder, InventoryGoodsReceipt, InventorySupplierPayment",
      },
    },

    referenceId: {
      type: mongoose.Types.ObjectId,
      required: [true, "Reference document Id is required"],
    },

    // Human-readable reference number for reports (PO-2026-0001, GRN-2026-0001, etc.)
    referenceNumber: {
      type: String,
      required: [true, "Reference number is required"],
      trim: true,
    },

    // Denormalized for report filtering without extra joins
    category: {
      type: mongoose.Types.ObjectId,
      ref: "inventorycategories",
    },

    location: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
    },

    // Human-readable description for the accountant
    // e.g. "PO-2026-0001 approved for supplier Cameroon Supplies Ltd -- 450,000 CFA"
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    performedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Performed by user is required"],
    },

    // The actual date the financial event occurred (may differ from createdAt
    // if entered retroactively, e.g. a payment dated yesterday)
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
    },
  },
  {
    // No updatedAt -- financial events are append-only and never updated
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for accountant report queries
inventoryFinancialEventSchema.index({ eventDate: -1 });
inventoryFinancialEventSchema.index({ supplier: 1, eventDate: -1 });
inventoryFinancialEventSchema.index({ type: 1, eventDate: -1 });
inventoryFinancialEventSchema.index({ referenceModel: 1, referenceId: 1 });
inventoryFinancialEventSchema.index({ category: 1, eventDate: -1 });
inventoryFinancialEventSchema.index({ location: 1, eventDate: -1 });
inventoryFinancialEventSchema.index({ direction: 1, eventDate: -1 });

// Financial events are append-only. No updates or deletes ever.
// Corrections are handled by creating a reversal event.
inventoryFinancialEventSchema.pre("findOneAndUpdate", function (next) {
  return next(
    new Error("Financial events are immutable and cannot be updated.")
  );
});

inventoryFinancialEventSchema.pre("updateOne", function (next) {
  return next(
    new Error("Financial events are immutable and cannot be updated.")
  );
});

inventoryFinancialEventSchema.pre("updateMany", function (next) {
  return next(
    new Error("Financial events are immutable and cannot be updated.")
  );
});

inventoryFinancialEventSchema.pre("findOneAndDelete", function (next) {
  return next(
    new Error("Financial events are immutable and cannot be deleted.")
  );
});

inventoryFinancialEventSchema.pre("deleteOne", function (next) {
  return next(
    new Error("Financial events are immutable and cannot be deleted.")
  );
});

inventoryFinancialEventSchema.pre("deleteMany", function (next) {
  return next(
    new Error("Financial events are immutable and cannot be deleted.")
  );
});

export const InventoryFinancialEventModel =
  mongoose.model<IInventoryFinancialEvent>(
    "inventoryfinancialevents",
    inventoryFinancialEventSchema
  );
