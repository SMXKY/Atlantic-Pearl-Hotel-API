import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../util/catchAsync";
import dayjs from "dayjs";
import { ReservationModel } from "../models/Reservation.model";
import { RoomModel } from "../models/Room.model";
import { ReservationStatusChangeModel } from "../models/ReservationStatusChange.model";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../util/appResponder.util";
import { ParkingSpotModel } from "../models/ParkingSpot.model";
import { BillItemModel } from "../models/BillItem.model";

const dashboardAdmin = catchAsync(
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

    // 1. Check‑in logs
    const checkInLogs = await ReservationStatusChangeModel.find({
      statusChange: "checked in",
    }).lean();
    const todaysCheckIns = checkInLogs.filter((log) =>
      dayjs(log.createdAt).isSame(today, "day")
    ).length;

    // 2. Check‑out logs
    const checkOutLogs = await ReservationStatusChangeModel.find({
      statusChange: "checked out",
    }).lean();
    const todaysCheckOuts = checkOutLogs.filter((log) =>
      dayjs(log.createdAt).isSame(today, "day")
    ).length;

    // 3. Rooms reserved (confirmed with future check-in)
    const futureReservations = await ReservationModel.find({
      status: "confirmed",
      checkInDate: { $gt: today.toDate() },
    }).lean();
    const roomsReserved = futureReservations.reduce(
      (sum, r) => sum + r.items.reduce((s2, item) => s2 + item.rooms.length, 0),
      0
    );

    // 5. Build analyticsData from status‑change logs over last 7 days
    const logsLast7 = await ReservationStatusChangeModel.find({
      createdAt: { $gte: last7Days.toDate() },
      statusChange: { $in: ["checked in", "checked out"] },
    }).lean();

    const analyticsMap = new Map<
      string,
      { checkin: number; checkout: number }
    >();
    for (let i = 0; i < 7; i++) {
      const date = last7Days.add(i, "day").format("YYYY-MM-DD");
      analyticsMap.set(date, { checkin: 0, checkout: 0 });
    }
    logsLast7.forEach((log) => {
      const d = dayjs(log.createdAt).format("YYYY-MM-DD");
      if (!analyticsMap.has(d)) return;
      const bucket = analyticsMap.get(d)!;
      if (log.statusChange === "checked in") bucket.checkin++;
      else if (log.statusChange === "checked out") bucket.checkout++;
    });
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
        percentage: 0,
        trend: "up",
        bgColor: "bg-success-400",
        bgColorMute: "bg-success-100",
        duration: "Last 7 days",
      },
      {
        title: "Today's Check Out",
        value: todaysCheckOuts,
        percentage: 0,
        trend: "down",
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
        duration: "Future",
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
        percentage: 0,
        trend: "down",
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

export const reservationDashboard = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Define our date ranges
    const todayEnd = dayjs().endOf("day").toDate();
    const last30Start = dayjs().subtract(30, "day").startOf("day").toDate();
    const prev30Start = dayjs().subtract(60, "day").startOf("day").toDate();

    const last7Start = dayjs().subtract(7, "day").startOf("day").toDate();
    const prev7Start = dayjs().subtract(14, "day").startOf("day").toDate();

    // 1. Checked‑in logs in last 30 days
    const checkInCount30 = await ReservationStatusChangeModel.countDocuments({
      statusChange: "checked in",
      createdAt: { $gte: last30Start, $lte: todayEnd },
    });
    // Prev 30‑day count for trend
    const prevCheckIn30 = await ReservationStatusChangeModel.countDocuments({
      statusChange: "checked in",
      createdAt: { $gte: prev30Start, $lt: last30Start },
    });
    let checkedInPct30: number;
    if (prevCheckIn30 === 0 && checkInCount30 > 0) {
      checkedInPct30 = 100;
    } else if (prevCheckIn30 === 0) {
      checkedInPct30 = 0;
    } else {
      checkedInPct30 = Math.round(
        ((checkInCount30 - prevCheckIn30) / prevCheckIn30) * 100
      );
    }

    // 2. Checked‑out logs in last 7 days
    const checkOutCount7 = await ReservationStatusChangeModel.countDocuments({
      statusChange: "checked out",
      createdAt: { $gte: last7Start, $lte: todayEnd },
    });
    // Prev 7‑day count for trend
    const prevCheckOut7 = await ReservationStatusChangeModel.countDocuments({
      statusChange: "checked out",
      createdAt: { $gte: prev7Start, $lt: last7Start },
    });
    let checkedOutPct7: number;
    if (prevCheckOut7 === 0 && checkOutCount7 > 0) {
      checkedOutPct7 = 100;
    } else if (prevCheckOut7 === 0) {
      checkedOutPct7 = 0;
    } else {
      checkedOutPct7 = Math.round(
        ((checkOutCount7 - prevCheckOut7) / prevCheckOut7) * 100
      );
    }

    // 3. Total new reservations in last 30 days
    const totalRes30 = await ReservationModel.countDocuments({
      createdAt: { $gte: last30Start, $lte: todayEnd },
    });
    // Prev 30‑day total for trend
    const prevTotalRes30 = await ReservationModel.countDocuments({
      createdAt: { $gte: prev30Start, $lt: last30Start },
    });
    let totalResPct30: number;
    if (prevTotalRes30 === 0 && totalRes30 > 0) {
      totalResPct30 = 100;
    } else if (prevTotalRes30 === 0) {
      totalResPct30 = 0;
    } else {
      totalResPct30 = Math.round(
        ((totalRes30 - prevTotalRes30) / prevTotalRes30) * 100
      );
    }

    // 4. Percentage of status‑change logs that are “checked in” over last 30 days
    const totalLogs30 = await ReservationStatusChangeModel.countDocuments({
      statusChange: { $in: ["checked in", "checked out"] },
      createdAt: { $gte: last30Start, $lte: todayEnd },
    });
    const percentCheckedInLogs =
      totalLogs30 === 0 ? 0 : Math.round((checkInCount30 / totalLogs30) * 100);

    return appResponder(
      StatusCodes.OK,
      {
        reservationDashboard: {
          checkedInCount: checkInCount30,
          checkedInPercentage: checkedInPct30,
          checkedOutCount: checkOutCount7,
          checkedOutPercentage: checkedOutPct7,
          totalReservationsCount: totalRes30,
          totalReservationsPercentage: totalResPct30,
          percentCheckedInLogs: percentCheckedInLogs,
        },
      },
      res
    );
  }
);

const parkingDashboard = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const parkingSpots = await ParkingSpotModel.countDocuments({});

    const availableParkingSpots = await ParkingSpotModel.countDocuments({
      status: "available",
    });

    const occupiedParkingSpots = await ParkingSpotModel.countDocuments({
      status: { $in: ["reserved", "occupied"] },
    });

    // Use valid enum value defined in BillItemModel
    const parkingBillItems = await BillItemModel.find({
      category: "parking_reservations",
    });

    let amountMadeOnParking = 0;

    parkingBillItems.forEach((item) => {
      const amt = Number(item.amount);
      if (!isNaN(amt)) amountMadeOnParking += amt;
    });

    appResponder(
      StatusCodes.OK,
      {
        numberOfParkingSpots: parkingSpots,
        numberOfAvailableParkingSpots: availableParkingSpots,
        numberOfOccupiedParkingSpots: occupiedParkingSpots,
        amountMadeInParking: amountMadeOnParking,
      },
      res
    );
  }
);

export const contentControllers = {
  dashboardAdmin,
  reservationDashboard,
  parkingDashboard,
};
