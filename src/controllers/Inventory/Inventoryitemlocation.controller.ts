import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryItemLocationModel } from "models/Inventory/Inventoryitemlocation.model";
import { logUserActivity } from "../../util/logUserActivity.util";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../../util/appResponder.util";

const CRUDInventroyItemLocation: CRUD = new CRUD(InventoryItemLocationModel);

const createInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.create(req.body, res, req);
  }
);

const readOneInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyItemLocations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.update(req.params.id, res, req);
  }
);

const deleteInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.delete(req.params.id, res, req);
  }
);

const blockItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError(
          "A reason is required when blocking stock issues for an item",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const itemLocation = await InventoryItemLocationModel.findById(id)
      .populate("item", "name sku")
      .populate("location", "name code");

    if (!itemLocation) {
      return next(
        new AppError("Item location record not found", StatusCodes.NOT_FOUND)
      );
    }

    if (itemLocation.isBlocked) {
      return next(
        new AppError(
          "This item is already blocked at this location",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { ...itemLocation.toObject() };

    itemLocation.isBlocked = true;
    itemLocation.blockedReason = reason.trim();
    itemLocation.blockedBy = res.locals.user._id;
    itemLocation.updatedBy = res.locals.user._id;

    // blockedAt is stamped by the pre-save hook on the model
    await itemLocation.save();

    const itemName = (itemLocation.item as any)?.name ?? "Unknown Item";
    const locationName =
      (itemLocation.location as any)?.name ?? "Unknown Location";

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} blocked stock issues for "${itemName}" at "${locationName}"`,
      "inventoryitemlocations",
      String(itemLocation._id),
      JSON.stringify(before),
      JSON.stringify(itemLocation.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Stock issues for "${itemName}" at "${locationName}" have been blocked`,
        data: { itemLocation },
      },
      res
    );
  }
);

const unblockItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const itemLocation = await InventoryItemLocationModel.findById(id)
      .populate("item", "name sku")
      .populate("location", "name code");

    if (!itemLocation) {
      return next(
        new AppError("Item location record not found", StatusCodes.NOT_FOUND)
      );
    }

    if (!itemLocation.isBlocked) {
      return next(
        new AppError(
          "This item is not currently blocked at this location",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { ...itemLocation.toObject() };

    itemLocation.isBlocked = false;
    itemLocation.updatedBy = res.locals.user._id;

    // Model pre-save hook clears blockedReason, blockedBy, blockedAt
    await itemLocation.save();

    const itemName = (itemLocation.item as any)?.name ?? "Unknown Item";
    const locationName =
      (itemLocation.location as any)?.name ?? "Unknown Location";

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} unblocked stock issues for "${itemName}" at "${locationName}"`,
      "inventoryitemlocations",
      String(itemLocation._id),
      JSON.stringify(before),
      JSON.stringify(itemLocation.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Stock issues for "${itemName}" at "${locationName}" have been unblocked`,
        data: { itemLocation },
      },
      res
    );
  }
);

const updateSeasonalParLevels = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { seasonalParLevels } = req.body;

    if (!Array.isArray(seasonalParLevels)) {
      return next(
        new AppError(
          "seasonalParLevels must be an array. Send an empty array to clear all seasonal overrides.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const itemLocation = await InventoryItemLocationModel.findById(id)
      .populate("item", "name sku")
      .populate("location", "name code");

    if (!itemLocation) {
      return next(
        new AppError("Item location record not found", StatusCodes.NOT_FOUND)
      );
    }

    for (const level of seasonalParLevels) {
      if (
        !level.label ||
        level.reorderPoint === undefined ||
        level.maxStock === undefined ||
        !level.validFrom ||
        !level.validTo
      ) {
        return next(
          new AppError(
            "Each seasonal par level must include: label, reorderPoint, maxStock, validFrom, validTo",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (new Date(level.validTo) <= new Date(level.validFrom)) {
        return next(
          new AppError(
            `Seasonal par level "${level.label}" has an invalid date range: validTo must be after validFrom`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (level.maxStock <= level.reorderPoint) {
        return next(
          new AppError(
            `Seasonal par level "${level.label}": maxStock must be greater than reorderPoint`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    const before = { ...itemLocation.toObject() };

    // Full replace -- the model pre-save hook validates no overlaps
    itemLocation.seasonalParLevels = seasonalParLevels;
    itemLocation.updatedBy = res.locals.user._id;
    await itemLocation.save();

    const itemName = (itemLocation.item as any)?.name ?? "Unknown Item";
    const locationName =
      (itemLocation.location as any)?.name ?? "Unknown Location";

    const action =
      seasonalParLevels.length === 0
        ? `cleared all seasonal par levels for "${itemName}" at "${locationName}"`
        : `updated ${seasonalParLevels.length} seasonal par level(s) for "${itemName}" at "${locationName}"`;

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} ${action}`,
      "inventoryitemlocations",
      String(itemLocation._id),
      JSON.stringify(before),
      JSON.stringify(itemLocation.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message:
          seasonalParLevels.length === 0
            ? `All seasonal par levels cleared for "${itemName}" at "${locationName}". Base par levels are now active.`
            : `Seasonal par levels updated successfully for "${itemName}" at "${locationName}"`,
        data: {
          itemLocation,
          activeLevels: seasonalParLevels.length,
        },
      },
      res
    );
  }
);

export const inventroyItemLocationControllers = {
  createInventroyItemLocation,
  readOneInventroyItemLocation,
  readAllInventroyItemLocations,
  updateInventroyItemLocation,
  deleteInventroyItemLocation,
  blockItemLocation,
  unblockItemLocation,
  updateSeasonalParLevels,
};
