import express from "express";

import { stationControllers } from "../../controllers/HR/station.controller";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";

export const stationRouter = express.Router();

stationRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.stations.create),
    stationControllers.createStation
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.stations.readAll),
    stationControllers.readAllStations
  );

stationRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.stations.readOne),
    stationControllers.readOneStation
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.stations.update),
    stationControllers.updateStation
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.stations.delete),
    stationControllers.deleteStation
  );
