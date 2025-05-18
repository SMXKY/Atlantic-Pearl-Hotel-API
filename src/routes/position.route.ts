import express from "express";

import { positionControllers } from "../controllers/position.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const positionRouter = express.Router();

positionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.create),
    positionControllers.createPosition
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.readAll),
    positionControllers.readAllPositions
  );

positionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.readOne),
    positionControllers.readOnePosition
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.update),
    positionControllers.updatePosition
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.delete),
    positionControllers.deletePosition
  );
