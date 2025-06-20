import { catchAsync } from "../util/catchAsync";
import { RoomModel } from "../models/Room.model";
import { NextFunction, Request, Response } from "express";
import { ReservationModel } from "../models/Reservation.model";

const dashboardAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const numberRooms = await RoomModel.countDocuments();
    const numberOfFreeRooms = await RoomModel.countDocuments({
      status: "free",
    });
    const reservations = await ReservationModel.find({ status: "confirmed" });

    let roomsReserved = 0;

    reservations.forEach((resevation) => {
      roomsReserved += resevation.items.length;
    });
  }
);

export const contentControllers = {
  dashboardAdmin,
};
