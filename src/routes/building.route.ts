import express from "express";

import { buildingControllers } from "../controllers/building.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const buildingRouter = express.Router();

buildingRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.buildings.create),
    buildingControllers.createBuilding
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.buildings.readAll),
    buildingControllers.readAllBuildings
  );

buildingRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.buildings.readOne),
    buildingControllers.readOneBuilding
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.buildings.update),
    buildingControllers.updateBuilding
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.buildings.delete),
    buildingControllers.deleteBuilding
  );
