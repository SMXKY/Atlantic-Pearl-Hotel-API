import express from "express";

import { parkingSectionTypeControllers } from "../controllers/parkingSectionType.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingSectionTypeRouter = express.Router();

parkingSectionTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.create),
    parkingSectionTypeControllers.createParkingSectionType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.readAll),
    parkingSectionTypeControllers.readAllParkingSectionTypes
  );

parkingSectionTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.readOne),
    parkingSectionTypeControllers.readOneParkingSectionType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.update),
    parkingSectionTypeControllers.updateParkingSectionType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.delete),
    parkingSectionTypeControllers.deleteParkingSectionType
  );

/**
 * @swagger
 * tags:
 *   name: Parking Section Types
 *   description: Manage types of parking sections

 * /api/v1/parking-section-types:
 *   post:
 *     summary: Create a new parking section type
 *     tags: [Parking Section Types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Regular parking
 *               description:
 *                 type: string
 *                 example: comfortable parking for VIP Guests,
 *               hourlyRateInCFA:
 *                 type: number
 *                 example: 350
 *     responses:
 *       201:
 *         description: Successfully created parking section type
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 - name: VIP parking2
 *                   description: comfortable parking for VIP Guests,
 *                   hourlyRateInCFA: 500
 *                   _id: 68806da0e50c6bba897aced7
 *                   createdAt: 2025-07-23T05:05:36.009Z
 *                   updatedAt: 2025-07-23T05:05:36.009Z
 *                   __v: 0
 *                   id: 68806da0e50c6bba897aced7
 *                 - name: Regular parking2
 *                   description: comfortable parking for VIP Guests,
 *                   hourlyRateInCFA: 350
 *                   _id: 68806da0e50c6bba897aced8
 *                   createdAt: 2025-07-23T05:05:36.009Z
 *                   updatedAt: 2025-07-23T05:05:36.009Z
 *                   __v: 0
 *                   id: 68806da0e50c6bba897aced8

 *   get:
 *     summary: Get all parking section types
 *     tags: [Parking Section Types]
 *     responses:
 *       200:
 *         description: List of parking section types
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 - _id: 688067d2e50c6bba897acea2
 *                   name: Regular parking
 *                   description: comfortable parking for VIP Guests,
 *                   hourlyRateInCFA: 350
 *                   createdAt: 2025-07-23T04:40:50.485Z
 *                   updatedAt: 2025-07-23T04:40:50.485Z
 *                   __v: 0
 *                   id: 688067d2e50c6bba897acea2
 *                 - _id: 688067d2e50c6bba897acea1
 *                   name: VIP parking
 *                   description: comfortable parking for VIP Guests,
 *                   hourlyRateInCFA: 500
 *                   createdAt: 2025-07-23T04:40:50.484Z
 *                   updatedAt: 2025-07-23T04:40:50.484Z
 *                   __v: 0
 *                   id: 688067d2e50c6bba897acea1

 * /api/v1/parking-section-types/{id}:
 *   get:
 *     summary: Get a single parking section type by ID
 *     tags: [Parking Section Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parking section type
 *     responses:
 *       200:
 *         description: Parking section type details
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 _id: 68806da0e50c6bba897aced7
 *                 name: VIP parking2
 *                 description: comfortable parking for VIP Guests,
 *                 hourlyRateInCFA: 500
 *                 createdAt: 2025-07-23T05:05:36.009Z
 *                 updatedAt: 2025-07-23T05:05:36.009Z
 *                 __v: 0
 *                 id: 68806da0e50c6bba897aced7

 *   patch:
 *     summary: Update a parking section type by ID
 *     tags: [Parking Section Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parking section type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Regular parking22
 *               description:
 *                 type: string
 *                 example: comfortable parking for VIP Guests,
 *               hourlyRateInCFA:
 *                 type: number
 *                 example: 350
 *     responses:
 *       200:
 *         description: Updated parking section type
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 _id: 68806da0e50c6bba897aced7
 *                 name: Regular parking22
 *                 description: comfortable parking for VIP Guests,
 *                 hourlyRateInCFA: 350
 *                 createdAt: 2025-07-23T05:05:36.009Z
 *                 updatedAt: 2025-07-23T05:06:49.741Z
 *                 __v: 0
 *                 id: 68806da0e50c6bba897aced7

 *   delete:
 *     summary: Delete a parking section type by ID
 *     tags: [Parking Section Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parking section type
 *     responses:
 *       200:
 *         description: Deletion confirmation
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 message: Resource deleted successfully
 */
