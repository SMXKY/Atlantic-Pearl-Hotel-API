import express from "express";

import { adminConfigurationControllers } from "../controllers/adminConfiguration.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const adminConfigurationRouter = express.Router();

/**
 * @swagger
 * /api/v1/admin-configurations:
 *   get:
 *     summary: Get admin configuration settings
 *     description: Retrieve the global administrative configuration settings for the hotel system, including reservation and hotel policies.
 *     tags: [Admin Configurations]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminConfiguration'
 *
 * /api/v1/admin-configurations/{id}:
 *   patch:
 *     summary: Update admin configuration by ID
 *     description: |
 *       Update any configuration values under `reservations` or `hotel.policies`. Only the fields provided in the request will be updated.
 *     tags: [Admin Configurations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the configuration to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reservations:
 *                 type: object
 *                 properties:
 *                   minimumDepositPercentage:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: number
 *                       description:
 *                         type: string
 *                   expireAfter:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: number
 *                       description:
 *                         type: string
 *                   cancelationPolicy:
 *                     type: object
 *                     properties:
 *                       isRefundable:
 *                         type: boolean
 *                       refundableUntilInHours:
 *                         type: number
 *                       refundablePercentage:
 *                         type: number
 *               hotel:
 *                 type: object
 *                 properties:
 *                   policies:
 *                     type: object
 *                     properties:
 *                       smokingAllowed:
 *                         type: boolean
 *                       petsAllowed:
 *                         type: boolean
 *                       partyingAllowed:
 *                         type: boolean
 *                       checkInTime:
 *                         type: string
 *                       checkOutTime:
 *                         type: string
 *                       description:
 *                         type: string
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminConfiguration'
 *       404:
 *         description: Configuration not found
 *
 * components:
 *   schemas:
 *     AdminConfiguration:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6847fb6971971ba932d254c0"
 *         reservations:
 *           type: object
 *           properties:
 *             minimumDepositPercentage:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                   example: 20
 *                 description:
 *                   type: string
 *                   example: "The minimum deposit required (in %) to confirm a reservation."
 *             expireAfter:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                   example: 30
 *                 description:
 *                   type: string
 *                   example: "The number of minutes after which an unconfirmed reservation expires."
 *             cancelationPolicy:
 *               type: object
 *               properties:
 *                 isRefundable:
 *                   type: boolean
 *                   example: false
 *                 refundableUntilInHours:
 *                   type: number
 *                   example: 24
 *                 refundablePercentage:
 *                   type: number
 *                   example: 50
 *         hotel:
 *           type: object
 *           properties:
 *             policies:
 *               type: object
 *               properties:
 *                 smokingAllowed:
 *                   type: boolean
 *                   example: false
 *                 petsAllowed:
 *                   type: boolean
 *                   example: true
 *                 partyingAllowed:
 *                   type: boolean
 *                   example: false
 *                 checkInTime:
 *                   type: string
 *                   example: "14:00"
 *                 checkOutTime:
 *                   type: string
 *                   example: "11:00"
 *                 description:
 *                   type: string
 *                   example: "General hotel policies for guest conduct and expectations."
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-10T09:31:21.065Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-10T09:31:21.065Z"
 *         __v:
 *           type: number
 *           example: 0
 */

adminConfigurationRouter
  .route("/")
  // .post(adminConfigurationControllers.createAdminConfiguration)
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.adminConfigurations.read),
    adminConfigurationControllers.readAllAdminConfigurations
  );

adminConfigurationRouter
  .route("/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.adminConfigurations.update),
    adminConfigurationControllers.updateAdminConfiguration
  );
