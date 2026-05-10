import express, { NextFunction, Request, Response } from "express";

import { reservationControllers } from "../../controllers/Reservation/reservation.controller";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { validateReservationItem } from "../../middlewares/roomAvailibility.middleware";
import { manualReservationControllers } from "../../controllers/Reservation/manualReservation.controller";

export const reservationRouter = express.Router();

reservationRouter
  .route("/")
  .post(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.reservations.create),
    validateReservationItem,
    reservationControllers.createReservation
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.readAll),
    reservationControllers.readAllReservations
  );

reservationRouter
  .route("/my-reservations")
  .get(
    authControllers.protect,
    reservationControllers.getGuestReservationPortal
  );

reservationRouter
  .route("/deposit-redirect")
  .get(reservationControllers.depositPaymentRedirect);

reservationRouter
  .route("/calendar")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.calendar),
    reservationControllers.reservationCalendar
  );

reservationRouter
  .route("/kpis")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.readAll),
    reservationControllers.getReservationKPIs
  );

reservationRouter
  .route("/manual")
  .post(
    authControllers.protect,
    authControllers.restrictTo(
      allPermissions.reservations.createManualReservation
    ),
    validateReservationItem,
    manualReservationControllers.createManualReservation
  );

reservationRouter
  .route("/manual/pay")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(
      allPermissions.reservations.updateManualReservationPay
    ),
    manualReservationControllers.payForReservation
  );

reservationRouter
  .route("/cancel/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.cancel),
    reservationControllers.cancelReservation
  );
reservationRouter.route("/update-rooms/:id").patch(
  // authControllers.protect,
  // authControllers.restrictTo(allPermissions.reservations.updateRooms),
  reservationControllers.updatingGuestRooms
);

reservationRouter
  .route("/search")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.readAll),
    reservationControllers.searchReservations
  );

reservationRouter
  .route("/by-email")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.readAll),
    reservationControllers.getCheckedInReservationsByEmail
  );

reservationRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.readOne),
    reservationControllers.readOneReservation
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.update),
    validateReservationItem,
    reservationControllers.updateReservation
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.reservations.delete),
    reservationControllers.deleteReservation
  );
