import mongoose from "mongoose";
import { RoomModel } from "../models/Room.model";
import { ReservationModel } from "../models/Reservation.model";

type RoomEntry = {
  room: string; // Room ID
  checkIn: string | Date;
  checkOut: string | Date;
};

type ReservationItem = {
  roomType: string;
  rate: string;
  rooms: RoomEntry[];
};

type ValidationResult = {
  ok: boolean;
  invalidItems: {
    item: ReservationItem;
    reason: string;
    room?: string;
  }[];
};

export const validateReservationItemsAvailability = async (
  items: ReservationItem[]
): Promise<ValidationResult> => {
  const invalidItems: ValidationResult["invalidItems"] = [];

  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      invalidItems: [
        {
          item: { rooms: [], roomType: "", rate: "" },
          reason: "No reservation items provided.",
        },
      ],
    };
  }

  for (const item of items) {
    const { rooms } = item;

    if (!Array.isArray(rooms) || rooms.length === 0) {
      invalidItems.push({
        item,
        reason: "Each reservation item must have a non-empty rooms array.",
      });
      continue;
    }

    for (const entry of rooms) {
      const { room: roomId, checkIn, checkOut } = entry;

      if (!roomId || !checkIn || !checkOut) {
        invalidItems.push({
          item,
          reason:
            "Each room entry must have room, checkIn and checkOut fields.",
        });
        continue;
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        invalidItems.push({
          item,
          reason: "Invalid checkIn or checkOut date format.",
          room: roomId,
        });
        continue;
      }

      if (checkOutDate <= checkInDate) {
        invalidItems.push({
          item,
          reason: "checkOut date must be after checkIn date.",
          room: roomId,
        });
        continue;
      }

      const room = await RoomModel.findById(roomId);
      if (!room) {
        invalidItems.push({
          item,
          reason: `Room ID ${roomId} does not exist.`,
          room: roomId,
        });
        continue;
      }

      if (room.status !== "free") {
        invalidItems.push({
          item,
          reason: `Room ${room.number} is currently not free.`,
          room: roomId,
        });
        continue;
      }

      const conflictingReservations = await ReservationModel.find({
        status: "confirmed",
        "items.rooms.room": room._id,
      });

      for (const reservation of conflictingReservations) {
        console.log(reservation);
        for (const existingItem of reservation.items) {
          for (const existingEntry of existingItem.rooms) {
            if (
              !(existingEntry.room as mongoose.Types.ObjectId).equals(
                String(room._id)
              )
            )
              continue;

            const existingCheckIn = new Date(existingEntry.checkIn);
            const existingCheckOut = new Date(existingEntry.checkOut);

            const isOverlap =
              checkInDate < existingCheckOut && checkOutDate > existingCheckIn;

            if (isOverlap) {
              invalidItems.push({
                item,
                reason: `Room ${
                  room.number
                } is already reserved from ${existingCheckIn.toDateString()} to ${existingCheckOut.toDateString()}.`,
                room: room.number,
              });
              break;
            }
          }
        }
      }
    }
  }

  return {
    ok: invalidItems.length === 0,
    invalidItems,
  };
};
