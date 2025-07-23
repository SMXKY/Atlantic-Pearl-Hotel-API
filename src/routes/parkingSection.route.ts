import express from "express";

import { parkingSectionControllers } from "../controllers/parkingSection.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingSectionRouter = express.Router();

parkingSectionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.create),
    parkingSectionControllers.createParkingSection
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.readAll),
    parkingSectionControllers.readAllParkingSections
  );

parkingSectionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.readOne),
    parkingSectionControllers.readOneParkingSection
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.update),
    parkingSectionControllers.updateParkingSection
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.delete),
    parkingSectionControllers.deleteParkingSection
  );

/**
 * @swagger
 * tags:
 *   name: Parking Sections
 *   description: Manage parking sections within the system
 *
 * /api/v1/parking-sections:
 *   post:
 *     summary: Create a new parking section
 *     tags: [Parking Sections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Parking Section A
 *               type:
 *                 type: string
 *                 example: 688067d2e50c6bba897acea1
 *               description:
 *                 type: string
 *                 example: Section A is near building one
 *               capacity:
 *                 type: number
 *                 example: 20
 *     responses:
 *       201:
 *         description: Parking section created successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 name: Parking Section A
 *                 type: 688067d2e50c6bba897acea1
 *                 description: Section A is near building one
 *                 capacity: 20
 *                 isActive: true
 *                 _id: 6880702a698c05b6586beada
 *                 createdAt: 2025-07-23T05:16:26.153Z
 *                 updatedAt: 2025-07-23T05:16:26.153Z
 *                 __v: 0
 *                 id: 6880702a698c05b6586beada
 *
 *   get:
 *     summary: Get all parking sections
 *     tags: [Parking Sections]
 *     responses:
 *       200:
 *         description: List of parking sections
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 - _id: 6880702a698c05b6586beada
 *                   name: Parking Section A
 *                   type: 688067d2e50c6bba897acea1
 *                   description: Section A is near building one
 *                   capacity: 20
 *                   isActive: true
 *                   createdAt: 2025-07-23T05:16:26.153Z
 *                   updatedAt: 2025-07-23T05:16:26.153Z
 *                   __v: 0
 *                   parkingSpots: []
 *                   id: 6880702a698c05b6586beada
 *
 * /api/v1/parking-sections/{id}:
 *   get:
 *     summary: Get a single parking section by ID
 *     tags: [Parking Sections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parking section
 *     responses:
 *       200:
 *         description: Parking section retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 _id: 6880702a698c05b6586beada
 *                 name: Parking Section A
 *                 type: 688067d2e50c6bba897acea1
 *                 description: Section A is near building one
 *                 capacity: 20
 *                 isActive: true
 *                 createdAt: 2025-07-23T05:16:26.153Z
 *                 updatedAt: 2025-07-23T05:16:26.153Z
 *                 __v: 0
 *                 parkingSpots: []
 *                 id: 6880702a698c05b6586beada
 *
 *   patch:
 *     summary: Update a parking section by ID
 *     tags: [Parking Sections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parking section
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Parking Section A
 *               type:
 *                 type: string
 *                 example: 688067d2e50c6bba897acea1
 *               description:
 *                 type: string
 *                 example: Section A22 is near building one
 *               capacity:
 *                 type: number
 *                 example: 20
 *     responses:
 *       200:
 *         description: Parking section updated successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 _id: 6880702a698c05b6586beada
 *                 name: Parking Section A
 *                 type: 688067d2e50c6bba897acea1
 *                 description: Section A22 is near building one
 *                 capacity: 20
 *                 isActive: true
 *                 createdAt: 2025-07-23T05:16:26.153Z
 *                 updatedAt: 2025-07-23T05:18:25.649Z
 *                 __v: 0
 *                 id: 6880702a698c05b6586beada
 *
 *   delete:
 *     summary: Delete a parking section by ID
 *     tags: [Parking Sections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parking section
 *     responses:
 *       200:
 *         description: Parking section deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 message: Resource deleted successfully
 */
