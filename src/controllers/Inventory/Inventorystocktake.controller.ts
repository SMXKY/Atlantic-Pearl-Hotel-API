import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryStockTakeModel } from "../../models/Inventory/Inventorystocktake.model";
import { InventoryStockTakeScheduleModel } from "../../models/Inventory/Inventorystocktakeschedule.model";
import { logUserActivity } from "../../util/logUserActivity.util";
import { AppError } from "../../util/AppError.util";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { InventoryItemModel } from "../../models/Inventory/Inventoryitem.model";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";
import { InventoryMovementModel } from "../../models/Inventory/Inventorymovement.model";
import mongoose from "mongoose";

const CRUDInventroyStockTake: CRUD = new CRUD(InventoryStockTakeModel);

const createInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.create(req.body, res, req);
  }
);

const readOneInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyStockTakes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.update(req.params.id, res, req);
  }
);

const deleteInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.delete(req.params.id, res, req);
  }
);

const startStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const stockTake = await InventoryStockTakeModel.findById(id).populate(
      "location",
      "name code"
    );

    if (!stockTake) {
      return next(new AppError("Stock take not found", StatusCodes.NOT_FOUND));
    }

    if (stockTake.status !== "scheduled") {
      return next(
        new AppError(
          `Only scheduled stock takes can be started. Current status is '${stockTake.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Fetch all items at this location that fall within the scope
    let itemLocationQuery: Record<string, any> = {
      location: stockTake.location,
    };

    if (stockTake.scope === "category" && stockTake.scopeCategory) {
      // Filter by items belonging to the scoped category
      const categoryItems = await InventoryItemModel.find({
        category: stockTake.scopeCategory,
        isActive: true,
      })
        .select("_id")
        .lean();

      itemLocationQuery.item = {
        $in: categoryItems.map((i) => i._id),
      };
    }

    if (stockTake.scope === "spot" && stockTake.items.length > 0) {
      // Spot count -- only include items already on the stock take
      itemLocationQuery.item = {
        $in: stockTake.items.map((i) => i.item),
      };
    }

    const itemLocations = await InventoryItemLocationModel.find(
      itemLocationQuery
    )
      .select("+costBatches")
      .populate("item", "name sku unitOfMeasure")
      .lean();

    if (itemLocations.length === 0) {
      return next(
        new AppError(
          "No items found at this location for the selected scope. Ensure items are set up at this location before starting a stock take.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = {
      status: stockTake.status,
      itemCount: stockTake.items.length,
    };

    // Snapshot expected quantities and FIFO unit cost per item
    stockTake.items = itemLocations.map((il) => {
      // Weighted average FIFO cost for variance valuation
      const totalValue = (il.costBatches ?? []).reduce(
        (sum: number, b: any) => sum + b.remainingQuantity * b.unitCostInCFA,
        0
      );
      const avgUnitCost =
        il.currentStock > 0
          ? parseFloat((totalValue / il.currentStock).toFixed(2))
          : 0;

      return {
        item: (il.item as any)._id,
        expectedQuantity: il.currentStock,
        physicalQuantity: 0,
        variance: 0,
        unitCostInCFA: avgUnitCost,
        varianceCostInCFA: 0,
        varianceNotes: undefined,
        attachmentUrl: undefined,
        countedBy: res.locals.user._id,
        countedAt: new Date(),
      };
    });

    stockTake.status = "in_progress";

    // startedAt is stamped by the model pre-save hook
    await stockTake.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} started stock take ${
        stockTake.stockTakeNumber
      } at "${(stockTake.location as any)?.name}"`,
      "inventorystocktakes",
      String(stockTake._id),
      JSON.stringify(before),
      JSON.stringify({
        status: "in_progress",
        itemCount: stockTake.items.length,
      })
    );

    // Return the stock take WITHOUT expectedQuantity (select: false protects it)
    // The frontend receives the item list for counting without seeing expected values
    appResponder(
      StatusCodes.OK,
      {
        message: `Stock take ${stockTake.stockTakeNumber} started. ${stockTake.items.length} item(s) ready for counting.`,
        data: { stockTake },
      },
      res
    );
  }
);

const submitStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { counts } = req.body;

    if (!Array.isArray(counts) || counts.length === 0) {
      return next(
        new AppError(
          "counts array is required with a physical count per item",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const stockTake = await InventoryStockTakeModel.findById(id)
      .select("+items.expectedQuantity")
      .populate("location", "name code");

    if (!stockTake) {
      return next(new AppError("Stock take not found", StatusCodes.NOT_FOUND));
    }

    if (stockTake.status !== "in_progress") {
      return next(
        new AppError(
          `Only in-progress stock takes can be submitted. Current status is '${stockTake.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Build lookup map from body
    const countsMap: Record<
      string,
      {
        physicalQuantity: number;
        varianceNotes?: string;
        attachmentUrl?: string;
      }
    > = {};

    for (const entry of counts) {
      if (!entry.itemId || entry.physicalQuantity === undefined) {
        return next(
          new AppError(
            "Each entry in counts must include itemId and physicalQuantity",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      if (entry.physicalQuantity < 0) {
        return next(
          new AppError(
            "physicalQuantity cannot be negative",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      countsMap[entry.itemId] = {
        physicalQuantity: entry.physicalQuantity,
        varianceNotes: entry.varianceNotes ?? undefined,
        attachmentUrl: entry.attachmentUrl ?? undefined,
      };
    }

    // Apply counts to each line item and compute variances
    for (const lineItem of stockTake.items) {
      const itemId = lineItem.item.toString();
      const countEntry = countsMap[itemId];

      if (!countEntry) {
        return next(
          new AppError(
            `Missing count for item ${itemId}. All items must be counted before submission.`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const variance = countEntry.physicalQuantity - lineItem.expectedQuantity;

      if (variance !== 0 && !countEntry.varianceNotes?.trim()) {
        return next(
          new AppError(
            `Item ${itemId} has a variance of ${variance} units but no explanation note. All variances require a note.`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      lineItem.physicalQuantity = countEntry.physicalQuantity;
      lineItem.variance = variance;
      lineItem.varianceCostInCFA = parseFloat(
        (variance * lineItem.unitCostInCFA).toFixed(2)
      );
      lineItem.varianceNotes = countEntry.varianceNotes?.trim() ?? undefined;
      lineItem.attachmentUrl = countEntry.attachmentUrl ?? undefined;
      lineItem.countedBy = res.locals.user._id;
      lineItem.countedAt = new Date();
    }

    const before = { status: stockTake.status };

    stockTake.status = "pending_approval";

    // totalVarianceCostInCFA and submittedAt are handled by model pre-save hooks
    await stockTake.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} submitted counts for stock take ${stockTake.stockTakeNumber}`,
      "inventorystocktakes",
      String(stockTake._id),
      JSON.stringify(before),
      JSON.stringify({
        status: "pending_approval",
        totalVarianceCostInCFA: stockTake.totalVarianceCostInCFA,
        itemsCounted: stockTake.items.length,
      })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Stock take ${
          stockTake.stockTakeNumber
        } submitted for approval. Total variance value: ${stockTake.totalVarianceCostInCFA.toLocaleString()} CFA.`,
        data: { stockTake },
      },
      res
    );
  }
);

const approveStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const stockTake = await InventoryStockTakeModel.findById(id).populate(
      "location",
      "name code"
    );

    if (!stockTake) {
      return next(new AppError("Stock take not found", StatusCodes.NOT_FOUND));
    }

    if (stockTake.status !== "pending_approval") {
      return next(
        new AppError(
          `Only stock takes pending approval can be approved. Current status is '${stockTake.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { status: stockTake.status };

    stockTake.status = "approved";
    stockTake.reviewedBy = res.locals.user._id;
    if (approvalNotes) stockTake.approvalNotes = approvalNotes.trim();

    // reviewedAt is stamped by the model pre-save hook
    await stockTake.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} approved stock take ${stockTake.stockTakeNumber}`,
      "inventorystocktakes",
      String(stockTake._id),
      JSON.stringify(before),
      JSON.stringify({ status: "approved", reviewedBy: res.locals.user._id })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Stock take ${stockTake.stockTakeNumber} approved. Post it to apply stock level adjustments.`,
        data: { stockTake },
      },
      res
    );
  }
);

const postStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const stockTake = await InventoryStockTakeModel.findById(id)
      .select("+items.expectedQuantity")
      .populate("location", "name code");

    if (!stockTake) {
      return next(new AppError("Stock take not found", StatusCodes.NOT_FOUND));
    }

    if (stockTake.status !== "approved") {
      return next(
        new AppError(
          `Only approved stock takes can be posted. Current status is '${stockTake.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Process only items with a variance -- zero variance items need no adjustment
      const itemsWithVariance = stockTake.items.filter(
        (item) => item.variance !== 0
      );

      for (const lineItem of itemsWithVariance) {
        const itemLocation = await InventoryItemLocationModel.findOne({
          item: lineItem.item,
          location: stockTake.location,
        })
          .select("+costBatches")
          .session(session);

        if (!itemLocation) continue;

        const stockBefore = itemLocation.currentStock;
        const stockAfter = lineItem.physicalQuantity;
        const variance = lineItem.variance;

        if (variance < 0) {
          // Shrinkage -- consume from FIFO batches to remove excess
          let remainingToRemove = Math.abs(variance);

          for (const batch of itemLocation.costBatches) {
            if (remainingToRemove <= 0) break;
            const removeFromBatch = Math.min(
              batch.remainingQuantity,
              remainingToRemove
            );
            batch.remainingQuantity -= removeFromBatch;
            remainingToRemove -= removeFromBatch;
          }

          itemLocation.costBatches = itemLocation.costBatches.filter(
            (b) => b.remainingQuantity > 0
          );
        }

        // For positive variance (surplus), we add a cost batch at the
        // item's average current cost since we don't have a receipt
        if (variance > 0) {
          const avgCost = lineItem.unitCostInCFA;
          itemLocation.costBatches.push({
            receivedAt: new Date(),
            unitCostInCFA: avgCost,
            remainingQuantity: variance,
            expiryDate: undefined,
          });
        }

        itemLocation.currentStock = stockAfter;
        itemLocation.updatedBy = res.locals.user._id;
        await itemLocation.save({ session });

        // Create adjustment movement record
        await InventoryMovementModel.create(
          [
            {
              type: "adjustment",
              item: lineItem.item,
              location: stockTake.location,
              quantity: Math.abs(variance),
              unitCostInCFA: lineItem.unitCostInCFA,
              totalCostInCFA: Math.abs(lineItem.varianceCostInCFA),
              referenceModel: "InventoryStockTake",
              referenceId: stockTake._id,
              performedBy: res.locals.user._id,
              stockBefore,
              stockAfter,
              notes: `Stock take adjustment -- ${stockTake.stockTakeNumber}. ${
                lineItem.varianceNotes ?? ""
              }`.trim(),
            },
          ],
          { session }
        );
      }

      stockTake.status = "posted";
      stockTake.postedBy = res.locals.user._id;

      // postedAt is stamped by the model pre-save hook
      await stockTake.save({ session });

      // Update the stock take schedule for this location if one exists
      // Resets the overdue clock and computes the next due date
      const schedule = await InventoryStockTakeScheduleModel.findOne({
        location: stockTake.location,
        isActive: true,
      }).session(session);

      if (schedule) {
        schedule.lastCompletedAt = new Date();

        // Compute next due date based on frequency
        const now = new Date();
        let nextDue: Date;

        if (schedule.frequency === "interval" && schedule.intervalDays) {
          nextDue = new Date(
            now.getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000
          );
        } else if (schedule.frequency === "monthly" && schedule.dayOfMonth) {
          const next = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            schedule.dayOfMonth
          );
          nextDue = next;
        } else if (
          schedule.frequency === "weekly" &&
          schedule.dayOfWeek !== undefined
        ) {
          const daysUntilNext =
            (schedule.dayOfWeek - now.getDay() + 7) % 7 || 7;
          nextDue = new Date(
            now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000
          );
        } else {
          nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        schedule.nextDueAt = nextDue;
        schedule.updatedBy = res.locals.user._id;
        await schedule.save({ session });
      }

      await session.commitTransaction();

      const locationName = (stockTake.location as any)?.name ?? "the location";

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} posted stock take ${stockTake.stockTakeNumber} at "${locationName}". ${itemsWithVariance.length} adjustment(s) applied.`,
        "inventorystocktakes",
        String(stockTake._id),
        JSON.stringify({ status: "approved" }),
        JSON.stringify({
          status: "posted",
          adjustmentCount: itemsWithVariance.length,
          totalVarianceCostInCFA: stockTake.totalVarianceCostInCFA,
        })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: `Stock take ${stockTake.stockTakeNumber} posted successfully. ${itemsWithVariance.length} stock level adjustment(s) applied at "${locationName}".`,
          data: {
            stockTake,
            adjustmentsApplied: itemsWithVariance.length,
            totalVarianceCostInCFA: stockTake.totalVarianceCostInCFA,
          },
        },
        res
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
);

const cancelStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError(
          "A reason is required when cancelling a stock take",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const stockTake = await InventoryStockTakeModel.findById(id).populate(
      "location",
      "name code"
    );

    if (!stockTake) {
      return next(new AppError("Stock take not found", StatusCodes.NOT_FOUND));
    }

    const cancellableStatuses = [
      "scheduled",
      "in_progress",
      "pending_approval",
    ];
    if (!cancellableStatuses.includes(stockTake.status)) {
      return next(
        new AppError(
          `Stock take cannot be cancelled. Current status is '${stockTake.status}'. Only scheduled, in-progress, or pending approval stock takes can be cancelled.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { status: stockTake.status };

    stockTake.status = "cancelled";
    stockTake.notes = stockTake.notes
      ? `${stockTake.notes} | CANCELLED: ${reason.trim()}`
      : `CANCELLED: ${reason.trim()}`;

    await stockTake.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} cancelled stock take ${
        stockTake.stockTakeNumber
      } at "${(stockTake.location as any)?.name}"`,
      "inventorystocktakes",
      String(stockTake._id),
      JSON.stringify(before),
      JSON.stringify({ status: "cancelled", reason: reason.trim() })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Stock take ${stockTake.stockTakeNumber} has been cancelled`,
        data: { stockTake },
      },
      res
    );
  }
);

export const inventroyStockTakeControllers = {
  createInventroyStockTake,
  readOneInventroyStockTake,
  readAllInventroyStockTakes,
  updateInventroyStockTake,
  deleteInventroyStockTake,
  startStockTake,
  submitStockTake,
  approveStockTake,
  postStockTake,
  cancelStockTake,
};
