import express from "express";

import { parkingSpotControllers } from "../controllers/parkingSpot.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingSpotRouter = express.Router();

parkingSpotRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.create),
    parkingSpotControllers.createParkingSpot
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.readAll),
    parkingSpotControllers.readAllParkingSpots
  );

parkingSpotRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.readOne),
    parkingSpotControllers.readOneParkingSpot
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.update),
    parkingSpotControllers.updateParkingSpot
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.delete),
    parkingSpotControllers.deleteParkingSpot
  );
