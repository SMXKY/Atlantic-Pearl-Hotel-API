import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyPurchaseOrderControllers } from "../../controllers/Inventory/Inventorypurchaseorder.controller";

export const inventoryPurchaseOrderRouter = express.Router();

inventoryPurchaseOrderRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.create),
    inventroyPurchaseOrderControllers.createInventroyPurchaseOrder
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.readAll),
    inventroyPurchaseOrderControllers.readAllInventroyPurchaseOrders
  );

inventoryPurchaseOrderRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.readOne),
    inventroyPurchaseOrderControllers.readOneInventroyPurchaseOrder
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.create),
    inventroyPurchaseOrderControllers.updateInventroyPurchaseOrder
  );

// Submit a draft PO for hotel manager approval
inventoryPurchaseOrderRouter.patch(
  "/:id/submit",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.create),
  inventroyPurchaseOrderControllers.submitPurchaseOrder
);

// Hotel manager approves or rejects the PO
inventoryPurchaseOrderRouter.patch(
  "/:id/approve",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.approve),
  inventroyPurchaseOrderControllers.approvePurchaseOrder
);

inventoryPurchaseOrderRouter.patch(
  "/:id/reject",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.approve),
  inventroyPurchaseOrderControllers.rejectPurchaseOrder
);

// Mark PO as sent to supplier
inventoryPurchaseOrderRouter.patch(
  "/:id/mark-sent",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.create),
  inventroyPurchaseOrderControllers.markPurchaseOrderSent
);

// Cancel an approved PO
inventoryPurchaseOrderRouter.patch(
  "/:id/cancel",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.create),
  inventroyPurchaseOrderControllers.cancelPurchaseOrder
);

// Download PO as PDF
inventoryPurchaseOrderRouter.get(
  "/:id/pdf",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryPurchaseOrders.readOne),
  inventroyPurchaseOrderControllers.downloadPurchaseOrderPdf
);
