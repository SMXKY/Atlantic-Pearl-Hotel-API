import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventoryMovementControllers } from "../../controllers/Inventory/InventoryMovement.controller";

export const inventoryMovementRouter = express.Router();

// Movements are read-only from the route layer.
// They are created by the service layer of other controllers
// (GoodsReceipt, Requisition, StockTake) never directly by the client.
inventoryMovementRouter.get(
  "/",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
  inventoryMovementControllers.readAllInventoryMovements
);

inventoryMovementRouter.get(
  "/:id",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
  inventoryMovementControllers.readOneInventoryMovement
);

// Audit trail for a specific item at a specific location
inventoryMovementRouter.get(
  "/item/:itemId/location/:locationId",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
  inventoryMovementControllers.getItemMovementHistory
);

// Log a wastage movement directly (damage, expiry, loss)
inventoryMovementRouter.post(
  "/wastage",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.logWastage),
  inventoryMovementControllers.logWastage
);

// Initiate a stock transfer between two locations
inventoryMovementRouter.post(
  "/transfer",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.transfer),
  inventoryMovementControllers.transferStock
);
