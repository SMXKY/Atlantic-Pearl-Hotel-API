import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantCartModel } from "../Restaurant/RestaurantCart.model";

export interface IRestaurantCartItem {
  _id?: Types.ObjectId;
  cart: Types.ObjectId;

  referenceId: Types.ObjectId; // dynamic reference
  itemType: "restaurant_items" | "restaurant_combos"; // scalable enum

  name_snapshot: string;
  priceSnapShotInCFA: number;
  quantity: number;
  prepTimeSnapshot: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantCartItemSchema = new Schema<IRestaurantCartItem>(
  {
    cart: {
      type: Schema.Types.ObjectId,
      ref: "restaurant_carts",
      required: true,
      validate: {
        validator: async function (cartId: Types.ObjectId): Promise<boolean> {
          if (!cartId) return false;
          const exists = await RestaurantCartModel.exists({ _id: cartId });
          return exists !== null;
        },
        message: "Referenced cart_id does not exist.",
      } as any,
    },

    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "itemType",
    },

    itemType: {
      type: String,
      required: true,
      enum: ["restaurant_items", "restaurant_combos"],
    },

    name_snapshot: { type: String, required: true, trim: true },
    priceSnapShotInCFA: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    prepTimeSnapshot: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// Indexes for speed
RestaurantCartItemSchema.index({ cart: 1 });
RestaurantCartItemSchema.index({ itemType: 1, referenceId: 1 });

export const RestaurantCartItemModel = model<IRestaurantCartItem>(
  "restaurant_cart_items",
  RestaurantCartItemSchema
);
