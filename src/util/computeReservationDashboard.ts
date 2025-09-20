import dayjs from "dayjs";
import { ReservationModel } from "../models/Reservation.model";
import { ReservationStatusChangeModel } from "../models/ReservationStatusChange.model";

export const computeReservationDashboard = async () => {
  const todayEnd = dayjs().endOf("day").toDate();
  const last30Start = dayjs().subtract(30, "day").startOf("day").toDate();
  const prev30Start = dayjs().subtract(60, "day").startOf("day").toDate();

  const last7Start = dayjs().subtract(7, "day").startOf("day").toDate();
  const prev7Start = dayjs().subtract(14, "day").startOf("day").toDate();

  // Checked‑in logs in last 30 days
  const checkInCount30 = await ReservationStatusChangeModel.countDocuments({
    statusChange: "checked in",
    createdAt: { $gte: last30Start, $lte: todayEnd },
  });
  const prevCheckIn30 = await ReservationStatusChangeModel.countDocuments({
    statusChange: "checked in",
    createdAt: { $gte: prev30Start, $lt: last30Start },
  });
  const checkedInPct30 =
    prevCheckIn30 === 0
      ? checkInCount30 > 0
        ? 100
        : 0
      : Math.round(((checkInCount30 - prevCheckIn30) / prevCheckIn30) * 100);

  // Checked‑out logs in last 7 days
  const checkOutCount7 = await ReservationStatusChangeModel.countDocuments({
    statusChange: "checked out",
    createdAt: { $gte: last7Start, $lte: todayEnd },
  });
  const prevCheckOut7 = await ReservationStatusChangeModel.countDocuments({
    statusChange: "checked out",
    createdAt: { $gte: prev7Start, $lt: last7Start },
  });
  const checkedOutPct7 =
    prevCheckOut7 === 0
      ? checkOutCount7 > 0
        ? 100
        : 0
      : Math.round(((checkOutCount7 - prevCheckOut7) / prevCheckOut7) * 100);

  // Total reservations in last 30 days
  const totalRes30 = await ReservationModel.countDocuments({
    createdAt: { $gte: last30Start, $lte: todayEnd },
  });
  const prevTotalRes30 = await ReservationModel.countDocuments({
    createdAt: { $gte: prev30Start, $lt: last30Start },
  });
  const totalResPct30 =
    prevTotalRes30 === 0
      ? totalRes30 > 0
        ? 100
        : 0
      : Math.round(((totalRes30 - prevTotalRes30) / prevTotalRes30) * 100);

  // Percent of status-change logs that are "checked in"
  const totalLogs30 = await ReservationStatusChangeModel.countDocuments({
    statusChange: { $in: ["checked in", "checked out"] },
    createdAt: { $gte: last30Start, $lte: todayEnd },
  });
  const percentCheckedInLogs =
    totalLogs30 === 0 ? 0 : Math.round((checkInCount30 / totalLogs30) * 100);

  return {
    checkedInCount: checkInCount30,
    checkedInPercentage: checkedInPct30,
    checkedOutCount: checkOutCount7,
    checkedOutPercentage: checkedOutPct7,
    totalReservationsCount: totalRes30,
    totalReservationsPercentage: totalResPct30,
    percentCheckedInLogs,
  };
};
