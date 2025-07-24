import express from "express";

import { restaurantCartItemControllers } from "../controllers/restaurantCartItem.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantCartItemRouter = express.Router();

restaurantCartItemRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCartItems.create),
    restaurantCartItemControllers.createRestaurantCartItem
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCartItems.readAll),
    restaurantCartItemControllers.readAllRestaurantCartItems
  );

restaurantCartItemRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCartItems.readOne),
    restaurantCartItemControllers.readOneRestaurantCartItem
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCartItems.update),
    restaurantCartItemControllers.updateRestaurantCartItem
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCartItems.delete),
    restaurantCartItemControllers.deleteRestaurantCartItem
  );
