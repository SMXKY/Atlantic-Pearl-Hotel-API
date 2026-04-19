import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryLocationModel } from "./Inventorylocation.model";

export type ScheduleFrequency =
  | "interval" // Every N days from the last completed stock take
  | "monthly" // On a fixed day of the month
  | "weekly"; // On a fixed day of the week

export interface IInventoryStockTakeSchedule extends Document {
  location: Types.ObjectId;
  isActive: boolean;
  frequency: ScheduleFrequency;
  // Used when frequency is interval -- number of days between stock takes
  intervalDays?: number;
  // Used when frequency is monthly -- day of month (1-28)
  dayOfMonth?: number;
  // Used when frequency is weekly -- 0=Sunday, 1=Monday ... 6=Saturday
  dayOfWeek?: number;
  // Scope of the auto-generated stock take
  scope: "full" | "category";
  scopeCategory?: Types.ObjectId;
  // How many days after a stock take is due before escalating to hotel manager
  gracePeriodDays: number;
  // Timestamp of the last completed stock take for this location
  lastCompletedAt?: Date;
  // When the next stock take is due based on schedule
  nextDueAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryStockTakeScheduleSchema = new mongoose.Schema(
  {
    // One schedule per location
    location: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
      required: [true, "Location reference is required"],
      unique: true,
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryLocationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Location Id not found in the database",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    frequency: {
      type: String,
      required: [true, "Schedule frequency is required"],
      enum: {
        values: ["interval", "monthly", "weekly"],
        message: "Invalid frequency. Must be one of: interval, monthly, weekly",
      },
    },

    // Required when frequency is interval
    intervalDays: {
      type: Number,
      min: [1, "Interval must be at least 1 day"],
      max: [365, "Interval cannot exceed 365 days"],
    },

    // Required when frequency is monthly -- kept to 28 to avoid month-end edge cases
    dayOfMonth: {
      type: Number,
      min: [1, "Day of month must be between 1 and 28"],
      max: [
        28,
        "Day of month must be between 1 and 28 to avoid month-end issues",
      ],
    },

    // Required when frequency is weekly
    dayOfWeek: {
      type: Number,
      min: [0, "Day of week must be between 0 (Sunday) and 6 (Saturday)"],
      max: [6, "Day of week must be between 0 (Sunday) and 6 (Saturday)"],
    },

    scope: {
      type: String,
      required: [true, "Schedule scope is required"],
      enum: {
        values: ["full", "category"],
        message: "Scope must be full or category",
      },
      default: "full",
    },

    // Only required when scope is category
    scopeCategory: {
      type: mongoose.Types.ObjectId,
      ref: "inventorycategories",
    },

    // Days after due date before the system escalates to hotel manager.
    // Once exceeded, the hotel manager receives a notification that the
    // store manager has not completed the stock take.
    gracePeriodDays: {
      type: Number,
      required: [true, "Grace period is required"],
      min: [0, "Grace period cannot be negative"],
      max: [30, "Grace period cannot exceed 30 days"],
      default: 3,
    },

    // Updated by the service layer when a stock take is posted
    lastCompletedAt: {
      type: Date,
    },

    // Computed and stored by the service layer after each completion
    // or schedule change so overdue queries are fast
    nextDueAt: {
      type: Date,
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

// Index for the scheduler job that checks for due stock takes
inventoryStockTakeScheduleSchema.index({ isActive: 1, nextDueAt: 1 });
inventoryStockTakeScheduleSchema.index({ location: 1 });

// Virtual: whether this schedule is currently overdue
inventoryStockTakeScheduleSchema.virtual("isOverdue").get(function () {
  if (!this.nextDueAt) return false;
  return new Date() > this.nextDueAt;
});

// Virtual: days overdue (0 if not overdue)
inventoryStockTakeScheduleSchema.virtual("daysOverdue").get(function () {
  if (!this.nextDueAt) return 0;
  const diff = new Date().getTime() - this.nextDueAt.getTime();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
});

// Virtual: whether the grace period has been exceeded and escalation is due
inventoryStockTakeScheduleSchema.virtual("requiresEscalation").get(function () {
  if (!this.nextDueAt) return 0;
  const diff = new Date().getTime() - this.nextDueAt.getTime();
  const daysOverdue = diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
  return daysOverdue > this.gracePeriodDays;
});

// Enforce frequency-specific fields are present
inventoryStockTakeScheduleSchema.pre("save", function (next) {
  if (this.frequency === "interval" && !this.intervalDays) {
    return next(
      new Error("intervalDays is required when frequency is interval")
    );
  }

  if (this.frequency === "monthly" && !this.dayOfMonth) {
    return next(new Error("dayOfMonth is required when frequency is monthly"));
  }

  if (this.frequency === "weekly" && this.dayOfWeek === undefined) {
    return next(new Error("dayOfWeek is required when frequency is weekly"));
  }

  next();
});

// Enforce scopeCategory is present when scope is category
inventoryStockTakeScheduleSchema.pre("save", function (next) {
  if (this.scope === "category" && !this.scopeCategory) {
    return next(
      new Error(
        "scopeCategory is required when schedule scope is set to category"
      )
    );
  }
  next();
});

export const InventoryStockTakeScheduleModel =
  mongoose.model<IInventoryStockTakeSchedule>(
    "inventorystocktakeschedules",
    inventoryStockTakeScheduleSchema
  );
