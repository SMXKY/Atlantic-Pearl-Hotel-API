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

    const currentReservationId = req.params.id || req.body._id;

    // Flatten all room reservations to check overlaps in one pass
    const allRequestedRooms: {
      room: string;
      checkIn: Date;
      checkOut: Date;
    }[] = [];

    for (const item of items) {
      if (!Array.isArray(item.rooms) || item.rooms.length === 0) {
        return next(
          new AppError(
            "Each reservation item must have a non-empty rooms array.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      for (const { room: roomId, checkIn, checkOut } of item.rooms) {
        if (!roomId || !checkIn || !checkOut) {
          return next(
            new AppError(
              "Each room entry must include 'room', 'checkIn', and 'checkOut'.",
              StatusCodes.BAD_REQUEST
            )
          );
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (checkOutDate <= checkInDate) {
          return next(
            new AppError(
              `Invalid date range for room ${roomId}.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        allRequestedRooms.push({
          room: roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
        });
      }
    }

    // Get all rooms at once
    const roomIds = allRequestedRooms.map((r) => r.room);
    const uniqueRoomIds = [...new Set(roomIds.map((id) => id.toString()))];

    const rooms = await RoomModel.find({ _id: { $in: uniqueRoomIds } });
    const roomMap = new Map(rooms.map((room) => [room._id.toString(), room]));

    for (const { room: roomId, checkIn, checkOut } of allRequestedRooms) {
      const room = roomMap.get(roomId.toString());
      if (!room) {
        return next(
          new AppError(
            `Room ID ${roomId} does not exist.`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Check if the room is not free and not already reserved by this reservation
      const isCurrentlyReservedByThis = currentReservationId
        ? await ReservationModel.exists({
            _id: currentReservationId,
            "items.rooms.room": room._id,
          })
        : false;

      if (room.status !== "free" && !isCurrentlyReservedByThis) {
        return next(
          new AppError(
            `Room ${room.number} is currently not available.`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Check for date overlap with other reservations
      const overlappingReservations = await ReservationModel.find({
        _id: { $ne: currentReservationId },
        status: { $in: ["pending", "confirmed"] },
        "items.rooms.room": room._id,
        "items.rooms": {
          $elemMatch: {
            room: room._id,
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn },
          },
        },
      });

      if (overlappingReservations.length > 0) {
        const conflicting = overlappingReservations[0];
        const conflictDates = conflicting.items
          .flatMap((item) => item.rooms)
          .find(
            (r) =>
              r.room.toString() === room._id.toString() &&
              new Date(r.checkIn) < checkOut &&
              new Date(r.checkOut) > checkIn
          );

        if (conflictDates) {
          return next(
            new AppError(
              `Room ${room.number} is already reserved from ${new Date(
                conflictDates.checkIn
              ).toDateString()} to ${new Date(
                conflictDates.checkOut
              ).toDateString()}.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }
      }
    }

    next();
  }
);
