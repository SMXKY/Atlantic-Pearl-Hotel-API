import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryMovementModel } from "models/Inventory/Inventorymovement.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../../util/appResponder.util";
import { InventoryItemModel } from "../../models/Inventory/Inventoryitem.model";
import { InventoryLocationModel } from "../../models/Inventory/Inventorylocation.model";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";
import { logUserActivity } from "../../util/logUserActivity.util";
import mongoose from "mongoose";
import { fireInventoryAlert } from "../../util/inventoryAlert.util";

const CRUDInventroyMovement: CRUD = new CRUD(InventoryMovementModel);

const createInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.create(req.body, res, req);
  }
);

const readOneInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyMovements = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.update(req.params.id, res, req);
  }
);

const deleteInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.delete(req.params.id, res, req);
  }
);

const getItemMovementHistory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { itemId, locationId } = req.params;
    const { type, from, to, page = "1", limit = "50" } = req.query;

    const item = await InventoryItemModel.findById(itemId)
      .select("name sku unitOfMeasure")
      .lean();

    if (!item) {
      return next(
        new AppError("Inventory item not found", StatusCodes.NOT_FOUND)
      );
    }

    const location = await InventoryLocationModel.findById(locationId)
      .select("name code")
      .lean();

    if (!location) {
      return next(
        new AppError("Inventory location not found", StatusCodes.NOT_FOUND)
      );
    }

    // Build the query filter
    const filter: Record<string, any> = {
      item: itemId,
      location: locationId,
    };

    if (type) {
      const validTypes = [
        "receive",
        "issue",
        "return",
        "wastage",
        "transfer_out",
        "transfer_in",
        "adjustment",
      ];
      if (!validTypes.includes(type as string)) {
        return next(
          new AppError(
            `Invalid movement type. Must be one of: ${validTypes.join(", ")}`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
      filter.type = type;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [movements, total] = await Promise.all([
      InventoryMovementModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("performedBy", "name email")
        .populate("counterpartLocation", "name code")
        .lean(),
      InventoryMovementModel.countDocuments(filter),
    ]);

    // Running stock snapshot -- reorder movements oldest first to compute
    // a cumulative stock line for chart visualisation on the UI
    const allMovements = await InventoryMovementModel.find(filter)
      .sort({ createdAt: 1 })
      .select("type quantity stockBefore stockAfter createdAt")
      .lean();

    const stockTimeline = allMovements.map((m) => ({
      date: m.createdAt,
      type: m.type,
      quantity: m.quantity,
      stockAfter: m.stockAfter,
    }));

    // Summary stats for the current filtered period
    const stats = await InventoryMovementModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          totalQuantity: { $sum: "$quantity" },
          totalValueInCFA: { $sum: "$totalCostInCFA" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get current stock state for this item at this location
    const currentItemLocation = await InventoryItemLocationModel.findOne({
      item: itemId,
      location: locationId,
    })
      .select("currentStock reorderPoint maxStock isBlocked")
      .lean();

    appResponder(
      StatusCodes.OK,
      {
        message: "Item movement history retrieved successfully",
        data: {
          item,
          location,
          currentState: currentItemLocation ?? null,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
          },
          stats,
          stockTimeline,
          movements,
        },
      },
      res
    );
  }
);

const logWastage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { item, location, quantity, wastageReason, notes } = req.body;

    if (!item || !location || !quantity || !wastageReason) {
      return next(
        new AppError(
          "item, location, quantity, and wastageReason are all required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (quantity <= 0) {
      return next(
        new AppError(
          "Wastage quantity must be greater than zero",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const validReasons = [
      "expired",
      "damaged",
      "lost",
      "contaminated",
      "disposed",
      "other",
    ];

    if (!validReasons.includes(wastageReason)) {
      return next(
        new AppError(
          `Invalid wastage reason. Must be one of: ${validReasons.join(", ")}`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const itemLocation = await InventoryItemLocationModel.findOne({
        item,
        location,
      })
        .populate("item", "name sku")
        .populate("location", "name code")
        .session(session);

      if (!itemLocation) {
        await session.abortTransaction();
        return next(
          new AppError(
            "No stock record found for this item at this location",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (itemLocation.currentStock < quantity) {
        await session.abortTransaction();
        return next(
          new AppError(
            `Insufficient stock. Current stock is ${
              itemLocation.currentStock
            } ${
              (itemLocation.item as any)?.unitOfMeasure ?? "units"
            } but wastage quantity is ${quantity}`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const stockBefore = itemLocation.currentStock;

      // Consume from FIFO batches
      let remainingToConsume = quantity;
      let weightedCostTotal = 0;

      for (const batch of itemLocation.costBatches) {
        if (remainingToConsume <= 0) break;

        const consumeFromBatch = Math.min(
          batch.remainingQuantity,
          remainingToConsume
        );
        weightedCostTotal += consumeFromBatch * batch.unitCostInCFA;
        batch.remainingQuantity -= consumeFromBatch;
        remainingToConsume -= consumeFromBatch;
      }

      // Remove exhausted batches
      itemLocation.costBatches = itemLocation.costBatches.filter(
        (b) => b.remainingQuantity > 0
      );

      itemLocation.currentStock -= quantity;
      itemLocation.updatedBy = res.locals.user._id;
      await itemLocation.save({ session });

      const unitCostInCFA =
        quantity > 0
          ? parseFloat((weightedCostTotal / quantity).toFixed(2))
          : 0;

      const totalCostInCFA = parseFloat(weightedCostTotal.toFixed(2));

      // Create the movement record
      const [movement] = await InventoryMovementModel.create(
        [
          {
            type: "wastage",
            item,
            location,
            quantity,
            unitCostInCFA,
            totalCostInCFA,
            wastageReason,
            notes: notes?.trim() ?? undefined,
            performedBy: res.locals.user._id,
            stockBefore,
            stockAfter: itemLocation.currentStock,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      const itemName = (itemLocation.item as any)?.name ?? "Unknown Item";
      const locationName =
        (itemLocation.location as any)?.name ?? "Unknown Location";

      // Check if stock dropped below alert threshold after wastage
      await fireInventoryAlert(
        item,
        location,
        itemLocation.currentStock,
        String(res.locals.user._id)
      );

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} logged wastage of ${quantity} units of "${itemName}" at "${locationName}" (reason: ${wastageReason})`,
        "inventorymovements",
        String(movement._id),
        JSON.stringify({ currentStock: stockBefore }),
        JSON.stringify({
          currentStock: itemLocation.currentStock,
          wastageReason,
          quantity,
        })
      );

      appResponder(
        StatusCodes.CREATED,
        {
          message: `Wastage of ${quantity} units logged successfully. Stock updated from ${stockBefore} to ${itemLocation.currentStock}.`,
          data: {
            movement,
            stockBefore,
            stockAfter: itemLocation.currentStock,
            totalCostInCFA,
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

const transferStock = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { item, fromLocation, toLocation, quantity, notes } = req.body;

    if (!item || !fromLocation || !toLocation || !quantity) {
      return next(
        new AppError(
          "item, fromLocation, toLocation, and quantity are all required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (quantity <= 0) {
      return next(
        new AppError(
          "Transfer quantity must be greater than zero",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (fromLocation === toLocation) {
      return next(
        new AppError(
          "Source and destination locations cannot be the same",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch both item location records
      const [sourceItemLocation, destItemLocation] = await Promise.all([
        InventoryItemLocationModel.findOne({ item, location: fromLocation })
          .populate("item", "name sku unitOfMeasure")
          .populate("location", "name code")
          .session(session),
        InventoryItemLocationModel.findOne({ item, location: toLocation })
          .populate("location", "name code")
          .session(session),
      ]);

      if (!sourceItemLocation) {
        await session.abortTransaction();
        return next(
          new AppError(
            "No stock record found for this item at the source location",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (!destItemLocation) {
        await session.abortTransaction();
        return next(
          new AppError(
            "No stock record found for this item at the destination location. Create an InventoryItemLocation record for the destination first.",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (sourceItemLocation.isBlocked) {
        await session.abortTransaction();
        return next(
          new AppError(
            `Stock issues are blocked at the source location: ${
              sourceItemLocation.blockedReason ?? "No reason provided"
            }`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (sourceItemLocation.currentStock < quantity) {
        await session.abortTransaction();
        return next(
          new AppError(
            `Insufficient stock at source location. Available: ${
              sourceItemLocation.currentStock
            } ${
              (sourceItemLocation.item as any)?.unitOfMeasure ?? "units"
            }, requested: ${quantity}`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const sourceStockBefore = sourceItemLocation.currentStock;
      const destStockBefore = destItemLocation.currentStock;

      // Consume from FIFO batches on the source
      // Transfer the cost basis to the destination batches
      let remainingToTransfer = quantity;
      let weightedCostTotal = 0;
      const transferredBatches: Array<{
        receivedAt: Date;
        unitCostInCFA: number;
        remainingQuantity: number;
        expiryDate?: Date;
      }> = [];

      for (const batch of sourceItemLocation.costBatches) {
        if (remainingToTransfer <= 0) break;

        const consumeFromBatch = Math.min(
          batch.remainingQuantity,
          remainingToTransfer
        );

        weightedCostTotal += consumeFromBatch * batch.unitCostInCFA;
        batch.remainingQuantity -= consumeFromBatch;
        remainingToTransfer -= consumeFromBatch;

        // Carry the original cost basis and expiry to the destination
        // so FIFO integrity is maintained across locations
        transferredBatches.push({
          receivedAt: batch.receivedAt,
          unitCostInCFA: batch.unitCostInCFA,
          remainingQuantity: consumeFromBatch,
          expiryDate: batch.expiryDate,
        });
      }

      // Remove exhausted batches from source
      sourceItemLocation.costBatches = sourceItemLocation.costBatches.filter(
        (b) => b.remainingQuantity > 0
      );

      sourceItemLocation.currentStock -= quantity;
      sourceItemLocation.updatedBy = res.locals.user._id;
      await sourceItemLocation.save({ session });

      // Push transferred batches to destination -- preserving original cost basis
      destItemLocation.costBatches.push(...transferredBatches);
      destItemLocation.currentStock += quantity;
      destItemLocation.updatedBy = res.locals.user._id;
      await destItemLocation.save({ session });

      const unitCostInCFA = parseFloat(
        (weightedCostTotal / quantity).toFixed(2)
      );
      const totalCostInCFA = parseFloat(weightedCostTotal.toFixed(2));

      // Shared ID linking the two movement records together
      const transferPairId = new mongoose.Types.ObjectId().toString();

      // Create both movement records atomically
      const [transferOut, transferIn] = await InventoryMovementModel.create(
        [
          {
            type: "transfer_out",
            item,
            location: fromLocation,
            counterpartLocation: toLocation,
            quantity,
            unitCostInCFA,
            totalCostInCFA,
            transferPairId,
            notes: notes?.trim() ?? undefined,
            performedBy: res.locals.user._id,
            stockBefore: sourceStockBefore,
            stockAfter: sourceItemLocation.currentStock,
          },
          {
            type: "transfer_in",
            item,
            location: toLocation,
            counterpartLocation: fromLocation,
            quantity,
            unitCostInCFA,
            totalCostInCFA,
            transferPairId,
            notes: notes?.trim() ?? undefined,
            performedBy: res.locals.user._id,
            stockBefore: destStockBefore,
            stockAfter: destItemLocation.currentStock,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      const itemName = (sourceItemLocation.item as any)?.name ?? "Unknown Item";
      const fromName =
        (sourceItemLocation.location as any)?.name ?? "Source Location";
      const toName =
        (destItemLocation.location as any)?.name ?? "Destination Location";

      // Check if source location dropped below alert threshold after transfer
      await fireInventoryAlert(
        item,
        fromLocation,
        sourceItemLocation.currentStock,
        String(res.locals.user._id)
      );

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} transferred ${quantity} units of "${itemName}" from "${fromName}" to "${toName}"`,
        "inventorymovements",
        transferPairId,
        JSON.stringify({
          sourceStock: sourceStockBefore,
          destStock: destStockBefore,
        }),
        JSON.stringify({
          sourceStock: sourceItemLocation.currentStock,
          destStock: destItemLocation.currentStock,
          quantity,
          transferPairId,
        })
      );

      appResponder(
        StatusCodes.CREATED,
        {
          message: `Successfully transferred ${quantity} units of "${itemName}" from "${fromName}" to "${toName}"`,
          data: {
            transferPairId,
            transferOut,
            transferIn,
            source: {
              location: sourceItemLocation.location,
              stockBefore: sourceStockBefore,
              stockAfter: sourceItemLocation.currentStock,
            },
            destination: {
              location: destItemLocation.location,
              stockBefore: destStockBefore,
              stockAfter: destItemLocation.currentStock,
            },
            totalCostInCFA,
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

export const inventroyMovementControllers = {
  createInventroyMovement,
  readOneInventroyMovement,
  readAllInventroyMovements,
  updateInventroyMovement,
  deleteInventroyMovement,
  getItemMovementHistory,
  logWastage,
  transferStock,
};
