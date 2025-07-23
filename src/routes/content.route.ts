import express from "express";

import { contentControllers } from "../controllers/content.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const contentRouter = express.Router();

contentRouter
  .route("/admin-dashboard")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.content.adminDashboard),
    contentControllers.dashboardAdmin
  );

contentRouter
  .route("/reservation-dashboard")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.content.adminDashboard),
    contentControllers.reservationDashboard
  );

contentRouter
  .route("/parking-dashboard")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingReservations.readAll),
    contentControllers.parkingDashboard
  );

/**
 * @swagger
 * /api/v1/content/parking-dashboard:
 *   get:
 *     summary: Get parking dashboard statistics
 *     description: Returns the number of total, available, and occupied parking spots, along with the total revenue generated from parking reservations.
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Parking dashboard data retrieved successfully
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
 *                     numberOfParkingSpots:
 *                       type: integer
 *                       example: 1
 *                     numberOfAvailableParkingSpots:
 *                       type: integer
 *                       example: 0
 *                     numberOfOccupiedParkingSpots:
 *                       type: integer
 *                       example: 1
 *                     amountMadeInParking:
 *                       type: number
 *                       example: 70000
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Something went wrong
 */
