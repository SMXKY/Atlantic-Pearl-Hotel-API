import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryLocationModel } from "./Inventorylocation.model";
import { InventoryItemModel } from "./Inventoryitem.model";

export type StockTakeStatus =
  | "scheduled" // Created by schedule or manually, not yet started
  | "in_progress" // Store manager has started entering counts
  | "pending_approval" // Counts submitted, awaiting hotel manager review
  | "approved" // Variances approved, ready to post adjustments
  | "posted" // Stock levels adjusted, stock take complete
  | "cancelled"; // Cancelled before posting

export type StockTakeScope =
  | "full" // All items across the entire location
  | "category" // All items in a specific category at the location
  | "spot"; // A specific selection of items

export interface IStockTakeItem {
  item: Types.ObjectId;
  expectedQuantity: number;
  physicalQuantity: number;
  variance: number;
  unitCostInCFA: number;
  varianceCostInCFA: number;
  varianceNotes?: string;
  attachmentUrl?: string;
  countedBy: Types.ObjectId;
  countedAt: Date;
}

export interface IInventoryStockTake extends Document {
  stockTakeNumber: string;
  location: Types.ObjectId;
  scope: StockTakeScope;
  scopeCategory?: Types.ObjectId;
  status: StockTakeStatus;
  items: IStockTakeItem[];
  scheduledFor: Date;
  startedAt?: Date;
  submittedAt?: Date;
  // Total absolute variance value across all items
  totalVarianceCostInCFA: number;
  initiatedBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  approvalNotes?: string;
  postedBy?: Types.ObjectId;
  postedAt?: Date;
  isScheduled: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockTakeItemSchema = new mongoose.Schema(
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

    // Pulled from InventoryItemLocation.currentStock at the time
    // the store manager opens the stock take form.
    // Hidden from the counter to avoid bias -- revealed after count is submitted.
    expectedQuantity: {
      type: Number,
      required: [true, "Expected quantity is required"],
      min: [0, "Expected quantity cannot be negative"],
      select: false,
    },

    // What the store manager physically counted
    physicalQuantity: {
      type: Number,
      required: [true, "Physical quantity is required"],
      min: [0, "Physical quantity cannot be negative"],
    },

    // physicalQuantity - expectedQuantity
    // Negative means shrinkage, positive means surplus
    variance: {
      type: Number,
      required: [true, "Variance is required"],
    },

    // FIFO unit cost at time of stock take for financial variance reporting
    unitCostInCFA: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },

    // variance * unitCostInCFA -- can be negative for shrinkage
    varianceCostInCFA: {
      type: Number,
      required: [true, "Variance cost is required"],
    },

    // Required when variance is non-zero
    varianceNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Variance notes cannot exceed 500 characters"],
    },

    // URL to a photo or document uploaded as evidence for this variance
    attachmentUrl: {
      type: String,
      trim: true,
    },

    countedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Counted by user is required"],
    },

    countedAt: {
      type: Date,
      required: [true, "Count timestamp is required"],
    },
  },
  { _id: false }
);

const inventoryStockTakeSchema = new mongoose.Schema(
  {
    // Auto-generated in the format ST-{YEAR}-{SEQUENCE}
    // e.g. ST-2026-0001
    stockTakeNumber: {
      type: String,
      // required: [true, "Stock take number is required"],
      unique: true,
      trim: true,
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

    scope: {
      type: String,
      required: [true, "Stock take scope is required"],
      enum: {
        values: ["full", "category", "spot"],
        message: "Invalid scope. Must be one of: full, category, spot",
      },
    },

    // Only required when scope is category
    scopeCategory: {
      type: mongoose.Types.ObjectId,
      ref: "inventorycategories",
    },

    status: {
      type: String,
      required: [true, "Stock take status is required"],
      enum: {
        values: [
          "scheduled",
          "in_progress",
          "pending_approval",
          "approved",
          "posted",
          "cancelled",
        ],
        message:
          "Invalid status. Must be one of: scheduled, in_progress, pending_approval, approved, posted, cancelled",
      },
      default: "scheduled",
    },

    items: {
      type: [stockTakeItemSchema],
      default: [],
    },

    // When the stock take is scheduled to occur
    scheduledFor: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },

    startedAt: {
      type: Date,
    },

    // When the store manager submitted counts for approval
    submittedAt: {
      type: Date,
    },

    // Sum of absolute varianceCostInCFA values.
    // Gives management a single number for the financial impact of this count.
    totalVarianceCostInCFA: {
      type: Number,
      default: 0,
    },

    initiatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Initiated by user is required"],
    },

    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    reviewedAt: {
      type: Date,
    },

    approvalNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Approval notes cannot exceed 500 characters"],
    },

    postedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    postedAt: {
      type: Date,
    },

    // True when this stock take was created by an automatic schedule.
    // False when manually initiated by the hotel manager.
    isScheduled: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
inventoryStockTakeSchema.index({ stockTakeNumber: 1 });
inventoryStockTakeSchema.index({ location: 1, status: 1, createdAt: -1 });
inventoryStockTakeSchema.index({ scheduledFor: 1, status: 1 });
inventoryStockTakeSchema.index({ isScheduled: 1, status: 1 });

// Auto-generate stock take number before first save.
// Format: ST-{YEAR}-{ZERO_PADDED_SEQUENCE}
inventoryStockTakeSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const year = new Date().getFullYear();
    const count = await InventoryStockTakeModel.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    this.stockTakeNumber = `ST-${year}-${sequence}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Enforce scopeCategory is present when scope is category
inventoryStockTakeSchema.pre("save", function (next) {
  if (this.scope === "category" && !this.scopeCategory) {
    return next(
      new Error(
        "scopeCategory is required when stock take scope is set to category"
      )
    );
  }
  next();
});

// Recompute totalVarianceCostInCFA whenever items change.
// Uses absolute values so surplus and shrinkage both contribute
// to the financial impact figure shown to management.
inventoryStockTakeSchema.pre("save", function (next) {
  if (!this.isModified("items")) return next();

  this.totalVarianceCostInCFA = this.items.reduce(
    (sum, item) => sum + Math.abs(item.varianceCostInCFA),
    0
  );

  next();
});

// Validate variance and varianceCostInCFA are computed correctly.
inventoryStockTakeSchema.pre("save", function (next) {
  if (!this.isModified("items")) return next();

  // Only validate after counts have been submitted.
  // During scheduled/in_progress, physicalQuantity is 0 and variance is 0 by design —
  // validating here would always fail since expectedQuantity is non-zero.
  const postSubmissionStatuses = ["pending_approval", "approved", "posted"];
  if (!postSubmissionStatuses.includes(this.status)) return next();

  for (const item of this.items) {
    const expectedVariance = parseFloat(
      (item.physicalQuantity - item.expectedQuantity).toFixed(4)
    );
    const actualVariance = parseFloat(item.variance.toFixed(4));

    if (Math.abs(expectedVariance - actualVariance) > 0.01) {
      return next(
        new Error(
          `Item variance (${actualVariance}) does not match physicalQuantity - expectedQuantity (${expectedVariance})`
        )
      );
    }

    const expectedVarianceCost = parseFloat(
      (item.variance * item.unitCostInCFA).toFixed(2)
    );
    const actualVarianceCost = parseFloat(item.varianceCostInCFA.toFixed(2));

    if (Math.abs(expectedVarianceCost - actualVarianceCost) > 0.01) {
      return next(
        new Error(
          `Item varianceCostInCFA (${actualVarianceCost}) does not match variance * unitCostInCFA (${expectedVarianceCost})`
        )
      );
    }
  }

  next();
});
// Enforce varianceNotes when a line item has a non-zero variance.

// Enforce varianceNotes when a line item has a non-zero variance.
// Every unexplained variance is a potential theft or waste issue.
inventoryStockTakeSchema.pre("save", function (next) {
  if (!this.isModified("items")) return next();

  // Only enforce notes after counts have been submitted.
  // During in_progress all variances are 0 — this check is meaningless until submit.
  const postSubmissionStatuses = ["pending_approval", "approved", "posted"];
  if (!postSubmissionStatuses.includes(this.status)) return next();

  for (const item of this.items) {
    if (
      item.variance !== 0 &&
      (!item.varianceNotes || item.varianceNotes.trim() === "")
    ) {
      return next(
        new Error(
          `A variance note is required for items with a non-zero variance. Item ${item.item} has variance ${item.variance} with no explanation.`
        )
      );
    }
  }

  next();
});

// Stamp status transition timestamps
inventoryStockTakeSchema.pre("save", function (next) {
  if (!this.isModified("status")) return next();

  if (this.status === "in_progress" && !this.startedAt) {
    this.startedAt = new Date();
  }

  if (this.status === "pending_approval" && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  if (this.status === "approved" && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }

  if (this.status === "posted" && !this.postedAt) {
    this.postedAt = new Date();
  }

  next();
});

// Prevent editing items on a posted stock take.
inventoryStockTakeSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("items") && this.status === "posted") {
    return next(
      new Error(
        "A posted stock take cannot be modified. It is part of the permanent inventory record."
      )
    );
  }
  next();
});

async function populateStockTake(doc: any) {
  await doc.populate("location");
  await doc.populate("scopeCategory");
  await doc.populate("initiatedBy", "name email");
  await doc.populate("reviewedBy", "name email");
  await doc.populate("postedBy", "name email");
  await doc.populate("items.item");
  await doc.populate("items.countedBy", "name email");
}

inventoryStockTakeSchema.post("findOne", async function (doc) {
  if (!doc) return;
  if ((this as any).getOptions()?.session) return; // skip if inside a transaction
  await populateStockTake(doc);
});

inventoryStockTakeSchema.post("find", async function (docs) {
  if (!docs?.length) return;
  if ((this as any).getOptions()?.session) return;
  await Promise.all(docs.map(populateStockTake));
});

export const InventoryStockTakeModel = mongoose.model<IInventoryStockTake>(
  "inventorystocktakes",
  inventoryStockTakeSchema
);
