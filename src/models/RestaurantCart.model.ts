import mongoose, { Schema, model, Types } from "mongoose";
import { GuestModel } from "./Guest.model";

export interface IRestaurantCart {
  _id?: Types.ObjectId;
  guest: Types.ObjectId;
  status: "cart" | "placed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantCartSchema = new Schema<IRestaurantCart>(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "guests",
      required: true,
      validate: {
        validator: async function (userId: Types.ObjectId) {
          if (!userId) return false;
          const exists = await GuestModel.exists({ _id: userId });
          return exists !== null;
        },
        message: "Referenced guest_id does not exist.",
      },
    },
    status: {
      type: String,
      enum: ["cart", "placed", "cancelled"],
      required: true,
      default: "cart",
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const RestaurantCartModel = model<IRestaurantCart>(
  "restaurant_carts",
  RestaurantCartSchema
);
