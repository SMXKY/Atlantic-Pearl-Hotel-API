import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryCategoryModel } from "./Inventorycategory.model";

export interface IInventoryBudget extends Document {
  category: Types.ObjectId;
  month: number;
  year: number;
  budgetAmountInCFA: number;
  // Tracked by the service layer as payments and GRNs are posted
  actualSpendInCFA: number;
  notes?: string;
  setBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryBudgetSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Types.ObjectId,
      ref: "inventorycategories",
      required: [true, "Category reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryCategoryModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Category Id not found in the database",
      },
    },

    // 1 = January, 12 = December
    month: {
      type: Number,
      required: [true, "Budget month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
    },

    year: {
      type: Number,
      required: [true, "Budget year is required"],
      min: [2024, "Year must be 2024 or later"],
    },

    budgetAmountInCFA: {
      type: Number,
      required: [true, "Budget amount is required"],
      min: [0, "Budget amount cannot be negative"],
    },

    // Running total of actual spend for this category in this month.
    // Incremented by the service layer when payments are confirmed
    // or GRNs are posted against items in this category.
    actualSpendInCFA: {
      type: Number,
      default: 0,
      min: [0, "Actual spend cannot be negative"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    setBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Set by user is required"],
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

// One budget per category per month per year
inventoryBudgetSchema.index(
  { category: 1, month: 1, year: 1 },
  { unique: true }
);

inventoryBudgetSchema.index({ year: 1, month: 1 });

// Virtual: remaining budget for this period
inventoryBudgetSchema.virtual("remainingInCFA").get(function () {
  return this.budgetAmountInCFA - this.actualSpendInCFA;
});

// Virtual: spend as a percentage of budget
inventoryBudgetSchema.virtual("spendPercentage").get(function () {
  if (this.budgetAmountInCFA === 0) return null;
  return parseFloat(
    ((this.actualSpendInCFA / this.budgetAmountInCFA) * 100).toFixed(1)
  );
});

// Virtual: whether this budget has been exceeded
inventoryBudgetSchema.virtual("isOverBudget").get(function () {
  return this.actualSpendInCFA > this.budgetAmountInCFA;
});

// Prevent setting a budget for a past month.
// Past budgets are historical records and should not be changed.
// The service layer enforces this but we add it here for safety.
inventoryBudgetSchema.pre("save", function (next) {
  if (!this.isNew) return next();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isPast =
    this.year < currentYear ||
    (this.year === currentYear && this.month < currentMonth);

  if (isPast) {
    return next(
      new Error(
        "A budget cannot be created for a past month. Past budgets are read-only."
      )
    );
  }

  next();
});

export const InventoryBudgetModel = mongoose.model<IInventoryBudget>(
  "inventorybudgets",
  inventoryBudgetSchema
);
