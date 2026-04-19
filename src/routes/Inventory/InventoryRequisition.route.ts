import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventoryRequisitionControllers } from "../../controllers/Inventory/InventoryRequisition.controller";

export const inventoryRequisitionRouter = express.Router();

inventoryRequisitionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryRequisitions.create),
    inventoryRequisitionControllers.createInventoryRequisition
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryRequisitions.readAll),
    inventoryRequisitionControllers.readAllInventoryRequisitions
  );

inventoryRequisitionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryRequisitions.readOne),
    inventoryRequisitionControllers.readOneInventoryRequisition
  );

// Approve, partially fulfill, or reject a requisition
inventoryRequisitionRouter.patch(
  "/:id/approve",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryRequisitions.approve),
  inventoryRequisitionControllers.approveRequisition
);

inventoryRequisitionRouter.patch(
  "/:id/reject",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryRequisitions.approve),
  inventoryRequisitionControllers.rejectRequisition
);

inventoryRequisitionRouter.patch(
  "/:id/cancel",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryRequisitions.create),
  inventoryRequisitionControllers.cancelRequisition
);
