import express from "express";

import { RestaurantOrderControllers } from "../controllers/RestaurantOrder.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantOrderRouter = express.Router();

restaurantOrderRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.create),
    RestaurantOrderControllers.createRestaurantOrder
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.readAll),
    RestaurantOrderControllers.readAllRestaurantOrders
  );

restaurantOrderRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.readOne),
    RestaurantOrderControllers.readOneRestaurantOrder
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.update),
    RestaurantOrderControllers.updateRestaurantOrder
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.delete),
    RestaurantOrderControllers.deleteRestaurantOrder
  );
