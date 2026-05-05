import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryItemLocationModel } from "./Inventoryitemlocation.model";
import { InventoryItemModel } from "./Inventoryitem.model";
import { InventoryLocationModel } from "./Inventorylocation.model";

// Every stock change in the system -- receive, issue, return, wastage,
// transfer, or stock take adjustment -- produces exactly one movement document.
// Nothing updates currentStock on InventoryItemLocation directly.
// The post-save hook here does that atomically after the movement is recorded.

export type MovementType =
  | "receive" // Goods received from supplier against a GoodsReceipt
  | "issue" // Stock issued to a department against an approved Requisition
  | "return" // Unused stock returned from a department back to the store
  | "wastage" // Stock lost, damaged, expired, or disposed of
  | "transfer_out" // Stock leaving a location during an inter-store transfer
  | "transfer_in" // Stock arriving at a location during an inter-store transfer
  | "adjustment"; // Stock take variance adjustment after an approved StockTake

// Reason codes for wastage movements.
// Kept as an enum so reports can group and filter by cause.
export type WastageReason =
  | "expired"
  | "damaged"
  | "lost"
  | "contaminated"
  | "disposed"
  | "other";

export interface IInventoryMovement extends Document {
  type: MovementType;
  item: Types.ObjectId;
  location: Types.ObjectId;
  // For transfers, the counterpart location
  counterpartLocation?: Types.ObjectId;
  quantity: number;
  unitCostInCFA: number;
  totalCostInCFA: number;
  // Reference to the source document that triggered this movement
  referenceModel:
    | "InventoryGoodsReceipt"
    | "InventoryRequisition"
    | "InventoryStockTake"
    | "InventoryMovement"
    | null;
  referenceId?: Types.ObjectId;
  // For transfer movements, links the out and in movements together
  transferPairId?: string;
  wastageReason?: WastageReason;
  notes?: string;
  performedBy: Types.ObjectId;
  // Snapshot of stock before and after for audit clarity
  stockBefore: number;
  stockAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Movement type is required"],
      enum: {
        values: [
          "receive",
          "issue",
          "return",
          "wastage",
          "transfer_out",
          "transfer_in",
          "adjustment",
        ],
        message:
          "Invalid movement type. Must be one of: receive, issue, return, wastage, transfer_out, transfer_in, adjustment",
      },
    },

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

    // The location where this movement occurred.
    // For transfer_out this is the sending location.
    // For transfer_in this is the receiving location.
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

    // Only populated for transfer movements.
    // For transfer_out: the destination location.
    // For transfer_in: the source location.
    counterpartLocation: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
    },

    // Always positive. Direction is determined by movement type.
    // receive/return/transfer_in/adjustment(positive) add to stock.
    // issue/wastage/transfer_out/adjustment(negative) remove from stock.
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.001, "Quantity must be greater than zero"],
    },

    // Cost per unit at the time of this movement (FIFO batch cost for issues)
    unitCostInCFA: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },

    // Computed: quantity * unitCostInCFA
    totalCostInCFA: {
      type: Number,
      required: [true, "Total cost is required"],
      min: [0, "Total cost cannot be negative"],
    },

    // The document that triggered this movement.
    // Allows full traceability back to the source record.
    referenceModel: {
      type: String,
      enum: {
        values: [
          "InventoryGoodsReceipt",
          "InventoryRequisition",
          "InventoryStockTake",
          "InventoryMovement",
          null,
        ],
        message: "Invalid reference model",
      },
      default: null,
    },

    referenceId: {
      type: mongoose.Types.ObjectId,
    },

    // UUID shared between the transfer_out and transfer_in movements
    // of the same transfer operation. Used to link the pair together
    // in reports and audit trails.
    transferPairId: {
      type: String,
      select: false,
    },

    wastageReason: {
      type: String,
      enum: {
        values: [
          "expired",
          "damaged",
          "lost",
          "contaminated",
          "disposed",
          "other",
        ],
        message:
          "Invalid wastage reason. Must be one of: expired, damaged, lost, contaminated, disposed, other",
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    performedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Performed by user is required"],
    },

    // Snapshot of the stock level before this movement was applied.
    // Critical for audit -- allows reconstruction of history without
    // replaying all movements.
    stockBefore: {
      type: Number,
      required: [true, "Stock before snapshot is required"],
      min: [0, "Stock before cannot be negative"],
    },

    // Snapshot of the stock level after this movement was applied.
    stockAfter: {
      type: Number,
      required: [true, "Stock after snapshot is required"],
      min: [0, "Stock after cannot be negative"],
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for the most common query patterns
inventoryMovementSchema.index({ item: 1, location: 1, createdAt: -1 });
inventoryMovementSchema.index({ location: 1, type: 1, createdAt: -1 });
inventoryMovementSchema.index({ performedBy: 1, createdAt: -1 });
inventoryMovementSchema.index({ referenceModel: 1, referenceId: 1 });
inventoryMovementSchema.index({ transferPairId: 1 });
inventoryMovementSchema.index({ createdAt: -1 });

// Movements are append-only. No updates or deletes allowed.
// If a movement was made in error, a corrective movement must be created.
inventoryMovementSchema.pre("findOneAndUpdate", function (next) {
  return next(
    new Error(
      "Inventory movements are immutable. Create a corrective movement instead."
    )
  );
});

inventoryMovementSchema.pre("updateOne", function (next) {
  return next(
    new Error(
      "Inventory movements are immutable. Create a corrective movement instead."
    )
  );
});

inventoryMovementSchema.pre("updateMany", function (next) {
  return next(
    new Error(
      "Inventory movements are immutable. Create a corrective movement instead."
    )
  );
});

// Enforce that totalCostInCFA matches quantity * unitCostInCFA.
// Prevents accidental data entry mismatches.
inventoryMovementSchema.pre("save", function (next) {
  const expected = parseFloat((this.quantity * this.unitCostInCFA).toFixed(2));
  const actual = parseFloat(this.totalCostInCFA.toFixed(2));

  if (Math.abs(expected - actual) > 0.01) {
    return next(
      new Error(
        `totalCostInCFA (${actual}) does not match quantity * unitCostInCFA (${expected})`
      )
    );
  }

  next();
});

// Enforce wastageReason is present for wastage movements.
inventoryMovementSchema.pre("save", function (next) {
  if (this.type === "wastage" && !this.wastageReason) {
    return next(
      new Error("A wastage reason is required for wastage movements")
    );
  }
  next();
});

// Enforce counterpartLocation is present for transfer movements.
inventoryMovementSchema.pre("save", function (next) {
  if (
    (this.type === "transfer_out" || this.type === "transfer_in") &&
    !this.counterpartLocation
  ) {
    return next(
      new Error("counterpartLocation is required for transfer movements")
    );
  }
  next();
});

// Enforce counterpartLocation is not the same as location for transfers.
inventoryMovementSchema.pre("save", function (next) {
  if (
    this.counterpartLocation &&
    this.counterpartLocation.toString() === this.location.toString()
  ) {
    return next(
      new Error("Transfer source and destination locations cannot be the same")
    );
  }
  next();
});

// After a movement is saved, update currentStock on InventoryItemLocation.
// This is the only place currentStock changes. The session is passed via
// options so this participates in the caller's transaction.
inventoryMovementSchema.post("save", async function (doc) {
  const session = (this as any).$session();

  const stockDelta = ["receive", "return", "transfer_in"].includes(doc.type)
    ? doc.quantity
    : ["issue", "wastage", "transfer_out"].includes(doc.type)
    ? -doc.quantity
    : doc.stockAfter - doc.stockBefore;

  await InventoryItemLocationModel.findOneAndUpdate(
    { item: doc.item, location: doc.location },
    {
      $inc: { currentStock: stockDelta },
      updatedBy: doc.performedBy,
    },
    { session }
  );
});

export const InventoryMovementModel = mongoose.model<IInventoryMovement>(
  "inventorymovements",
  inventoryMovementSchema
);
