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
        validator: async (id: mongoose.Types.ObjectId) => {
          const exists = await mongoose.model("guests").exists({ _id: id });
          return exists !== null;
        },
        message: "Guest not found",
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
