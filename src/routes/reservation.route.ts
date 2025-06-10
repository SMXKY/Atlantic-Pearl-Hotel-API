import express from "express";

import { reservationControllers } from "../controllers/reservation.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const reservationRouter = express.Router();

reservationRouter
  .route("/")
  .post(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.reservations.create),
    reservationControllers.createReservation
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.readAll),
    reservationControllers.readAllReservations
  );

reservationRouter
  .route("/:id")
  .get(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.reservations.readOne),
    reservationControllers.readOneReservation
  )
  .patch(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.reservations.update),
    reservationControllers.updateReservation
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.delete),
    reservationControllers.deleteReservation
  );
