import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyItemLocationControllers } from "../../controllers/Inventory/Inventoryitemlocation.controller";

export const inventoryItemLocationRouter = express.Router();

inventoryItemLocationRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.create),
    inventroyItemLocationControllers.createInventroyItemLocation
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.readAll),
    inventroyItemLocationControllers.readAllInventroyItemLocations
  );

inventoryItemLocationRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.readOne),
    inventroyItemLocationControllers.readOneInventroyItemLocation
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.update),
    inventroyItemLocationControllers.updateInventroyItemLocation
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.delete),
    inventroyItemLocationControllers.deleteInventroyItemLocation
  );

// Block or unblock issuing stock for an item at a location
inventoryItemLocationRouter.patch(
  "/:id/block",
  authControllers.protect,
  authControllers.restrictTo(
    allPermissions.inventoryStockMovements.overrideBlock
  ),
  inventroyItemLocationControllers.blockItemLocation
);

inventoryItemLocationRouter.patch(
  "/:id/unblock",
  authControllers.protect,
  authControllers.restrictTo(
    allPermissions.inventoryStockMovements.overrideBlock
  ),
  inventroyItemLocationControllers.unblockItemLocation
);

// Update seasonal par levels for an item at a location
inventoryItemLocationRouter.patch(
  "/:id/seasonal-par-levels",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryItems.update),
  inventroyItemLocationControllers.updateSeasonalParLevels
);
