import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroySupplierRatingControllers } from "../../controllers/Inventory/Inventorysuplierrating.controller";

export const inventorySupplierRatingRouter = express.Router();

inventorySupplierRatingRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.rate),
    inventroySupplierRatingControllers.createInventroySupplierRating
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.readAll),
    inventroySupplierRatingControllers.readAllInventroySupplierRatings
  );

inventorySupplierRatingRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.readOne),
    inventroySupplierRatingControllers.readOneInventroySupplierRating
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventorySuppliers.rate),
    inventroySupplierRatingControllers.deleteInventroySupplierRating
  );
