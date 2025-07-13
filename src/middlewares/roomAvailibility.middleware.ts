import { Request, Response, NextFunction } from "express";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ReservationModel } from "../models/Reservation.model";
import { RoomModel } from "../models/Room.model";
import { catchAsync } from "../util/catchAsync";
import * as mongoose from "mongoose";

export const validateReservationItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return next(
        new AppError("No reservation items provided.", StatusCodes.BAD_REQUEST)
      );
    }

    // Determine the ID of the reservation being updated:
    // PATCH /reservations/:id  →  req.params.id
    // fallback to req.body._id if you embed it there
    const currentResId = req.params.id || req.body._id;

    for (const item of items) {
      const { rooms } = item;
      if (!Array.isArray(rooms) || rooms.length === 0) {
        return next(
          new AppError(
            "Each reservation item must have a non-empty rooms array.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      for (const entry of rooms) {
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

        // 1. Ensure room exists and is free
        const room = await RoomModel.findById(roomId);
        if (!room) {
          return next(
            new AppError(
              `Room ID ${roomId} does not exist.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }
        if (room.status !== "free") {
          return next(
            new AppError(
              `Room ${room.number} is currently not free.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        // 2. Find confirmed reservations that include this room
        const conflictingReservations = await ReservationModel.find({
          status: "confirmed",
          "items.rooms.room": room._id,
        });

        // 3. For each, check for date overlap—skip the current reservation itself
        for (const reservation of conflictingReservations) {
          // skip if this is the one being updated
          if (
            currentResId &&
            reservation._id.toString() === currentResId.toString()
          ) {
            continue;
          }

          for (const existingItem of reservation.items) {
            for (const existingEntry of existingItem.rooms) {
              if (
                !(existingEntry.room as mongoose.Types.ObjectId).equals(
                  room._id as mongoose.Types.ObjectId
                )
              )
                continue;

              const existingCheckIn = new Date(existingEntry.checkIn);
              const existingCheckOut = new Date(existingEntry.checkOut);

              // overlap: requestStart < existingEnd && requestEnd > existingStart
              if (
                checkInDate < existingCheckOut &&
                checkOutDate > existingCheckIn
              ) {
                return next(
                  new AppError(
                    `Room ${
                      room.number
                    } is already reserved from ${existingCheckIn.toDateString()} to ${existingCheckOut.toDateString()}.`,
                    StatusCodes.BAD_REQUEST
                  )
                );
              }
            }
          }
        }
      }
    }

    next();
  }
);
