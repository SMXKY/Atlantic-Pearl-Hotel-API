import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { InventoryFinancialEnventControllers } from "../../controllers/Inventory/Inventoryfinancialevent.controller";

export const inventoryFinancialEventRouter = express.Router();

// Financial events are read-only from the route layer.
// They are written exclusively by the service layer.
inventoryFinancialEventRouter.get(
  "/",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryFinancials.read),
  InventoryFinancialEnventControllers.readAllInventoryFinancialEnvents
);

inventoryFinancialEventRouter.get(
  "/:id",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryFinancials.read),
  InventoryFinancialEnventControllers.readOneInventoryFinancialEnvent
);

// Ledger view -- filtered by date range, supplier, category, or direction
inventoryFinancialEventRouter.get(
  "/ledger/summary",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryFinancials.read),
  InventoryFinancialEnventControllers.getFinancialLedgerSummary
);
