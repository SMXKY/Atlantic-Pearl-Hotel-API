import express from "express";

import { restaurantCartControllers } from "../controllers/restaurantCart.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantCartRouter = express.Router();

restaurantCartRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCarts.create),
    restaurantCartControllers.createRestaurantCart
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCarts.readAll),
    restaurantCartControllers.readAllRestaurantCarts
  );

restaurantCartRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCarts.readOne),
    restaurantCartControllers.readOneRestaurantCart
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCarts.update),
    restaurantCartControllers.updateRestaurantCart
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantCarts.delete),
    restaurantCartControllers.deleteRestaurantCart
  );
