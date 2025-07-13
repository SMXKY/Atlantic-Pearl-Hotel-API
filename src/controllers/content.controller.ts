import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../util/catchAsync";
import dayjs from "dayjs";
import { ReservationModel } from "../models/Reservation.model";
import { RoomModel } from "../models/Room.model";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../util/appResponder.util";

export const dashboardAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const numberRooms = await RoomModel.countDocuments();
    const numberOfFreeRooms = await RoomModel.countDocuments({
      status: "free",
    });
    const numberOfOccupiedRooms = await RoomModel.countDocuments({
      status: "occupied",
    });

    const occupancyRate =
      numberRooms === 0 ? 0 : (numberOfOccupiedRooms / numberRooms) * 100;

    const today = dayjs().startOf("day");
    const last7Days = dayjs().subtract(6, "day").startOf("day");

    const reservations = await ReservationModel.find({
      createdAt: { $gte: last7Days.toDate() },
      status: { $in: ["confirmed", "checked in"] },
    });

    let roomsReserved = 0;
    let todaysCheckIns = 0;
    let todaysCheckOuts = 0;

    const analyticsMap = new Map<
      string,
      { checkin: number; checkout: number }
    >();

    for (let i = 0; i < 7; i++) {
      const date = last7Days.add(i, "day").format("YYYY-MM-DD");
      analyticsMap.set(date, { checkin: 0, checkout: 0 });
    }

    reservations.forEach((reservation) => {
      const checkIn = dayjs(reservation.checkInDate).format("YYYY-MM-DD");
      const checkOut = dayjs(reservation.checkOutDate).format("YYYY-MM-DD");

      if (analyticsMap.has(checkIn)) {
        analyticsMap.get(checkIn)!.checkin += 1;
      }
      if (analyticsMap.has(checkOut)) {
        analyticsMap.get(checkOut)!.checkout += 1;
      }

      if (dayjs(reservation.checkInDate).isSame(today, "day")) {
        todaysCheckIns += 1;
      }
      if (dayjs(reservation.checkOutDate).isSame(today, "day")) {
        todaysCheckOuts += 1;
      }

      roomsReserved += reservation.items?.length || 0;
    });

    const totalCheckIns7Days = Array.from(analyticsMap.values()).reduce(
      (acc, curr) => acc + curr.checkin,
      0
    );
    const totalCheckOuts7Days = Array.from(analyticsMap.values()).reduce(
      (acc, curr) => acc + curr.checkout,
      0
    );

    const percent = (todayCount: number, total: number) => {
      if (total === 0) return 0;
      const avg = total / 7;
      return Math.round(((todayCount - avg) / avg) * 100);
    };

    const checkInPercent = percent(todaysCheckIns, totalCheckIns7Days);
    const checkOutPercent = percent(todaysCheckOuts, totalCheckOuts7Days);
    const roomsAvailablePercent = percent(numberOfFreeRooms, numberRooms);

    const analyticsData = Array.from(analyticsMap.entries()).map(
      ([date, stats]) => ({
        date: dayjs(date).format("MMM D"),
        checkin: stats.checkin,
        checkout: stats.checkout,
      })
    );

    const overviewStats = [
      {
        title: "Today's Check In",
        value: todaysCheckIns,
        percentage: Math.abs(checkInPercent),
        trend: checkInPercent >= 0 ? "up" : "down",
        bgColor: "bg-success-400",
        bgColorMute: "bg-success-100",
        duration: "Last 7 days",
      },
      {
        title: "Today's Check Out",
        value: todaysCheckOuts,
        percentage: Math.abs(checkOutPercent),
        trend: checkOutPercent >= 0 ? "up" : "down",
        bgColor: "bg-danger-400",
        bgColorMute: "bg-danger-100",
        duration: "Last 7 days",
      },
      {
        title: "Room's Reserved",
        value: roomsReserved,
        percentage: 0,
        trend: "up",
        bgColor: "bg-warning-400",
        bgColorMute: "bg-warning-100",
        duration: "Today",
      },
      {
        title: "Room's Occupied",
        value: numberOfOccupiedRooms,
        percentage: 0,
        trend: "up",
        bgColor: "bg-dark-400",
        bgColorMute: "bg-dark-100",
        duration: "Today",
      },
      {
        title: "Room's Available",
        value: numberOfFreeRooms,
        percentage: Math.abs(roomsAvailablePercent),
        trend: roomsAvailablePercent >= 0 ? "up" : "down",
        bgColor: "bg-primary-400",
        bgColorMute: "bg-primary-100",
        duration: "Today",
      },
    ];

    return appResponder(
      StatusCodes.OK,
      {
        overviewStats,
        analyticsData,
        occupancyRate: Math.round(occupancyRate),
      },
      res
    );
  }
);

export const contentControllers = {
  dashboardAdmin,
};
