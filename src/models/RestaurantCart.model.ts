import mongoose, { Schema, model, Types } from "mongoose";
import { GuestModel } from "./Guest.model";
import { ReservationModel } from "./Reservation.model";

export interface IRestaurantCart {
  _id?: Types.ObjectId;
  guest: Types.ObjectId;
  status: "cart" | "placed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
  cartItems: any;
  reservation: Types.ObjectId;
}

const RestaurantCartSchema = new Schema<IRestaurantCart>(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          const exists = await mongoose.model("guests").exists({ _id: id });
          return exists !== null;
        },
        message: "Guest not found",
      },
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "reservations",
      required: false,
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

RestaurantCartSchema.virtual("cartItems", {
  ref: "restaurant_cart_items",
  localField: "_id",
  foreignField: "cart",
});

export const RestaurantCartModel = model<IRestaurantCart>(
  "restaurant_carts",
  RestaurantCartSchema
);
