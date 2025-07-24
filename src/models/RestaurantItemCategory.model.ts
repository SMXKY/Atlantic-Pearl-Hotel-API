import mongoose, { Schema, model, Types } from "mongoose";

export interface IRestaurantItemCategory {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantItemCategorySchema = new Schema<IRestaurantItemCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const RestaurantItemCategoryModel = model<IRestaurantItemCategory>(
  "restaurant_item_categories",
  RestaurantItemCategorySchema
);
