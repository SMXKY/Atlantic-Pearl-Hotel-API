import express from "express";

import { contentControllers } from "../../controllers/Content/defaultDashbord.content";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { getDashboard } from "../../controllers/Content/dashbaord.controller";
import rateLimit from "express-rate-limit";
import { searchController } from "../../controllers/Content/search.controller";

export const contentRouter = express.Router();

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many search requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

contentRouter.post(
  "/search",
  searchLimiter,
  authControllers.protect,
  authControllers.restrictTo(
    allPermissions.employees.readAll,
    allPermissions.guest.readAll,
    allPermissions.reservations.readAll,
    allPermissions.rooms.readAll,
    allPermissions.roomTypes.readAll
  ),
  searchController
);

contentRouter
  .route("/admin-dashboard")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.content.adminDashboard),
    contentControllers.dashboardAdmin
  );

contentRouter.route("/dashboard").get(authControllers.protect, getDashboard);

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
