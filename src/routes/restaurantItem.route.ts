import express from "express";

import { restaurantItemControllers } from "../controllers/restaurantItem.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantItemRouter = express.Router();

restaurantItemRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.create),
    restaurantItemControllers.createRestaurantItem
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.readAll),
    restaurantItemControllers.readAllRestaurantItems
  );

restaurantItemRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.readOne),
    restaurantItemControllers.readOneRestaurantItem
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.update),
    restaurantItemControllers.updateRestaurantItem
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.delete),
    restaurantItemControllers.deleteRestaurantItem
  );
