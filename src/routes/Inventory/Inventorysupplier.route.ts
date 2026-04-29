import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventorySupplierControllers } from "../../controllers/Inventory/Inventorysupplier.controller";
import trackCreatedBy, {
  trackUpdateddBy,
} from "../../middlewares/trackCreatedBy.middleware";
export const inventorySupplierRouter = express.Router();

inventorySupplierRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.create),
    trackCreatedBy,
    inventorySupplierControllers.createInventorySupplier
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.readAll),
    inventorySupplierControllers.readAllInventorySuppliers
  );

inventorySupplierRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.readOne),
    inventorySupplierControllers.readOneInventorySupplier
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.update),
    trackUpdateddBy,
    inventorySupplierControllers.updateInventorySupplier
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.delete),
    inventorySupplierControllers.deleteInventorySupplier
  );

inventorySupplierRouter.patch(
  "/:id/blacklist",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventorySuppliers.update),
  trackUpdateddBy,
  inventorySupplierControllers.blacklistSupplier
);

inventorySupplierRouter.patch(
  "/:id/unblacklist",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventorySuppliers.update),
  inventorySupplierControllers.unblacklistSupplier
);

inventorySupplierRouter.get(
  "/:id/performance",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventorySuppliers.readOne),
  inventorySupplierControllers.getSupplierPerformance
);
