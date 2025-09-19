import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantCartModel } from "./RestaurantCart.model";
import { GuestModel } from "./Guest.model";
import { ReservationModel } from "./Reservation.model";

export interface IRestaurantOrder {
  _id?: Types.ObjectId;
  cart: Types.ObjectId;
  guest: Types.ObjectId;
  reservation: Types.ObjectId;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "delivering"
    | "delivered"
    | "cancelled";
  totalAmountInCFA: number; // in cents
  addedToGuestBill: boolean;
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
      required: false,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "reservations",
      required: true,
      validate: {
        validator: async function (resId: mongoose.Schema.Types.ObjectId) {
          if (!resId) return false;
          const exists = await ReservationModel.findById(resId);
          return exists !== null;
        },
        message: "Referenced reservation_id does not exist.",
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
      default: "pending",
    },
    totalAmountInCFA: {
      type: Number,
      required: true,
      min: 0,
    },
    addedToGuestBill: {
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

RestaurantOrderSchema.virtual("items", {
  ref: "restaurant_cart_items", // model name of cart items
  localField: "cart", // field in order pointing to cart
  foreignField: "cart", // field in cart items pointing back
});

export const RestaurantOrderModel = model<IRestaurantOrder>(
  "restaurant_orders",
  RestaurantOrderSchema
);
