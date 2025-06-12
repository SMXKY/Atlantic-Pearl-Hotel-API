import express from "express";

import { reservationControllers } from "../controllers/reservation.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";
import { validateReservationItem } from "../middlewares/roomAvailibility.middleware";

export const reservationRouter = express.Router();

/**
 * @swagger
 * /api/v1/reservations:
 *   post:
 *     summary: Create a reservation and generate an invoice
 *     tags:
 *       - Reservations
 *     description: >
 *       Creates a new reservation for a guest and generates a corresponding invoice.
 *       Sends the invoice to the guest's email. This operation supports specifying rooms,
 *       rates, check-in/out dates, and special requests. All data is validated and processed within a transaction.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkInDate
 *               - checkOutDate
 *               - items
 *               - numberOfGuest
 *             properties:
 *               guestName:
 *                 type: string
 *                 example: John Doe
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               guestPhoneNumber:
 *                 type: string
 *                 example: "+237650000000"
 *               countryOfResidence:
 *                 type: string
 *                 example: Cameroon
 *               specialRequest:
 *                 type: string
 *                 example: Need early check-in if possible.
 *               checkInDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-15T14:00:00Z
 *               checkOutDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-20T11:00:00Z
 *               numberOfGuest:
 *                 type: integer
 *                 example: 4
 *               bookingSource:
 *                 type: string
 *                 example: online
 *               paymentMethod:
 *                 type: string
 *                 example: Mobile Money
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - roomType
 *                     - rate
 *                     - rooms
 *                   properties:
 *                     roomType:
 *                       type: string
 *                       example: 6847fb6971971ba932d254c3
 *                     rate:
 *                       type: string
 *                       example: 6848036a194173b47027815c
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - room
 *                           - checkIn
 *                           - checkOut
 *                         properties:
 *                           room:
 *                             type: string
 *                             example: 6847fd406656e912d7a76b91
 *                           checkIn:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-06-15T14:00:00Z
 *                           checkOut:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-06-20T11:00:00Z
 *     responses:
 *       200:
 *         description: Reservation and invoice created successfully. Email sent to guest.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Reservation and Invoice created. Email sent.
 *                     reservation:
 *                       $ref: '#/components/schemas/Reservation'
 *                     invoice:
 *                       $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Bad Request – Validation error or invalid input
 *       500:
 *         description: Internal Server Error – Unable to create reservation or send invoice
 */

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
