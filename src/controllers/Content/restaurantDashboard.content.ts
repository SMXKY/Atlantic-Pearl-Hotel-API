import dayjs from "dayjs";
import { RestaurantOrderModel } from "../../models/Restaurant/RestaurantOrder.model";
import { RestaurantItemModel } from "../../models/Restaurant/RestaurantItem.model";
import { MealComboModel } from "../../models/Restaurant/MealCombo.model";
import { MealRedemptionModel } from "../../models/Restaurant/MealRedemption.model";
import { RestaurantConfigModel } from "../../models/Restaurant/RestaurantConfig.model";

export async function computeRestaurantDashboard() {
  const today = dayjs().startOf("day");
  const tomorrow = today.add(1, "day");
  const last7Days = today.subtract(6, "day");

  // ─── ORDER PIPELINE (live statuses) ──────────────────────
  const [
    pendingOrders,
    acceptedOrders,
    preparingOrders,
    readyOrders,
    deliveringOrders,
    deliveredToday,
    cancelledToday,
  ] = await Promise.all([
    RestaurantOrderModel.countDocuments({ status: "pending" }),
    RestaurantOrderModel.countDocuments({ status: "accepted" }),
    RestaurantOrderModel.countDocuments({ status: "preparing" }),
    RestaurantOrderModel.countDocuments({ status: "ready" }),
    RestaurantOrderModel.countDocuments({ status: "delivering" }),
    RestaurantOrderModel.countDocuments({
      status: "delivered",
      updatedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
    RestaurantOrderModel.countDocuments({
      status: "cancelled",
      updatedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
    }),
  ]);

  // ─── REVENUE ─────────────────────────────────────────────
  const [allDeliveredOrders, todayDeliveredOrders] = await Promise.all([
    RestaurantOrderModel.find(
      { status: "delivered", isRedeemedMeal: false },
      { totalAmountInCFA: 1 }
    ).lean(),
    RestaurantOrderModel.find(
      {
        status: "delivered",
        isRedeemedMeal: false,
        updatedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      },
      { totalAmountInCFA: 1 }
    ).lean(),
  ]);

  const totalRevenue = allDeliveredOrders.reduce(
    (sum, o) => sum + (o.totalAmountInCFA ?? 0),
    0
  );
  const todayRevenue = todayDeliveredOrders.reduce(
    (sum, o) => sum + (o.totalAmountInCFA ?? 0),
    0
  );

  // ─── MEAL REDEMPTIONS TODAY ───────────────────────────────
  const [breakfastRedemptions, lunchRedemptions, dinnerRedemptions] =
    await Promise.all([
      MealRedemptionModel.countDocuments({
        mealType: "breakfast",
        redeemedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      }),
      MealRedemptionModel.countDocuments({
        mealType: "lunch",
        redeemedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      }),
      MealRedemptionModel.countDocuments({
        mealType: "dinner",
        redeemedAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      }),
    ]);

  // ─── MENU AVAILABILITY ────────────────────────────────────
  const [
    totalItems,
    availableTodayItems,
    totalCombos,
    availableTodayCombos,
    lowStockItems,
  ] = await Promise.all([
    RestaurantItemModel.countDocuments({ isAvailable: true }),
    RestaurantItemModel.countDocuments({
      isAvailable: true,
      availableToday: true,
    }),
    MealComboModel.countDocuments({ isActive: true, isAvailable: true }),
    MealComboModel.countDocuments({
      isActive: true,
      isAvailable: true,
      availableToday: true,
    }),
    // low stock: non-perishable items with stock > 0 but <= 5
    RestaurantItemModel.find(
      {
        isPerishable: false,
        stock: { $gt: 0, $lte: 5 },
        isAvailable: true,
      },
      { name: 1, stock: 1 }
    ).lean(),
  ]);

  // ─── 7-DAY ORDER TREND ────────────────────────────────────
  const ordersLast7 = await RestaurantOrderModel.find(
    {
      createdAt: { $gte: last7Days.toDate() },
      status: { $ne: "cancelled" },
    },
    { createdAt: 1 }
  ).lean();

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = last7Days.add(i, "day").format("YYYY-MM-DD");
    trendMap.set(date, 0);
  }
  ordersLast7.forEach((o) => {
    const d = dayjs(o.createdAt).format("YYYY-MM-DD");
    if (trendMap.has(d)) trendMap.set(d, trendMap.get(d)! + 1);
  });

  const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
    date: dayjs(date).format("MMM D"),
    orders: count,
  }));

  // ─── SERVICE CONFIG ───────────────────────────────────────
  const config = await RestaurantConfigModel.findOne(
    {},
    {
      breakfastStart: 1,
      breakfastEnd: 1,
      lunchStart: 1,
      lunchEnd: 1,
      dinnerStart: 1,
      dinnerEnd: 1,
      maxBreakfastPerRoom: 1,
      maxLunchPerRoom: 1,
      maxDinnerPerRoom: 1,
    }
  ).lean();

  // ─── RESULT ──────────────────────────────────────────────
  return {
    pipeline: {
      pending: pendingOrders,
      accepted: acceptedOrders,
      preparing: preparingOrders,
      ready: readyOrders,
      delivering: deliveringOrders,
      deliveredToday,
      cancelledToday,
    },
    revenue: {
      total: totalRevenue,
      today: todayRevenue,
    },
    redemptions: {
      breakfast: breakfastRedemptions,
      lunch: lunchRedemptions,
      dinner: dinnerRedemptions,
      total: breakfastRedemptions + lunchRedemptions + dinnerRedemptions,
    },
    menu: {
      totalItems,
      availableTodayItems,
      totalCombos,
      availableTodayCombos,
      lowStockItems,
    },
    trend,
    serviceWindows: config ?? null,
  };
}
