import * as mongoose from "mongoose";
import { RoomModel } from "./Room.model";
import { ReservationModel } from "./Reservation.model";
import { autoFilterInactive } from "util/filterIsActive";
import { AppError } from "util/AppError.util";
import { StatusCodes } from "http-status-codes";

const roomReservationSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Types.ObjectId,
      ref: "rooms",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await RoomModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid room Id.",
      },
    },
    reservation: {
      type: mongoose.Types.ObjectId,
      ref: "reservations",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await ReservationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid reservation Id.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

roomReservationSchema.pre(/^find/, autoFilterInactive);

roomReservationSchema.pre("save", async function (next) {
  const room = await RoomModel.findById(this.room);

  if (!room) {
    throw new AppError(
      "No such room Id in the database.",
      StatusCodes.BAD_REQUEST
    );
  }

  if (room.status !== "free") {
    throw new AppError(
      "Room is currently not free, and cannot be reserved for a guest.",
      StatusCodes.BAD_REQUEST
    );
  }

  next();
});

roomReservationSchema.post("save", async function () {
  try {
    if (!this.room) return;

    await RoomModel.findByIdAndUpdate(
      this.room,
      { status: "reserved" },
      { new: true, runValidators: true }
    );
  } catch (err) {
    console.error("Failed to update room status after reservation save:", err);
  }
});

export const RoomReservationModel = mongoose.model(
  "room_reservations",
  roomReservationSchema
);
