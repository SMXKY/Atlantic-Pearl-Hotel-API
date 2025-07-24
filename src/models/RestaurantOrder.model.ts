import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantCartModel } from "./RestaurantCart.model";
import { GuestModel } from "./Guest.model";

export interface IRestaurantOrder {
  _id?: Types.ObjectId;
  cart: Types.ObjectId;
  guest: Types.ObjectId;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "delivering"
    | "delivered"
    | "cancelled";
  totalAmountInCFA: number; // in cents
  added_to_guest_bill: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantOrderSchema = new Schema<IRestaurantOrder>(
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
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "guests",
      required: true,
      validate: {
        validator: async function (guestId: mongoose.Schema.Types.ObjectId) {
          if (!guestId) return false;
          const exists = await GuestModel.exists({ _id: guestId });
          return exists !== null;
        },
        message: "Referenced guest_id does not exist.",
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "delivering",
        "delivered",
        "cancelled",
      ],
      required: true,
      default: "pending",
    },
    totalAmountInCFA: {
      type: Number,
      required: true,
      min: 0,
    },
    added_to_guest_bill: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const RestaurantOrderModel = model<IRestaurantOrder>(
  "restaurant_orders",
  RestaurantOrderSchema
);
