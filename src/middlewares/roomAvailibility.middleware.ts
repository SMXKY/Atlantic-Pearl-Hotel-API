import { Request, Response, NextFunction } from "express";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ReservationModel } from "../models/Reservation.model";
import { RoomModel } from "../models/Room.model";
import { catchAsync } from "../util/catchAsync";
import mongoose from "mongoose";

export const validateReservationItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return next(
        new AppError("No reservation items provided.", StatusCodes.BAD_REQUEST)
      );
    }

    // Determine current reservation ID (for updates)
    const currentResId = req.params.id || req.body._id || null;
    const currentResObjectId =
      currentResId && mongoose.Types.ObjectId.isValid(currentResId)
        ? new mongoose.Types.ObjectId(currentResId)
        : null;

    for (const item of items) {
      if (!Array.isArray(item.rooms) || item.rooms.length === 0) {
        return next(
          new AppError(
            "Each reservation item must have a non-empty rooms array.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      for (const entry of item.rooms) {
        const { room: roomId, checkIn, checkOut } = entry;
        if (!roomId || !checkIn || !checkOut) {
          return next(
            new AppError(
              "Each room entry must have room, checkIn and checkOut fields.",
              StatusCodes.BAD_REQUEST
            )
          );
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (checkOutDate <= checkInDate) {
          return next(
            new AppError(
              "checkOut date must be after checkIn date.",
              StatusCodes.BAD_REQUEST
            )
          );
        }

        // Ensure room exists
        const room = await RoomModel.findById(roomId);
        if (!room) {
          return next(
            new AppError(
              `Room ID ${roomId} does not exist.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        // Check for conflicting reservations in one query, excluding the one being updated
        const conflict = await ReservationModel.findOne({
          status: { $in: ["pending", "confirmed"] },
          _id: currentResObjectId
            ? { $ne: currentResObjectId }
            : { $exists: true },
          "items.rooms": {
            $elemMatch: {
              room: room._id,
              checkIn: { $lt: checkOutDate },
              checkOut: { $gt: checkInDate },
            },
          },
        });

        if (conflict) {
          return next(
            new AppError(
              `Room ${room.number} is already reserved during the requested period.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }
      }
    }

    next();
  }
);
