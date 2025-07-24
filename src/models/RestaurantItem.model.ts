import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantItemCategoryModel } from "./RestaurantItemCategory.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";

export interface IRestaurantItem {
  _id?: Types.ObjectId;
  name: string;
  type: "food" | "drink";
  category?: Types.ObjectId | null;
  imageUrl: string;
  description?: string;
  priceInCFA: number;
  prepTimeInMinutes: number;
  isAvailable: boolean;
  availableToday: boolean;
  isPerishable: boolean;
  stock?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantItemSchema = new Schema<IRestaurantItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["food", "drink"],
      required: true,
    },
    category: {
      type: Types.ObjectId,
      ref: "restaurant_item_categories",
      default: null,
      validate: {
        validator: async function (categoryId: Types.ObjectId | null) {
          if (!categoryId) return true;

          const exists = await RestaurantItemCategoryModel.exists({
            _id: categoryId,
          });
          return exists !== null;
        },
        message: "Referenced categoryId does not exist.",
      },
      required: [true, "Restaurant Itme category is required."],
    },
    imageUrl: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    priceInCFA: {
      type: Number,
      required: true,
      min: 0,
    },
    prepTimeInMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    availableToday: {
      type: Boolean,
      default: false,
    },
    isPerishable: {
      type: Boolean,
      required: true,
    },
    stock: {
      type: Number,
      default: null,
      validate: {
        validator: function (this: IRestaurantItem, value: number | null) {
          // stock only tracked for non-perishable items
          return this.isPerishable === false || value === null;
        },
        message: "Stock is only tracked for non-perishable items.",
      },
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

const applySupportDocTransformation = (docOrDocs: any) => {
  const baseUrl = process.env.FTP_BASE_URL;
  if (!baseUrl) {
    throw new AppError(
      "No ftp base url in config file.",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const transform = (doc: any) => {
    if (doc && doc.imageUrl && !doc.imageUrl.startsWith("https://")) {
      doc.imageUrl = baseUrl + doc.imageUrl;
    }
  };

  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(transform);
  } else {
    transform(docOrDocs);
  }
};

RestaurantItemSchema.post("find", function (docs) {
  applySupportDocTransformation(docs);
});

RestaurantItemSchema.post("findOne", function (doc) {
  applySupportDocTransformation(doc);
});

RestaurantItemSchema.post("findOneAndUpdate", function (doc) {
  applySupportDocTransformation(doc);
});

RestaurantItemSchema.post("findOneAndDelete", function (doc) {
  applySupportDocTransformation(doc);
});

RestaurantItemSchema.index({ type: 1, isAvailable: 1, availableToday: 1 });

export const RestaurantItemModel = model<IRestaurantItem>(
  "restaurant_items",
  RestaurantItemSchema
);
