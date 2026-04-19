import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventoryLocationControllers } from "../../controllers/Inventory/Inventorylocation.controller";

export const inventoryLocationRouter = express.Router();

inventoryLocationRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryLocations.create),
    inventoryLocationControllers.createInventoryLocation
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryLocations.readAll),
    inventoryLocationControllers.readAllInventoryLocations
  );

inventoryLocationRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryLocations.readOne),
    inventoryLocationControllers.readOneInventoryLocation
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryLocations.update),
    inventoryLocationControllers.updateInventoryLocation
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryLocations.delete),
    inventoryLocationControllers.deleteInventoryLocation
  );

inventoryLocationRouter.patch(
  "/:id/deactivate",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryLocations.update),
  inventoryLocationControllers.deactivateLocation
);

inventoryLocationRouter.patch(
  "/:id/departments/link",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryLocations.update),
  inventoryLocationControllers.linkDepartment
);

inventoryLocationRouter.patch(
  "/:id/departments/unlink",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryLocations.update),
  inventoryLocationControllers.unlinkDepartment
);
