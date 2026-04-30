import dayjs from "dayjs";

import { ParkingSpotModel } from "../../models/parking/ParkingSpot.model";
import { ParkingSectionModel } from "../../models/parking/ParkingSection.model";
import { ParkingReservationModel } from "../../models/parking/ParkingReservation.model";
import { BillItemModel } from "../../models/Finance/BillItem.model";

export async function computeParkingDashboard() {
  const today = dayjs().startOf("day");
  const tomorrow = today.add(1, "day");
  const last7Days = today.subtract(6, "day");

  // ─── SPOTS ───────────────────────────────────────────────
  const [
    totalSpots,
    availableSpots,
    reservedSpots,
    occupiedSpots,
    maintenanceSpots,
    disabledSpots,
  ] = await Promise.all([
    ParkingSpotModel.countDocuments({ isActive: true }),
    ParkingSpotModel.countDocuments({ isActive: true, status: "available" }),
    ParkingSpotModel.countDocuments({ isActive: true, status: "reserved" }),
    ParkingSpotModel.countDocuments({ isActive: true, status: "occupied" }),
    ParkingSpotModel.countDocuments({ isActive: true, status: "maintenance" }),
    ParkingSpotModel.countDocuments({ isActive: true, status: "disabled" }),
  ]);

  const occupancyRate =
    totalSpots === 0
      ? 0
      : Math.round(((occupiedSpots + reservedSpots) / totalSpots) * 100);

  // ─── SECTIONS BREAKDOWN ──────────────────────────────────
  const [totalSections, activeSections, sections] = await Promise.all([
    ParkingSectionModel.countDocuments({}),
    ParkingSectionModel.countDocuments({ isActive: true }),
    ParkingSectionModel.find({ isActive: true }).populate("type").lean(),
  ]);

  const sectionIds = sections.map((s) => s._id);

  const spotsBySection = await ParkingSpotModel.aggregate([
    { $match: { section: { $in: sectionIds }, isActive: true } },
    {
      $group: {
        _id: "$section",
        total: { $sum: 1 },
        occupied: {
          $sum: {
            $cond: [{ $in: ["$status", ["occupied", "reserved"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  const spotsBySectionMap = new Map(
    spotsBySection.map((s) => [s._id.toString(), s])
  );

  const sectionBreakdown = sections.map((section) => {
    const spotData = spotsBySectionMap.get(section._id.toString());
    return {
      name: section.name,
      type: (section.type as any)?.name ?? "Unknown",
      hourlyRateInCFA: (section.type as any)?.hourlyRateInCFA ?? 0,
      totalSpots: spotData?.total ?? 0,
      occupiedSpots: spotData?.occupied ?? 0,
    };
  });

  // ─── TODAY'S OPERATIONS ──────────────────────────────────
  const [
    activeReservations,
    expectedArrivals,
    completedCheckouts,
    noShows,
    cancellations,
  ] = await Promise.all([
    ParkingReservationModel.countDocuments({
      status: "active",
    }),
    ParkingReservationModel.countDocuments({
      status: "reserved",
      reservedFrom: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
    ParkingReservationModel.countDocuments({
      status: "completed",
      checkOutTime: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
    ParkingReservationModel.countDocuments({
      status: "no_show",
      reservedFrom: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
    ParkingReservationModel.countDocuments({
      status: "cancelled",
      updatedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
  ]);

  // ─── REVENUE ─────────────────────────────────────────────
  const allParkingBillItems = await BillItemModel.find({
    category: "parking_reservations",
  }).lean();

  const todayParkingBillItems = await BillItemModel.find({
    category: "parking_reservations",
    createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
  }).lean();

  const totalRevenue = allParkingBillItems.reduce((sum, item) => {
    const amt = Number(item.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const todayRevenue = todayParkingBillItems.reduce((sum, item) => {
    const amt = Number(item.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // ─── 7-DAY TREND ─────────────────────────────────────────
  const trendReservations = await ParkingReservationModel.find({
    createdAt: { $gte: last7Days.toDate() },
  }).lean();

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = last7Days.add(i, "day").format("YYYY-MM-DD");
    trendMap.set(date, 0);
  }

  trendReservations.forEach((r) => {
    const d = dayjs(r.createdAt).format("YYYY-MM-DD");
    if (trendMap.has(d)) trendMap.set(d, trendMap.get(d)! + 1);
  });

  const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
    date: dayjs(date).format("MMM D"),
    reservations: count,
  }));

  // ─── RESULT ──────────────────────────────────────────────
  return {
    spots: {
      total: totalSpots,
      available: availableSpots,
      reserved: reservedSpots,
      occupied: occupiedSpots,
      maintenance: maintenanceSpots,
      disabled: disabledSpots,
      occupancyRate,
    },
    sections: {
      total: totalSections,
      active: activeSections,
      breakdown: sectionBreakdown,
    },
    today: {
      activeReservations,
      expectedArrivals,
      completedCheckouts,
      noShows,
      cancellations,
    },
    revenue: {
      total: totalRevenue,
      today: todayRevenue,
    },
    trend,
  };
}
