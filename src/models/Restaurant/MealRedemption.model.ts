import mongoose, { Schema, Document, Types } from "mongoose";
import { ReservationModel } from "../Reservations/Reservation.model";
import { MealComboModel } from "./MealCombo.model";
import { UserModel } from "../HR/User.model";
import { RoomModel } from "../Properties/Room.model";
import { Type } from "typescript";

export interface IMealRedemption extends Document {
  reservation: Types.ObjectId;
  combo: Types.ObjectId;
  mealType: "breakfast" | "lunch" | "dinner";
  redeemedAt: Date;
  redeemedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  room: Types.ObjectId;
  order: Types.ObjectId;
  charged: boolean;
}

const MealRedemptionSchema = new Schema<IMealRedemption>(
  {
    reservation: {
      type: Schema.Types.ObjectId,
      ref: "reservations",
      required: true,
    },
    combo: {
      type: Schema.Types.ObjectId,
      ref: "meal_combos",
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "rooms",
      required: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    redeemedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "restaurant_orders",
      required: true,
    },
    charged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

MealRedemptionSchema.index(
  {
    reservation: 1,
    mealType: 1,
    redeemedAt: 1,
  },
  {
    partialFilterExpression: {
      redeemedAt: { $type: "date" },
    },
  }
);

MealRedemptionSchema.pre("validate", async function (next) {
  const redemption = this as IMealRedemption;

  const [reservation, combo, user, room] = await Promise.all([
    ReservationModel.findById(redemption.reservation),
    MealComboModel.findById(redemption.combo).lean(),
    UserModel.findById(redemption.redeemedBy).lean(),
    RoomModel.findById(redemption.room),
  ]);

  if (!reservation) throw new Error("Reservation does not exist");
  if (!combo) throw new Error("MealCombo does not exist");
  if (!user) throw new Error("User does not exist");
  if (!room) throw new Error("User does not exist");

  if (reservation.status !== "checked in") {
    throw new Error("Only Active reservations can redeem a meal.");
  }

  if (!reservation.hasRoom(room._id)) {
    throw new Error("Room does not belong to the given reservation");
  }

  if (combo.mealType !== "all" && combo.mealType !== redemption.mealType) {
    throw new Error(`Combo is not available for ${redemption.mealType}`);
  }

  next();
});

export const MealRedemptionModel = mongoose.model<IMealRedemption>(
  "meal_redemptions",
  MealRedemptionSchema
);
