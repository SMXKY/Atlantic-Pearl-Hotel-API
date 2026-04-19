import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventoryAlertConfigControllers } from "../../controllers/Inventory/Inventoryalertconfig.controller";

export const inventoryAlertConfigRouter = express.Router();

inventoryAlertConfigRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySettings.manageAlerts),
    inventoryAlertConfigControllers.createInventoryAlertConfig
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySettings.manageAlerts),
    inventoryAlertConfigControllers.readAllInventoryAlertConfigs
  );

inventoryAlertConfigRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySettings.manageAlerts),
    inventoryAlertConfigControllers.readOneInventoryAlertConfig
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySettings.manageAlerts),
    inventoryAlertConfigControllers.updateInventoryAlertConfig
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySettings.manageAlerts),
    inventoryAlertConfigControllers.deleteInventoryAlertConfig
  );
