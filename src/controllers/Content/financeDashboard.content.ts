import dayjs from "dayjs";
import { BillItemModel } from "../../models/Finance/BillItem.model";
import { BillModel } from "../../models/Finance/Bill.model";
import { InvoiceModel } from "../../models/Finance/Invoice.model";
import { TransactionModel } from "../../models/Finance/Transaction.model";
import { DiscountModel } from "../../models/Finance/Discount.model";
import { InventoryFinancialEventModel } from "../../models/Inventory/Inventoryfinancialevent.model";
import { InventorySupplierModel } from "../../models/Inventory/Inventorysupplier.model";
import { InventorySupplierPaymentModel } from "../../models/Inventory/Inventorysupplierpayment.model";

export async function computeFinanceDashboard() {
  const today = dayjs().startOf("day");
  const tomorrow = today.add(1, "day");
  const startOfMonth = today.startOf("month");
  const startOfYear = today.startOf("year");

  // ─── REVENUE BY SOURCE ────────────────────────────────────
  // BillItem.category is the cleanest cross-module revenue classifier
  // we have. One aggregation gives us all revenue streams at once.
  const revenueBySource = await BillItemModel.aggregate([
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: { $ifNull: ["$_id", "uncategorized"] },
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  // ─── REVENUE TODAY ────────────────────────────────────────
  const todayBillItems = await BillItemModel.aggregate([
    {
      $match: {
        createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);
  const todayRevenue = todayBillItems[0]?.total ?? 0;

  // ─── REVENUE THIS MONTH ───────────────────────────────────
  const monthBillItems = await BillItemModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth.toDate(), $lt: tomorrow.toDate() },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);
  const monthRevenue = monthBillItems[0]?.total ?? 0;

  // ─── REVENUE THIS YEAR ────────────────────────────────────
  const yearBillItems = await BillItemModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear.toDate(), $lt: tomorrow.toDate() },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);
  const yearRevenue = yearBillItems[0]?.total ?? 0;

  // ─── REVENUE 7-DAY TREND ──────────────────────────────────
  const last7Days = today.subtract(6, "day");
  const revenueTrendRaw = await BillItemModel.aggregate([
    {
      $match: {
        createdAt: { $gte: last7Days.toDate() },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    trendMap.set(last7Days.add(i, "day").format("YYYY-MM-DD"), 0);
  }
  revenueTrendRaw.forEach((r) => {
    if (trendMap.has(r._id)) trendMap.set(r._id, r.total);
  });

  const revenueTrend = Array.from(trendMap.entries()).map(([date, total]) => ({
    date: dayjs(date).format("MMM D"),
    revenue: total,
  }));

  // ─── INVOICES ─────────────────────────────────────────────
  const [unpaidInvoices, partialInvoices, paidInvoices, outstandingAgg] =
    await Promise.all([
      InvoiceModel.countDocuments({ paymentStatus: "unpaid" }),
      InvoiceModel.countDocuments({ paymentStatus: "partial" }),
      InvoiceModel.countDocuments({ paymentStatus: "paid" }),
      InvoiceModel.aggregate([
        {
          $match: { paymentStatus: { $in: ["unpaid", "partial"] } },
        },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: "$amountDue" },
          },
        },
      ]),
    ]);

  const totalOutstandingInCFA = outstandingAgg[0]?.totalOutstanding ?? 0;

  // ─── BILLS ────────────────────────────────────────────────
  const [pendingBills, paidBills, cancelledBills] = await Promise.all([
    BillModel.countDocuments({ status: "pending" }),
    BillModel.countDocuments({ status: "paid" }),
    BillModel.countDocuments({ status: "cancelled" }),
  ]);

  // ─── TRANSACTIONS ─────────────────────────────────────────
  const [
    successTransactions,
    pendingTransactions,
    failedTransactions,
    todayTransactionVolume,
    transactionsByType,
  ] = await Promise.all([
    TransactionModel.countDocuments({ status: "success" }),
    TransactionModel.countDocuments({ status: "pending" }),
    TransactionModel.countDocuments({ status: "failed" }),
    TransactionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() },
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountInCFA" },
          count: { $sum: 1 },
        },
      },
    ]),
    TransactionModel.aggregate([
      {
        $group: {
          _id: "$transactionType",
          count: { $sum: 1 },
          total: { $sum: "$amountInCFA" },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          count: 1,
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  // ─── OUTGOING SPEND (INVENTORY) ───────────────────────────
  // Confirmed supplier payments this month give us the cost side
  const monthlyOutgoingAgg = await InventorySupplierPaymentModel.aggregate([
    {
      $match: {
        status: "confirmed",
        paymentDate: {
          $gte: startOfMonth.toDate(),
          $lt: tomorrow.toDate(),
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountInCFA" },
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyOutgoingSpend = monthlyOutgoingAgg[0]?.total ?? 0;
  const monthlyOutgoingCount = monthlyOutgoingAgg[0]?.count ?? 0;

  // ─── GROSS MARGIN ESTIMATE ────────────────────────────────
  // Simple estimate: month revenue minus confirmed supplier spend
  // Not a true P&L but gives finance a directional view
  const estimatedGrossMargin = monthRevenue - monthlyOutgoingSpend;
  const grossMarginRate =
    monthRevenue === 0
      ? 0
      : parseFloat(((estimatedGrossMargin / monthRevenue) * 100).toFixed(1));

  // ─── DISCOUNTS ────────────────────────────────────────────
  const activeDiscounts = await DiscountModel.countDocuments({});

  // ─── RESULT ───────────────────────────────────────────────
  return {
    revenue: {
      today: todayRevenue,
      thisMonth: monthRevenue,
      thisYear: yearRevenue,
      bySource: revenueBySource,
      trend: revenueTrend,
    },
    invoices: {
      unpaid: unpaidInvoices,
      partial: partialInvoices,
      paid: paidInvoices,
      totalOutstandingInCFA,
    },
    bills: {
      pending: pendingBills,
      paid: paidBills,
      cancelled: cancelledBills,
    },
    transactions: {
      success: successTransactions,
      pending: pendingTransactions,
      failed: failedTransactions,
      today: {
        volume: todayTransactionVolume[0]?.total ?? 0,
        count: todayTransactionVolume[0]?.count ?? 0,
      },
      byType: transactionsByType,
    },
    outgoingSpend: {
      thisMonth: monthlyOutgoingSpend,
      paymentsCount: monthlyOutgoingCount,
    },
    grossMargin: {
      estimatedThisMonth: estimatedGrossMargin,
      ratePercentage: grossMarginRate,
    },
    activeDiscounts,
  };
}
