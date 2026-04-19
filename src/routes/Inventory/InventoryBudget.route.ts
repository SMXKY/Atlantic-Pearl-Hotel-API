import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyBudgetControllers } from "../../controllers/Inventory/Inventorybudget.controller";

export const inventoryBudgetRouter = express.Router();

inventoryBudgetRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.setBudget),
    inventroyBudgetControllers.createInventroyBudget
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.read),
    inventroyBudgetControllers.readAllInventroyBudgets
  );

inventoryBudgetRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.read),
    inventroyBudgetControllers.readOneInventroyBudget
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.setBudget),
    inventroyBudgetControllers.updateInventroyBudget
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.setBudget),
    inventroyBudgetControllers.deleteInventroyBudget
  );
