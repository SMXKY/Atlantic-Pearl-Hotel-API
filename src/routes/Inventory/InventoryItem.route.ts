import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { InventoryItemControllers } from "../../controllers/Inventory/Inventoryitem.controller";

import trackCreatedBy, {
  trackUpdateddBy,
} from "../../middlewares/trackCreatedBy.middleware";

export const inventoryItemRouter = express.Router();

inventoryItemRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.create),
    trackCreatedBy,
    InventoryItemControllers.createInventoryItem
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.readAll),
    InventoryItemControllers.readAllInventoryItems
  );

inventoryItemRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.readOne),
    InventoryItemControllers.readOneInventoryItem
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.update),
    trackUpdateddBy,
    InventoryItemControllers.updateInventoryItem
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryItems.delete),
    InventoryItemControllers.deleteInventoryItem
  );

// Get all stock levels for a specific item across all locations
inventoryItemRouter.get(
  "/:id/stock",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryItems.readOne),
  InventoryItemControllers.getItemStockAcrossLocations
);
