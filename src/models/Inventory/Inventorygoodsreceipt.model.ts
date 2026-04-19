import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryPurchaseOrderModel } from "./Inventorypurchaseorder.model";
import { InventoryItemModel } from "./Inventoryitem.model";

export type GoodsReceiptStatus =
  | "draft" // Being filled in, not yet posted
  | "posted" // Confirmed and stock updated
  | "disputed"; // Quality or quantity issues flagged, under review

export interface IGoodsReceiptItem {
  item: Types.ObjectId;
  quantityExpected: number;
  quantityReceived: number;
  unitCostInCFA: number;
  totalCostInCFA: number;
  isDamaged: boolean;
  damageNotes?: string;
  expiryDate?: Date;
}

export interface IInventoryGoodsReceipt extends Document {
  grnNumber: string;
  purchaseOrder: Types.ObjectId;
  supplier: Types.ObjectId;
  location: Types.ObjectId;
  status: GoodsReceiptStatus;
  items: IGoodsReceiptItem[];
  totalAmountInCFA: number;
  deliveryDate: Date;
  deliveryNoteNumber?: string;
  isLateDelivery: boolean;
  hasQualityIssues: boolean;
  notes?: string;
  receivedBy: Types.ObjectId;
  postedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const goodsReceiptItemSchema = new mongoose.Schema(
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

    // Pulled from the PO line item at creation time
    quantityExpected: {
      type: Number,
      required: [true, "Expected quantity is required"],
      min: [0.001, "Expected quantity must be greater than zero"],
    },

    // What was actually delivered -- may differ from expected
    quantityReceived: {
      type: Number,
      required: [true, "Received quantity is required"],
      min: [0, "Received quantity cannot be negative"],
    },

    unitCostInCFA: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },

    // Computed: quantityReceived * unitCostInCFA
    // Only counts undamaged received quantity
    totalCostInCFA: {
      type: Number,
      required: [true, "Total cost is required"],
      min: [0, "Total cost cannot be negative"],
    },

    // When true, this line item is flagged as damaged on arrival.
    // Damaged items do not enter stock and are not counted in totalCostInCFA.
    // The service layer handles this split.
    isDamaged: {
      type: Boolean,
      default: false,
    },

    damageNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Damage notes cannot exceed 500 characters"],
    },

    // Only populated when the item has trackExpiry: true.
    // Stored on the cost batch in InventoryItemLocation.
    expiryDate: {
      type: Date,
    },
  },
  { _id: false }
);

const inventoryGoodsReceiptSchema = new mongoose.Schema(
  {
    // Auto-generated in the format GRN-{YEAR}-{SEQUENCE}
    // e.g. GRN-2026-0001
    grnNumber: {
      type: String,
      required: [true, "GRN number is required"],
      unique: true,
      trim: true,
    },

    // Every GRN must reference an approved PO.
    // You cannot receive goods that were not formally ordered.
    purchaseOrder: {
      type: mongoose.Types.ObjectId,
      ref: "inventorypurchaseorders",
      required: [true, "Purchase order reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const po = await InventoryPurchaseOrderModel.findById(id);
          if (!po) return false;
          // Only approved, sent, or partially received POs can be received against
          if (!["approved", "sent", "partial"].includes(po.status))
            return false;
          return true;
        },
        message:
          "Purchase order not found or is not in an approved, sent, or partial state",
      },
    },

    // Denormalized from PO for quick access on GRN documents and reports
    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "inventorysuppliers",
      required: [true, "Supplier reference is required"],
    },

    location: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
      required: [true, "Location reference is required"],
    },

    status: {
      type: String,
      required: [true, "GRN status is required"],
      enum: {
        values: ["draft", "posted", "disputed"],
        message: "Invalid status. Must be one of: draft, posted, disputed",
      },
      default: "draft",
    },

    items: {
      type: [goodsReceiptItemSchema],
      validate: {
        validator: function (items: IGoodsReceiptItem[]) {
          return items.length > 0;
        },
        message: "A goods receipt must contain at least one item",
      },
    },

    // Sum of all undamaged line item totalCostInCFA values.
    // This is the actual financial obligation created by this receipt.
    totalAmountInCFA: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    // The actual date goods were physically delivered
    deliveryDate: {
      type: Date,
      required: [true, "Delivery date is required"],
    },

    // Supplier's own delivery note or invoice reference number
    deliveryNoteNumber: {
      type: String,
      trim: true,
    },

    // True when deliveryDate is after the PO's expectedDeliveryDate.
    // Increments the supplier's lateDeliveries counter on post.
    isLateDelivery: {
      type: Boolean,
      default: false,
    },

    // True when any line item is flagged isDamaged: true.
    // Increments the supplier's qualityIssues counter on post.
    hasQualityIssues: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    receivedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Received by user is required"],
    },

    // Stamped when status transitions to posted
    postedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
inventoryGoodsReceiptSchema.index({ grnNumber: 1 });
inventoryGoodsReceiptSchema.index({ purchaseOrder: 1 });
inventoryGoodsReceiptSchema.index({ supplier: 1, createdAt: -1 });
inventoryGoodsReceiptSchema.index({ location: 1, status: 1, createdAt: -1 });
inventoryGoodsReceiptSchema.index({ isLateDelivery: 1 });
inventoryGoodsReceiptSchema.index({ hasQualityIssues: 1 });

// Auto-generate GRN number before first save.
// Format: GRN-{YEAR}-{ZERO_PADDED_SEQUENCE}
inventoryGoodsReceiptSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const year = new Date().getFullYear();
    const count = await InventoryGoodsReceiptModel.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    this.grnNumber = `GRN-${year}-${sequence}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Recompute totalAmountInCFA from non-damaged line items.
// Damaged items are flagged but not counted as a financial obligation.
inventoryGoodsReceiptSchema.pre("save", function (next) {
  if (!this.isModified("items")) return next();

  this.totalAmountInCFA = this.items
    .filter((item) => !item.isDamaged)
    .reduce((sum, item) => sum + item.totalCostInCFA, 0);

  // Sync hasQualityIssues flag from line items
  this.hasQualityIssues = this.items.some((item) => item.isDamaged);

  next();
});

// Validate each line item totalCostInCFA matches quantity * unitCost.
inventoryGoodsReceiptSchema.pre("save", function (next) {
  if (!this.isModified("items")) return next();

  for (const item of this.items) {
    const expected = parseFloat(
      (item.quantityReceived * item.unitCostInCFA).toFixed(2)
    );
    const actual = parseFloat(item.totalCostInCFA.toFixed(2));

    if (Math.abs(expected - actual) > 0.01) {
      return next(
        new Error(
          `Line item totalCostInCFA (${actual}) does not match quantityReceived * unitCostInCFA (${expected})`
        )
      );
    }
  }

  next();
});

// Validate that all items on this GRN exist on the referenced PO.
// Prevents receiving items that were never ordered.
inventoryGoodsReceiptSchema.pre("save", async function (next) {
  if (!this.isNew && !this.isModified("items")) return next();

  try {
    const po = await InventoryPurchaseOrderModel.findById(this.purchaseOrder);

    if (!po) return next(new Error("Referenced purchase order not found"));

    const poItemIds = po.items.map((i) => i.item.toString());

    for (const grnItem of this.items) {
      if (!poItemIds.includes(grnItem.item.toString())) {
        return next(
          new Error(
            `Item ${grnItem.item} was not on the referenced purchase order and cannot be received`
          )
        );
      }
    }

    // Determine if this is a late delivery
    this.isLateDelivery = this.deliveryDate > po.expectedDeliveryDate;

    next();
  } catch (err: any) {
    next(err);
  }
});

// Stamp postedAt when status transitions to posted.
inventoryGoodsReceiptSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "posted" && !this.postedAt) {
    this.postedAt = new Date();
  }
  next();
});

// Prevent edits once a GRN has been posted.
// Posted receipts are part of the financial record and are immutable.
inventoryGoodsReceiptSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("items") && this.status === "posted") {
    return next(
      new Error(
        "A posted goods receipt cannot be modified. Raise a corrective movement instead."
      )
    );
  }
  next();
});

export const InventoryGoodsReceiptModel =
  mongoose.model<IInventoryGoodsReceipt>(
    "inventorygoodsreceipts",
    inventoryGoodsReceiptSchema
  );
