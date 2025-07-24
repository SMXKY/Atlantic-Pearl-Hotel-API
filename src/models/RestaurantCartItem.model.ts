import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantCartModel } from "./RestaurantCart.model";
import { RestaurantItemModel } from "./RestaurantItem.model";

export interface IRestaurantCartItem {
  _id?: Types.ObjectId;
  cart: Types.ObjectId;
  item: Types.ObjectId;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  prep_time_snapshot: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantCartItemSchema = new Schema<IRestaurantCartItem>(
  {
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant_carts",
      required: true,
      validate: {
        validator: async function (cartId: mongoose.Schema.Types.ObjectId) {
          if (!cartId) return false;
          const exists = await RestaurantCartModel.exists({ _id: cartId });
          return exists !== null;
        },
        message: "Referenced cart_id does not exist.",
      },
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant_items",
      required: true,
      validate: {
        validator: async function (itemId: Types.ObjectId) {
          if (!itemId) return false;
          const exists = await RestaurantItemModel.exists({ _id: itemId });
          return exists !== null;
        },
        message: "Referenced item_id does not exist.",
      },
    },
    name_snapshot: {
      type: String,
      required: true,
      trim: true,
    },
    price_snapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    prep_time_snapshot: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const RestaurantCartItemModel = model<IRestaurantCartItem>(
  "restaurant_cart_items",
  RestaurantCartItemSchema
);
