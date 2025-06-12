import express from "express";

import { discountControllers } from "../controllers/discount.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const discountRouter = express.Router();

discountRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.discounts.create),
    discountControllers.createDiscount
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.discounts.readAll),
    discountControllers.readAllDiscounts
  );

discountRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.discounts.readOne),
    discountControllers.readOneDiscount
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.discounts.update),
    discountControllers.updateDiscount
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.discounts.delete),
    discountControllers.deleteDiscount
  );
