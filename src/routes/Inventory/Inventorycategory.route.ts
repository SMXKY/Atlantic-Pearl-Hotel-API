import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { InventoryCategoryControllers } from "../../controllers/Inventory/Inventorycategory.controller";

export const inventoryCategoryRouter = express.Router();

inventoryCategoryRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryCategories.create),
    InventoryCategoryControllers.createInventoryCategory
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryCategories.readAll),
    InventoryCategoryControllers.readAllInventoryCategories
  );

inventoryCategoryRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryCategories.readOne),
    InventoryCategoryControllers.readOneInventoryCategory
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryCategories.update),
    InventoryCategoryControllers.updateInventoryCategory
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryCategories.delete),
    InventoryCategoryControllers.deleteInventoryCategory
  );
