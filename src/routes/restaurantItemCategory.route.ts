import express from "express";

import { restaurantItemCategoryControllers } from "../controllers/restaurantItemCategory.controler";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantItemCategoryRouter = express.Router();

restaurantItemCategoryRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.create),
    restaurantItemCategoryControllers.createRestaurantItemCategory
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.readAll),
    restaurantItemCategoryControllers.readAllRestaurantItemCategorys
  );

restaurantItemCategoryRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.readOne),
    restaurantItemCategoryControllers.readOneRestaurantItemCategory
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.update),
    restaurantItemCategoryControllers.updateRestaurantItemCategory
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.delete),
    restaurantItemCategoryControllers.deleteRestaurantItemCategory
  );
