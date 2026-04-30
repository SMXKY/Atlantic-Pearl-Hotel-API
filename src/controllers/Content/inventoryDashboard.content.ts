import dayjs from "dayjs";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";
import { InventoryItemModel } from "../../models/Inventory/Inventoryitem.model";
import { InventoryRequisitionModel } from "../../models/Inventory/Inventoryrequisition.model";
import { InventoryPurchaseOrderModel } from "../../models/Inventory/Inventorypurchaseorder.model";
import { InventoryGoodsReceiptModel } from "../../models/Inventory/Inventorygoodsreceipt.model";
import { InventoryStockTakeModel } from "../../models/Inventory/Inventorystocktake.model";
import { InventoryMovementModel } from "../../models/Inventory/Inventorymovement.model";
import { InventoryFinancialEventModel } from "../../models/Inventory/Inventoryfinancialevent.model";
import { InventorySupplierPaymentModel } from "../../models/Inventory/Inventorysupplierpayment.model";
import { InventoryAlertConfigModel } from "../../models/Inventory/Inventoryalertconfig.model";
import { InventorySupplierModel } from "../../models/Inventory/Inventorysupplier.model";

export async function computeInventoryDashboard() {
  const today = dayjs().startOf("day");
  const tomorrow = today.add(1, "day");
  const last7Days = today.subtract(6, "day");
  const startOfMonth = today.startOf("month");

  // ─── STOCK HEALTH ─────────────────────────────────────────
  // Pull all active item-locations in one query and compute
  // reorder breaches and total stock value in memory.
  // This avoids multiple aggregation pipelines on the same collection.
  const allItemLocations = await InventoryItemLocationModel.find(
    {},
    { currentStock: 1, reorderPoint: 1, isBlocked: 1, costBatches: 1 }
  ).lean();

  let belowReorderCount = 0;
  let blockedCount = 0;
  let totalStockValueInCFA = 0;

  for (const il of allItemLocations) {
    if (il.currentStock <= il.reorderPoint) belowReorderCount++;
    if (il.isBlocked) blockedCount++;

    // FIFO stock value: sum of (remainingQuantity * unitCostInCFA)
    if (il.costBatches?.length) {
      for (const batch of il.costBatches) {
        totalStockValueInCFA +=
          (batch.remainingQuantity ?? 0) * (batch.unitCostInCFA ?? 0);
      }
    }
  }

  const [totalActiveItems, totalLocations] = await Promise.all([
    InventoryItemModel.countDocuments({ isActive: true }),
    InventoryItemLocationModel.countDocuments({}),
  ]);

  // ─── BLOCKED ITEMS BY LOCATION ────────────────────────────
  const blockedByLocation = await InventoryItemLocationModel.aggregate([
    { $match: { isBlocked: true } },
    {
      $group: {
        _id: "$location",
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "inventorylocations",
        localField: "_id",
        foreignField: "_id",
        as: "locationDoc",
      },
    },
    {
      $project: {
        _id: 0,
        locationId: "$_id",
        locationName: { $arrayElemAt: ["$locationDoc.name", 0] },
        blockedItems: "$count",
      },
    },
  ]);

  // ─── PENDING ACTIONS ──────────────────────────────────────
  const [
    pendingRequisitions,
    pendingPOs,
    overduePOs,
    draftGRNs,
    disputedGRNs,
    stockTakesInProgress,
    stockTakesPendingApproval,
  ] = await Promise.all([
    InventoryRequisitionModel.countDocuments({ status: "pending" }),
    InventoryPurchaseOrderModel.countDocuments({ status: "pending" }),
    InventoryPurchaseOrderModel.countDocuments({
      status: { $in: ["sent", "partial"] },
      isOverdue: true,
    }),
    InventoryGoodsReceiptModel.countDocuments({ status: "draft" }),
    InventoryGoodsReceiptModel.countDocuments({ status: "disputed" }),
    InventoryStockTakeModel.countDocuments({ status: "in_progress" }),
    InventoryStockTakeModel.countDocuments({ status: "pending_approval" }),
  ]);

  // ─── PROCUREMENT THIS MONTH ───────────────────────────────
  // Sum debit financial events this month for actual spend
  const monthlyFinancialEvents = await InventoryFinancialEventModel.find(
    {
      direction: "debit",
      type: { $in: ["payment_made"] },
      eventDate: {
        $gte: startOfMonth.toDate(),
        $lt: tomorrow.toDate(),
      },
    },
    { amountInCFA: 1 }
  ).lean();

  const monthlySpendInCFA = monthlyFinancialEvents.reduce(
    (sum, e) => sum + (e.amountInCFA ?? 0),
    0
  );

  // Pending supplier payments (not yet confirmed)
  const pendingPayments = await InventorySupplierPaymentModel.find(
    { status: "pending" },
    { amountInCFA: 1 }
  ).lean();

  const pendingPaymentsTotal = pendingPayments.reduce(
    (sum, p) => sum + (p.amountInCFA ?? 0),
    0
  );
  const pendingPaymentsCount = pendingPayments.length;

  // ─── SUPPLIER HEALTH ──────────────────────────────────────
  const [totalActiveSuppliers, blacklistedSuppliers, ratedSuppliers] =
    await Promise.all([
      InventorySupplierModel.countDocuments({
        isActive: true,
        isBlacklisted: false,
      }),
      InventorySupplierModel.countDocuments({ isBlacklisted: true }),
      InventorySupplierModel.find(
        { averageRating: { $exists: true, $ne: null } },
        { averageRating: 1 }
      ).lean(),
    ]);

  const averageSupplierRating =
    ratedSuppliers.length === 0
      ? null
      : parseFloat(
          (
            ratedSuppliers.reduce((sum, s) => sum + (s.averageRating ?? 0), 0) /
            ratedSuppliers.length
          ).toFixed(1)
        );

  // ─── MOVEMENT ACTIVITY ────────────────────────────────────
  const [todayMovements, last7DaysMovements] = await Promise.all([
    InventoryMovementModel.aggregate([
      {
        $match: {
          createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]),
    InventoryMovementModel.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days.toDate() },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Normalize movement aggregation results into a clean map
  const normalizeMovements = (arr: { _id: string; count: number }[]) => {
    const map: Record<string, number> = {
      receive: 0,
      issue: 0,
      wastage: 0,
      transfer_in: 0,
      transfer_out: 0,
      return: 0,
      adjustment: 0,
    };
    arr.forEach((m) => {
      if (m._id in map) map[m._id] = m.count;
    });
    return map;
  };

  // ─── 7-DAY MOVEMENT TREND ─────────────────────────────────
  const trendMovements = await InventoryMovementModel.find(
    { createdAt: { $gte: last7Days.toDate() } },
    { createdAt: 1, type: 1 }
  ).lean();

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    trendMap.set(last7Days.add(i, "day").format("YYYY-MM-DD"), 0);
  }
  trendMovements.forEach((m) => {
    const d = dayjs(m.createdAt).format("YYYY-MM-DD");
    if (trendMap.has(d)) trendMap.set(d, trendMap.get(d)! + 1);
  });

  const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
    date: dayjs(date).format("MMM D"),
    movements: count,
  }));

  // ─── ALERTS ───────────────────────────────────────────────
  const [totalAlertConfigs, activeAlertConfigs] = await Promise.all([
    InventoryAlertConfigModel.countDocuments({}),
    InventoryAlertConfigModel.countDocuments({ isActive: true }),
  ]);

  // ─── RESULT ───────────────────────────────────────────────
  return {
    stockHealth: {
      totalActiveItems,
      totalItemLocations: totalLocations,
      belowReorderPoint: belowReorderCount,
      blocked: blockedCount,
      totalStockValueInCFA: Math.round(totalStockValueInCFA),
      blockedByLocation,
    },
    pendingActions: {
      requisitions: pendingRequisitions,
      purchaseOrders: pendingPOs,
      overduePurchaseOrders: overduePOs,
      draftGoodsReceipts: draftGRNs,
      disputedGoodsReceipts: disputedGRNs,
      stockTakesInProgress,
      stockTakesPendingApproval,
      total:
        pendingRequisitions +
        pendingPOs +
        overduePOs +
        draftGRNs +
        disputedGRNs +
        stockTakesInProgress +
        stockTakesPendingApproval,
    },
    procurement: {
      monthlySpendInCFA,
      pendingPaymentsCount,
      pendingPaymentsTotalInCFA: pendingPaymentsTotal,
    },
    suppliers: {
      active: totalActiveSuppliers,
      blacklisted: blacklistedSuppliers,
      averageRating: averageSupplierRating,
    },
    movements: {
      today: normalizeMovements(todayMovements),
      last7Days: normalizeMovements(last7DaysMovements),
    },
    trend,
    alerts: {
      total: totalAlertConfigs,
      active: activeAlertConfigs,
    },
  };
}
