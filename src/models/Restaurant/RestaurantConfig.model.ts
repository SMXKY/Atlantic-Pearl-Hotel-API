import mongoose, { Schema, model, Types } from "mongoose";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";

export interface IRestaurantConfig extends mongoose.Document {
  breakfastStart: string;
  breakfastEnd: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;

  maxBreakfastPerRoom: number;
  maxLunchPerRoom: number;
  maxDinnerPerRoom: number;

  breakfastRates: string[];
  lunchRates: string[];
  dinnerRates: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

const restaurantConfigSchema = new Schema<IRestaurantConfig>(
  {
    breakfastStart: {
      type: String,
      required: true,
    },
    breakfastEnd: {
      type: String,
      required: true,
    },
    lunchStart: {
      type: String,
      required: true,
    },
    lunchEnd: {
      type: String,
      required: true,
    },
    dinnerStart: {
      type: String,
      required: true,
    },
    dinnerEnd: {
      type: String,
      required: true,
    },
    maxBreakfastPerRoom: {
      type: Number,
      default: 1,
      min: 0,
    },
    maxLunchPerRoom: {
      type: Number,
      default: 1,
      min: 0,
    },
    maxDinnerPerRoom: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// --- Ensure single config per hotel (optional if multi-hotel system)
restaurantConfigSchema.pre("save", async function (next) {
  const count = await RestaurantConfigModel.countDocuments();
  if (count > 0 && this.isNew) {
    return next(
      new AppError(
        "A restaurant config already exists. You can only edit it.",
        StatusCodes.BAD_REQUEST
      )
    );
  }
  next();
});

// --- Optional: prevent deletion
restaurantConfigSchema.pre("findOneAndDelete", function (next) {
  return next(
    new AppError(
      "Restaurant config cannot be deleted. Edit it instead.",
      StatusCodes.BAD_REQUEST
    )
  );
});

// Helper: validate time string "HH:mm"
const isValidTime = (time: string) => {
  if (!time) return false;
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
};

// --- Pre-save hook ---
restaurantConfigSchema.pre("save", function (next) {
  const doc = this as IRestaurantConfig;

  // Validate meal counts
  if (
    doc.maxBreakfastPerRoom < 1 ||
    doc.maxLunchPerRoom < 1 ||
    doc.maxDinnerPerRoom < 1
  ) {
    return next(
      new AppError(
        "Each meal count must be at least 1.",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  // Validate times
  const times = [
    doc.breakfastStart,
    doc.breakfastEnd,
    doc.lunchStart,
    doc.lunchEnd,
    doc.dinnerStart,
    doc.dinnerEnd,
  ];
  if (!times.every(isValidTime)) {
    return next(
      new AppError(
        "All meal times must be valid 24-hour format (HH:mm).",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  next();
});

// --- Pre-update hook for findOneAndUpdate ---
restaurantConfigSchema.pre("findOneAndUpdate", function (next) {
  const update: any = this.getUpdate();

  if (!update) return next();

  // Validate meal counts if present
  const mealCounts = [
    update.maxBreakfastPerRoom,
    update.maxLunchPerRoom,
    update.maxDinnerPerRoom,
  ];
  if (mealCounts.some((v) => v !== undefined && v < 1)) {
    return next(
      new AppError(
        "Each meal count must be at least 1.",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  // Validate times if present
  const timeFields = [
    "breakfastStart",
    "breakfastEnd",
    "lunchStart",
    "lunchEnd",
    "dinnerStart",
    "dinnerEnd",
  ];
  const invalidTime = timeFields.some(
    (field) => update[field] && !isValidTime(update[field])
  );
  if (invalidTime) {
    return next(
      new AppError(
        "All meal times must be valid 24-hour format (HH:mm).",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  next();
});

// Helper: convert "HH:mm" to minutes since midnight
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Validate a meal slot
const validateMealSlot = (start: string, end: string, mealName: string) => {
  if (!isValidTime(start) || !isValidTime(end)) {
    throw new AppError(
      `${mealName} start and end times must be valid HH:mm format.`,
      StatusCodes.BAD_REQUEST
    );
  }

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes >= endMinutes) {
    throw new AppError(
      `${mealName} start time must be before end time.`,
      StatusCodes.BAD_REQUEST
    );
  }

  if (endMinutes - startMinutes < 30) {
    throw new AppError(
      `${mealName} time window must be at least 30 minutes.`,
      StatusCodes.BAD_REQUEST
    );
  }
};

// --- Pre-save hook ---
restaurantConfigSchema.pre("save", function (next) {
  const doc = this as IRestaurantConfig;

  validateMealSlot(doc.breakfastStart, doc.breakfastEnd, "Breakfast");
  validateMealSlot(doc.lunchStart, doc.lunchEnd, "Lunch");
  validateMealSlot(doc.dinnerStart, doc.dinnerEnd, "Dinner");

  next();
});

// --- Pre-update hook for findOneAndUpdate ---
restaurantConfigSchema.pre("findOneAndUpdate", async function (next) {
  const update: any = this.getUpdate();
  if (!update) return next();

  // Fetch the existing document
  const existingDoc = await this.model.findOne(this.getQuery());
  if (!existingDoc) return next();

  const fields: Array<[string, string, string]> = [
    ["breakfastStart", "breakfastEnd", "Breakfast"],
    ["lunchStart", "lunchEnd", "Lunch"],
    ["dinnerStart", "dinnerEnd", "Dinner"],
  ];

  for (const [startField, endField, mealName] of fields) {
    const startTime = update[startField] ?? existingDoc[startField];
    const endTime = update[endField] ?? existingDoc[endField];
    validateMealSlot(startTime, endTime, mealName);
  }

  next();
});

export const RestaurantConfigModel = model<IRestaurantConfig>(
  "restaurant_configs",
  restaurantConfigSchema
);
