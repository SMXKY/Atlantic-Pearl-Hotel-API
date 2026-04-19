import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../util/catchAsync";
import dayjs from "dayjs";
import { ReservationModel } from "../../models/Reservations/Reservation.model";
import { RoomModel } from "../../models/Properties/Room.model";
import { ReservationStatusChangeModel } from "../../models/Reservations/ReservationStatusChange.model";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../../util/appResponder.util";
import { ParkingSpotModel } from "../../models/parking/ParkingSpot.model";
import { BillItemModel } from "../../models/Finance/BillItem.model";
import { computeReservationDashboard } from "../../util/computeReservationDashboard";

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
    const dashboard = await computeReservationDashboard();
    return appResponder(
      StatusCodes.OK,
      {
        reservationDashboard: dashboard,
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

export async function computeAdminDashboard() {
  const numberRooms = await RoomModel.countDocuments();
  const numberOfFreeRooms = await RoomModel.countDocuments({ status: "free" });
  const numberOfOccupiedRooms = await RoomModel.countDocuments({
    status: "occupied",
  });
  const occupancyRate =
    numberRooms === 0 ? 0 : (numberOfOccupiedRooms / numberRooms) * 100;

  const today = dayjs().startOf("day");
  const last7Days = dayjs().subtract(6, "day").startOf("day");

  const checkInLogs = await ReservationStatusChangeModel.find({
    statusChange: "checked in",
  }).lean();
  const todaysCheckIns = checkInLogs.filter((log) =>
    dayjs(log.createdAt).isSame(today, "day")
  ).length;

  const checkOutLogs = await ReservationStatusChangeModel.find({
    statusChange: "checked out",
  }).lean();
  const todaysCheckOuts = checkOutLogs.filter((log) =>
    dayjs(log.createdAt).isSame(today, "day")
  ).length;

  const futureReservations = await ReservationModel.find({
    status: "confirmed",
    checkInDate: { $gt: today.toDate() },
  }).lean();
  const roomsReserved = futureReservations.reduce(
    (sum, r) => sum + r.items.reduce((s2, item) => s2 + item.rooms.length, 0),
    0
  );

  const logsLast7 = await ReservationStatusChangeModel.find({
    createdAt: { $gte: last7Days.toDate() },
    statusChange: { $in: ["checked in", "checked out"] },
  }).lean();

  const analyticsMap = new Map<string, { checkin: number; checkout: number }>();
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

  return {
    overviewStats,
    analyticsData,
    occupancyRate: Math.round(occupancyRate),
  };
}

export const contentControllers = {
  dashboardAdmin,
  reservationDashboard,
  parkingDashboard,
};
