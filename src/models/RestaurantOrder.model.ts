import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantCartModel } from "./RestaurantCart.model";
import { GuestModel } from "./Guest.model";
import { ReservationModel } from "./Reservation.model";
import { io } from "../index";

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

async function populateRestaurantOrder(doc: any) {
  if (!doc) return null;

  await doc.populate([
    { path: "guest" },
    { path: "cart" },
    { path: "reservation" },
    { path: "items" },
  ]);

  return doc;
}

RestaurantOrderSchema.post("save", async function (doc) {
  try {
    const populatedDoc = await populateRestaurantOrder(doc);
    io.emit("restaurantOrder:new", populatedDoc);
  } catch (err) {
    console.error("Error emitting restaurantOrder:new:", err);
  }
});

RestaurantOrderSchema.post("findOneAndUpdate", async function (doc) {
  try {
    if (!doc) return;
    const populatedDoc = await populateRestaurantOrder(doc);
    io.emit("restaurantOrder:update", populatedDoc);
  } catch (err) {
    console.error("Error emitting restaurantOrder:update:", err);
  }
});

RestaurantOrderSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (!doc) return;
    const populatedDoc = await populateRestaurantOrder(doc);
    io.emit("restaurantOrder:delete", populatedDoc);
  } catch (err) {
    console.error("Error emitting restaurantOrder:delete:", err);
  }
});

export const RestaurantOrderModel = model<IRestaurantOrder>(
  "restaurant_orders",
  RestaurantOrderSchema
);
