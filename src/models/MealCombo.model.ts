import mongoose, { Schema, Document, Types } from "mongoose";
import { RestaurantItemModel } from "./RestaurantItem.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { io } from "../index";
import { IRestaurantItem } from "./RestaurantItem.model";

export interface IMealCombo extends Document {
  code: string;
  name: string;
  description?: string;
  items: (Types.ObjectId | IRestaurantItem)[];
  mealType: "breakfast" | "lunch" | "dinner" | "all";
  availableToday: boolean;
  isAvailable: boolean;
  isActive: boolean;
  img: string;
  createdAt: Date;
  updatedAt: Date;
  priceInCFA?: number;
  prepTimeInMinutes?: number;
  calculateTotals(): Promise<{
    totalPriceInCFA: number;
    totalPrepTimeInMinutes: number;
  }>;
}

const MealComboSchema = new Schema<IMealCombo>(
  {
    code: {
      type: String,
      unique: true,
      uppercase: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "restaurant_items",
        required: true,
      },
    ],
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "all"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    img: {
      type: String,
      required: true,
    },
    availableToday: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

async function generateComboCode(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await mongoose
    .model<IMealCombo>("meal_combos")
    .findOne({ code: new RegExp(`^${year}-\\d{4}$`) })
    .sort({ code: -1 })
    .lean();
  let next = 1;
  if (last?.code) {
    const seq = parseInt(last.code.split("-")[1], 10);
    next = seq + 1;
  }
  return `${year}-${String(next).padStart(4, "0")}`;
}

MealComboSchema.pre("validate", async function () {
  const combo = this as IMealCombo;

  if (combo.isNew && !combo.code) {
    combo.code = await generateComboCode();
  }

  const uniqueIds = [...new Set(combo.items.map((id) => id.toString()))];
  if (uniqueIds.length !== combo.items.length) {
    throw new Error("Duplicate items are not allowed");
  }

  const items = await RestaurantItemModel.find(
    { _id: { $in: combo.items } },
    { restaurant: 1 }
  ).lean();

  if (items.length !== combo.items.length) {
    throw new Error("One or more items do not exist");
  }
});

const applySupportDocTransformation = (docOrDocs: any) => {
  const baseUrl = process.env.FTP_BASE_URL;
  if (!baseUrl) {
    throw new AppError(
      "No ftp base url in config file.",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const transform = (doc: any) => {
    if (doc && doc.img && !doc.img.startsWith("https://")) {
      doc.img = baseUrl + doc.img;
    }
  };

  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(transform);
  } else {
    transform(docOrDocs);
  }
};

MealComboSchema.post("find", function (docs) {
  applySupportDocTransformation(docs);
});

MealComboSchema.post("findOne", function (doc) {
  applySupportDocTransformation(doc);
});

MealComboSchema.post("findOneAndUpdate", function (doc) {
  applySupportDocTransformation(doc);
});

MealComboSchema.post("findOneAndDelete", function (doc) {
  applySupportDocTransformation(doc);
});

// --- Emissions for RestaurantItem ---
MealComboSchema.post("save", async function (doc) {
  applySupportDocTransformation(doc);

  io.emit("mealCombo:new", doc);
});

MealComboSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  applySupportDocTransformation(doc);

  io.emit("mealCombo:update", doc);
});

MealComboSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  applySupportDocTransformation(doc);
  io.emit("mealCombo:deleted", { id: doc._id, ...doc.toObject() });
});

MealComboSchema.methods.calculateTotals = async function () {
  const combo = this as IMealCombo;

  const items = await RestaurantItemModel.find(
    { _id: { $in: combo.items } },
    { priceInCFA: 1, prepTimeInMinutes: 1 }
  ).lean();

  if (!items || items.length === 0) {
    return { totalPriceInCFA: 0, totalPrepTimeInMinutes: 0 };
  }

  const totalPriceInCFA = items.reduce(
    (sum, item) => sum + (item.priceInCFA || 0),
    0
  );

  const totalPrepTimeInMinutes = items.reduce(
    (sum, item) => sum + (item.prepTimeInMinutes || 0),
    0
  );

  return {
    totalPriceInCFA,
    totalPrepTimeInMinutes,
    itemsCount: items.length,
  };
};

export const MealComboModel = mongoose.model<IMealCombo>(
  "meal_combos",
  MealComboSchema
);
