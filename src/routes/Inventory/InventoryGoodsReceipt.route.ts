import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { InventoryGoodsReceiptControllers } from "../../controllers/Inventory/Inventorygoodsreceipt.controller";

export const inventoryGoodsReceiptRouter = express.Router();

inventoryGoodsReceiptRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
    InventoryGoodsReceiptControllers.createInventoryGoodsReceipt
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
    InventoryGoodsReceiptControllers.readAllInventoryGoodsReceipts
  );

inventoryGoodsReceiptRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
    InventoryGoodsReceiptControllers.readOneInventoryGoodsReceipt
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
    InventoryGoodsReceiptControllers.updateInventoryGoodsReceipt
  );

// Post a draft GRN -- this triggers stock movements and financial events
inventoryGoodsReceiptRouter.patch(
  "/:id/post",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
  InventoryGoodsReceiptControllers.postGoodsReceipt
);

// Mark a GRN as disputed
inventoryGoodsReceiptRouter.patch(
  "/:id/dispute",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
  InventoryGoodsReceiptControllers.disputeGoodsReceipt
);

// Download GRN as PDF
inventoryGoodsReceiptRouter.get(
  "/:id/pdf",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockMovements.receive),
  InventoryGoodsReceiptControllers.downloadGoodsReceiptPdf
);
