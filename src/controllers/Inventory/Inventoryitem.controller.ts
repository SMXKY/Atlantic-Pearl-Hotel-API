import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryItemModel } from "../../models/Inventory/Inventoryitem.model";
import { appResponder } from "../../util/appResponder.util";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { InventoryGoodsReceiptModel } from "../../models/Inventory/Inventorygoodsreceipt.model";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";

const CRUDInventoryItem: CRUD = new CRUD(InventoryItemModel);

const createInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.create(req.body, res, req);
  }
);

const readOneInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryItems = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.update(req.params.id, res, req);
  }
);

const deleteInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.delete(req.params.id, res, req);
  }
);

const getItemStockAcrossLocations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const item = await InventoryItemModel.findById(id)
      .populate("category", "name code")
      .populate("suppliers.supplier", "name code")
      .lean();

    if (!item) {
      return next(
        new AppError("Inventory item not found", StatusCodes.NOT_FOUND)
      );
    }

    const itemLocations = await InventoryItemLocationModel.find({
      item: id,
    })
      .select("+costBatches")
      .populate("location", "name code isActive")
      .lean();

    const now = new Date();

    const locationStocks = itemLocations.map((il: any) => {
      const activeSeason = il.seasonalParLevels?.find(
        (s: any) => new Date(s.validFrom) <= now && now <= new Date(s.validTo)
      );

      const effectiveReorderPoint = activeSeason
        ? activeSeason.reorderPoint
        : il.reorderPoint;

      const effectiveMaxStock = activeSeason
        ? activeSeason.maxStock
        : il.maxStock;

      const stockValueInCFA = (il.costBatches ?? []).reduce(
        (sum: number, batch: any) =>
          sum + batch.remainingQuantity * batch.unitCostInCFA,
        0
      );

      const transferableQuantity = Math.max(
        0,
        il.currentStock - effectiveReorderPoint
      );

      let stockStatus: "critical" | "low" | "healthy" | "overstocked";
      if (il.currentStock <= 0) {
        stockStatus = "critical";
      } else if (il.currentStock <= effectiveReorderPoint) {
        stockStatus = "low";
      } else if (il.currentStock > effectiveMaxStock) {
        stockStatus = "overstocked";
      } else {
        stockStatus = "healthy";
      }

      const expiringBatches = (il.costBatches ?? []).filter((batch: any) => {
        if (!batch.expiryDate) return false;
        const daysUntilExpiry =
          (new Date(batch.expiryDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 30 && batch.remainingQuantity > 0;
      });

      return {
        itemLocationId: il._id,
        location: il.location,
        currentStock: il.currentStock,
        reorderPoint: effectiveReorderPoint,
        maxStock: effectiveMaxStock,
        isBlocked: il.isBlocked,
        blockedReason: il.blockedReason ?? null,
        stockStatus,
        transferableQuantity,
        stockValueInCFA: parseFloat(stockValueInCFA.toFixed(2)),
        activeSeason: activeSeason
          ? {
              label: activeSeason.label,
              validFrom: activeSeason.validFrom,
              validTo: activeSeason.validTo,
            }
          : null,
        expiringBatches:
          expiringBatches.length > 0
            ? expiringBatches.map((b: any) => ({
                expiryDate: b.expiryDate,
                remainingQuantity: b.remainingQuantity,
                unitCostInCFA: b.unitCostInCFA,
                daysUntilExpiry: Math.ceil(
                  (new Date(b.expiryDate).getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24)
                ),
              }))
            : [],
        hasExpiringStock: expiringBatches.length > 0,
      };
    });

    const totalStock = locationStocks.reduce(
      (sum, l) => sum + l.currentStock,
      0
    );

    const totalStockValueInCFA = locationStocks.reduce(
      (sum, l) => sum + l.stockValueInCFA,
      0
    );

    const locationsBelow = locationStocks.filter(
      (l) => l.stockStatus === "low" || l.stockStatus === "critical"
    );

    const locationsWithSurplus = locationStocks.filter(
      (l) => l.transferableQuantity > 0
    );

    const locationsBlocked = locationStocks.filter((l) => l.isBlocked);

    const locationsWithExpiringStock = locationStocks.filter(
      (l) => l.hasExpiringStock
    );

    let transferOpportunity = null;

    if (locationsBelow.length > 0 && locationsWithSurplus.length > 0) {
      const deficitLocation = locationsBelow[0];
      const surplusLocation = locationsWithSurplus.find(
        (l) =>
          l.location._id.toString() !== deficitLocation.location._id.toString()
      );

      if (surplusLocation) {
        transferOpportunity = {
          from: {
            locationId: surplusLocation.location._id,
            locationName: (surplusLocation.location as any).name,
            currentStock: surplusLocation.currentStock,
            transferableQuantity: surplusLocation.transferableQuantity,
          },
          to: {
            locationId: deficitLocation.location._id,
            locationName: (deficitLocation.location as any).name,
            currentStock: deficitLocation.currentStock,
            reorderPoint: deficitLocation.reorderPoint,
            shortage:
              deficitLocation.reorderPoint - deficitLocation.currentStock,
          },
          message: `${
            (surplusLocation.location as any).name
          } can transfer up to ${
            surplusLocation.transferableQuantity
          } units to ${(deficitLocation.location as any).name} which is ${
            deficitLocation.reorderPoint - deficitLocation.currentStock
          } units below its reorder point.`,
        };
      }
    }

    appResponder(
      StatusCodes.OK,
      {
        message: "Item stock across all locations retrieved successfully",
        data: {
          item: {
            _id: item._id,
            name: item.name,
            sku: item.sku,
            unitOfMeasure: item.unitOfMeasure,
            abcClassification: item.abcClassification,
            category: item.category,
            trackExpiry: item.trackExpiry,
            reorderQuantity: item.reorderQuantity,
          },
          summary: {
            totalStock,
            totalStockValueInCFA: parseFloat(totalStockValueInCFA.toFixed(2)),
            totalLocations: locationStocks.length,
            locationsBelowPar: locationsBelow.length,
            locationsBlocked: locationsBlocked.length,
            locationsWithExpiringStock: locationsWithExpiringStock.length,
            transferOpportunity,
          },
          locations: locationStocks,
        },
      },
      res
    );
  }
);

export const InventoryItemControllers = {
  createInventoryItem,
  readOneInventoryItem,
  readAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  getItemStockAcrossLocations,
};
