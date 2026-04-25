import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryFinancialEventModel } from "models/Inventory/Inventoryfinancialevent.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "util/AppError.util";
import { InventoryGoodsReceiptModel } from "models/Inventory/Inventorygoodsreceipt.model";
import { InventorySupplierPaymentModel } from "models/Inventory/Inventorysupplierpayment.model";
import { appResponder } from "util/appResponder.util";

const CRUDInventoryFinancialEnvent: CRUD = new CRUD(
  InventoryFinancialEventModel
);

const createInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.create(req.body, res, req);
  }
);

const readOneInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryFinancialEnvents = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.update(req.params.id, res, req);
  }
);

const deleteInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.delete(req.params.id, res, req);
  }
);

const getFinancialLedgerSummary = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { from, to } = req.query;

    if (!from || !to) {
      return next(
        new AppError(
          "Query params 'from' and 'to' are required (ISO date strings)",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return next(
        new AppError(
          "Invalid date format. Use ISO date strings e.g. 2026-01-01",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (fromDate > toDate) {
      return next(
        new AppError(
          "'from' date cannot be after 'to' date",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const dateFilter = {
      eventDate: { $gte: fromDate, $lte: toDate },
    };

    // ── 1. Totals -- debit, credit, net ──────────────────────────────────────
    const totals = await InventoryFinancialEventModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$direction",
          total: { $sum: "$amountInCFA" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalDebits = totals.find((t) => t._id === "debit")?.total ?? 0;
    const totalCredits = totals.find((t) => t._id === "credit")?.total ?? 0;
    const netPosition = totalDebits - totalCredits;

    // ── 2. Breakdown by event type ────────────────────────────────────────────
    const byEventType = await InventoryFinancialEventModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$type",
          totalAmountInCFA: { $sum: "$amountInCFA" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmountInCFA: -1 } },
    ]);

    // ── 3. Breakdown by supplier ──────────────────────────────────────────────
    const bySupplier = await InventoryFinancialEventModel.aggregate([
      { $match: { ...dateFilter, direction: "debit" } },
      {
        $group: {
          _id: "$supplier",
          totalAmountInCFA: { $sum: "$amountInCFA" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmountInCFA: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "inventorysuppliers",
          localField: "_id",
          foreignField: "_id",
          as: "supplierDetails",
        },
      },
      {
        $project: {
          supplier: { $arrayElemAt: ["$supplierDetails.name", 0] },
          supplierCode: { $arrayElemAt: ["$supplierDetails.code", 0] },
          totalAmountInCFA: 1,
          transactionCount: 1,
        },
      },
    ]);

    // ── 4. Breakdown by category ──────────────────────────────────────────────
    const byCategory = await InventoryFinancialEventModel.aggregate([
      {
        $match: {
          ...dateFilter,
          direction: "debit",
          category: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmountInCFA: { $sum: "$amountInCFA" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmountInCFA: -1 } },
      {
        $lookup: {
          from: "inventorycategories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $project: {
          category: { $arrayElemAt: ["$categoryDetails.name", 0] },
          categoryCode: { $arrayElemAt: ["$categoryDetails.code", 0] },
          totalAmountInCFA: 1,
          transactionCount: 1,
        },
      },
    ]);

    // ── 5. Breakdown by location ──────────────────────────────────────────────
    const byLocation = await InventoryFinancialEventModel.aggregate([
      {
        $match: {
          ...dateFilter,
          direction: "debit",
          location: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$location",
          totalAmountInCFA: { $sum: "$amountInCFA" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmountInCFA: -1 } },
      {
        $lookup: {
          from: "inventorylocations",
          localField: "_id",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      {
        $project: {
          location: { $arrayElemAt: ["$locationDetails.name", 0] },
          locationCode: { $arrayElemAt: ["$locationDetails.code", 0] },
          totalAmountInCFA: 1,
          transactionCount: 1,
        },
      },
    ]);

    // ── 6. Outstanding payables ───────────────────────────────────────────────
    // GRNs that have been posted but where total confirmed payments
    // are less than totalAmountInCFA. These are what the hotel owes.
    const postedGRNs = await InventoryGoodsReceiptModel.find({
      status: "posted",
    })
      .select("_id grnNumber supplier totalAmountInCFA postedAt")
      .populate("supplier", "name code")
      .lean();

    const outstandingPayables = await Promise.all(
      postedGRNs.map(async (grn) => {
        const confirmedPayments = await InventorySupplierPaymentModel.aggregate(
          [
            {
              $match: {
                goodsReceipt: grn._id,
                status: "confirmed",
              },
            },
            {
              $group: {
                _id: null,
                totalPaid: { $sum: "$amountInCFA" },
              },
            },
          ]
        );

        const totalPaid = confirmedPayments[0]?.totalPaid ?? 0;
        const outstanding = grn.totalAmountInCFA - totalPaid;

        return {
          grnNumber: grn.grnNumber,
          supplier: grn.supplier,
          invoiceAmountInCFA: grn.totalAmountInCFA,
          totalPaidInCFA: totalPaid,
          outstandingInCFA: outstanding,
          postedAt: grn.postedAt,
        };
      })
    );

    // Only return GRNs that still have something outstanding
    const unpaidPayables = outstandingPayables.filter(
      (p) => p.outstandingInCFA > 0
    );

    const totalOutstandingInCFA = unpaidPayables.reduce(
      (sum, p) => sum + p.outstandingInCFA,
      0
    );

    appResponder(
      StatusCodes.OK,
      {
        message: "Financial ledger summary retrieved successfully",
        data: {
          period: {
            from: fromDate,
            to: toDate,
          },
          summary: {
            totalDebitsInCFA: totalDebits,
            totalCreditsInCFA: totalCredits,
            netPositionInCFA: netPosition,
            totalOutstandingPayablesInCFA: totalOutstandingInCFA,
          },
          byEventType,
          bySupplier,
          byCategory,
          byLocation,
          outstandingPayables: unpaidPayables,
        },
      },
      res
    );
  }
);

export const InventoryFinancialEnventControllers = {
  createInventoryFinancialEnvent,
  readOneInventoryFinancialEnvent,
  readAllInventoryFinancialEnvents,
  updateInventoryFinancialEnvent,
  deleteInventoryFinancialEnvent,
  getFinancialLedgerSummary,
};
