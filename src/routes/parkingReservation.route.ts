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

/**
 * @swagger
 * tags:
 *   name: Parking Reservations
 *   description: API endpoints for managing parking reservations
 */

/**
 * @swagger
 * /api/v1/parking-reservations:
 *   post:
 *     summary: Create a new parking reservation
 *     tags: [Parking Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestId
 *               - spotId
 *               - reservedFrom
 *               - reservedTo
 *               - reservationBookingReference
 *               - status
 *             properties:
 *               guestId:
 *                 type: string
 *               spotId:
 *                 type: string
 *               reservedFrom:
 *                 type: string
 *                 format: date-time
 *               reservedTo:
 *                 type: string
 *                 format: date-time
 *               reservationBookingReference:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [reserved, completed, cancelled]
 *     responses:
 *       201:
 *         description: Reservation created successfully
 */

/**
 * @swagger
 * /api/v1/parking-reservations:
 *   get:
 *     summary: Get all parking reservations
 *     tags: [Parking Reservations]
 *     responses:
 *       200:
 *         description: List of parking reservations
 */

/**
 * @swagger
 * /api/v1/parking-reservations/{id}:
 *   get:
 *     summary: Get a single reservation by ID
 *     tags: [Parking Reservations]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Reservation ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation found
 *       404:
 *         description: Reservation not found
 */

/**
 * @swagger
 * /api/v1/parking-reservations/{id}:
 *   patch:
 *     summary: Update a reservation status
 *     tags: [Parking Reservations]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Reservation ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [reserved, completed, cancelled]
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       404:
 *         description: Reservation not found
 */

/**
 * @swagger
 * /api/v1/parking-reservations/{id}:
 *   delete:
 *     summary: Delete a reservation by ID
 *     tags: [Parking Reservations]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Reservation ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *       404:
 *         description: Reservation not found
 */
