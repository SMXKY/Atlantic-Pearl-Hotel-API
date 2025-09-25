import express from "express";

import { restaurantConfigControllers } from "../controllers/restaurantConfig";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantConfigRouter = express.Router();

restaurantConfigRouter
  .route("/")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantConfig.readOne),
    restaurantConfigControllers.readAllRestaurantConfigs
  );

restaurantConfigRouter
  .route("/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantConfig.update),
    restaurantConfigControllers.updateRestaurantConfig
  );
