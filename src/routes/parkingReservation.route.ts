import express from "express";

import { parkingReservationControllers } from "../controllers/parkingReservation.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingReservationRouter = express.Router();

parkingReservationRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingReservations.create),
    parkingReservationControllers.createParkingReservation
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingReservations.readAll),
    parkingReservationControllers.readAllParkingReservations
  );

parkingReservationRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingReservations.readOne),
    parkingReservationControllers.readOneParkingReservation
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingReservations.update),
    parkingReservationControllers.updateParkingReservation
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingReservations.delete),
    parkingReservationControllers.deleteParkingReservation
  );
