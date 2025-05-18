import express from "express";
import { activityLogControllers } from "../controllers/activityLog.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const activityLogRouter = express.Router();

/**
 * @swagger
 * /api/v1/activity-logs:
 *   get:
 *     summary: Retrieve activity logs
 *     description: |
 *       Fetch activity logs with optional filters for date range, collection name, user ID, and pagination.
 *
 *       **Example Request URL:**
 *       ```
 *       /api/v1/activity-logs?startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z&collectionName=users&user=64c7b37f82340f001b329a3a&page=1&limit=20
 *       ```
 *     tags:
 *       - Activity Logs
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: |
 *           Start date to filter logs (inclusive).
 *           Example: 2025-01-01T00:00:00Z
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: |
 *           End date to filter logs (inclusive).
 *           Example: 2025-12-31T23:59:59Z
 *       - in: query
 *         name: collectionName
 *         schema:
 *           type: string
 *         description: |
 *           Filter logs by collection name (e.g., "users", "employees").
 *           Example: users
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: |
 *           Filter logs by user ID.
 *           Example: 64c7b37f82340f001b329a3a
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: |
 *           Page number for pagination (default is 1).
 *           Example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: |
 *           Number of logs to return per page (default is 20).
 *           Example: 20
 *     responses:
 *       200:
 *         description: Successfully retrieved activity logs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   action:
 *                     type: string
 *                   collectionName:
 *                     type: string
 *                   user:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */

activityLogRouter
  .route("/")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.activityLogs.read),
    activityLogControllers.readActivityLogs
  );
