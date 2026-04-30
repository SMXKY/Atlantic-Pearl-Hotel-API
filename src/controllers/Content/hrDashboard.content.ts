import dayjs from "dayjs";
import { EmployeeModel } from "../../models/HR/Employee.model";
import { DepartmentModel } from "../../models/HR/Department.model";
import { PositionModel } from "../../models/HR/Position.model";
import { UserModel } from "../../models/HR/User.model";
import { GuestModel } from "../../models/HR/Guest.model";
import { ActivityLogModel } from "../../models/Logs/ActivityLog.model";

export async function computeHRDashboard() {
  const today = dayjs().startOf("day");
  const tomorrow = today.add(1, "day");
  const last7Days = today.subtract(6, "day");
  const last30Days = today.subtract(30, "day");

  // ─── WORKFORCE OVERVIEW ───────────────────────────────────
  const [totalEmployees, totalDepartments, totalPositions, inactiveUsers] =
    await Promise.all([
      EmployeeModel.countDocuments({}),
      DepartmentModel.countDocuments({ isActive: true }),
      PositionModel.countDocuments({}),
      UserModel.countDocuments({ isActive: false, includeInactive: true }),
    ]);

  // ─── EMPLOYMENT TYPE BREAKDOWN ────────────────────────────
  const employmentTypeBreakdown = await EmployeeModel.aggregate([
    {
      $group: {
        _id: "$employmentType",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        type: { $ifNull: ["$_id", "Unspecified"] },
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  // ─── DEPARTMENT HEADCOUNT ─────────────────────────────────
  const departmentHeadcount = await EmployeeModel.aggregate([
    { $match: { department: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "departmentDoc",
      },
    },
    {
      $project: {
        _id: 0,
        departmentId: "$_id",
        department: { $arrayElemAt: ["$departmentDoc.name", 0] },
        headcount: "$count",
      },
    },
    { $sort: { headcount: -1 } },
  ]);

  // ─── GENDER BREAKDOWN ─────────────────────────────────────
  const genderBreakdown = await UserModel.aggregate([
    { $match: { userType: "Employee" } },
    {
      $group: {
        _id: "$gender",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        gender: "$_id",
        count: 1,
      },
    },
  ]);

  // ─── RECENT HIRES (last 30 days) ──────────────────────────
  const recentHires = await EmployeeModel.aggregate([
    {
      $match: {
        dateHired: { $gte: last30Days.toDate() },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "departmentDoc",
      },
    },
    {
      $lookup: {
        from: "positions",
        localField: "position",
        foreignField: "_id",
        as: "positionDoc",
      },
    },
    {
      $project: {
        _id: 0,
        name: { $arrayElemAt: ["$userDoc.name", 0] },
        email: { $arrayElemAt: ["$userDoc.email", 0] },
        department: { $arrayElemAt: ["$departmentDoc.name", 0] },
        position: { $arrayElemAt: ["$positionDoc.name", 0] },
        employmentType: 1,
        dateHired: 1,
      },
    },
    { $sort: { dateHired: -1 } },
    { $limit: 10 },
  ]);

  // ─── GUEST OVERVIEW ───────────────────────────────────────
  const [totalGuests, guestTypeBreakdown] = await Promise.all([
    GuestModel.countDocuments({}),
    GuestModel.aggregate([
      {
        $group: {
          _id: "$guestType",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  // ─── ACTIVITY LOG ─────────────────────────────────────────
  const [todayActivityCount, recentActivityByCollection] = await Promise.all([
    ActivityLogModel.countDocuments({
      createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
    ActivityLogModel.aggregate([
      { $match: { createdAt: { $gte: last7Days.toDate() } } },
      {
        $group: {
          _id: "$collectionName",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          collection: "$_id",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  // ─── 7-DAY ACTIVITY TREND ─────────────────────────────────
  const activityLast7 = await ActivityLogModel.find(
    { createdAt: { $gte: last7Days.toDate() } },
    { createdAt: 1 }
  ).lean();

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    trendMap.set(last7Days.add(i, "day").format("YYYY-MM-DD"), 0);
  }
  activityLast7.forEach((log) => {
    const d = dayjs(log.createdAt).format("YYYY-MM-DD");
    if (trendMap.has(d)) trendMap.set(d, trendMap.get(d)! + 1);
  });

  const activityTrend = Array.from(trendMap.entries()).map(([date, count]) => ({
    date: dayjs(date).format("MMM D"),
    actions: count,
  }));

  // ─── RESULT ───────────────────────────────────────────────
  return {
    workforce: {
      totalEmployees,
      totalDepartments,
      totalPositions,
      inactiveAccounts: inactiveUsers,
      employmentTypeBreakdown,
      departmentHeadcount,
      genderBreakdown,
    },
    recentHires: {
      count: recentHires.length,
      employees: recentHires,
    },
    guests: {
      total: totalGuests,
      byType: guestTypeBreakdown,
    },
    activity: {
      today: todayActivityCount,
      byCollection: recentActivityByCollection,
      trend: activityTrend,
    },
  };
}
