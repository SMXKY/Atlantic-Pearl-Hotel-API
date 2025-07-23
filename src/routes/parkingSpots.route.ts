import express from "express";

import { parkingSpotControllers } from "../controllers/parkingSpot.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingSpotRouter = express.Router();

parkingSpotRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.create),
    parkingSpotControllers.createParkingSpot
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.readAll),
    parkingSpotControllers.readAllParkingSpots
  );

parkingSpotRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.readOne),
    parkingSpotControllers.readOneParkingSpot
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.update),
    parkingSpotControllers.updateParkingSpot
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSpots.delete),
    parkingSpotControllers.deleteParkingSpot
  );

/**
 * @swagger
 * tags:
 *   name: Parking Spots
 *   description: Manage individual parking spots within parking sections
 *
 * /api/v1/parking-spots:
 *   post:
 *     summary: Create a new parking spot
 *     tags: [Parking Spots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               section:
 *                 type: string
 *                 example: 688070de698c05b6586beb0c
 *               spotNumber:
 *                 type: string
 *                 example: SA20
 *     responses:
 *       201:
 *         description: Parking spot created successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 section: 688070de698c05b6586beb0c
 *                 spotNumber: SA20
 *                 type: standard
 *                 status: free
 *                 isActive: true
 *                 _id: 68807254ea8bd885def96f67
 *                 createdAt: 2025-07-23T05:25:40.893Z
 *                 updatedAt: 2025-07-23T05:25:40.893Z
 *                 __v: 0
 *                 id: 68807254ea8bd885def96f67
 *
 *   get:
 *     summary: Get all parking spots
 *     tags: [Parking Spots]
 *     responses:
 *       200:
 *         description: List of all parking spots
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 - _id: 68807254ea8bd885def96f67
 *                   section: 688070de698c05b6586beb0c
 *                   spotNumber: SA20
 *                   type: standard
 *                   status: free
 *                   isActive: true
 *                   createdAt: 2025-07-23T05:25:40.893Z
 *                   updatedAt: 2025-07-23T05:25:40.893Z
 *                   __v: 0
 *                   id: 68807254ea8bd885def96f67
 *
 * /api/v1/parking-spots/{id}:
 *   get:
 *     summary: Get a single parking spot by ID
 *     tags: [Parking Spots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the parking spot
 *     responses:
 *       200:
 *         description: Parking spot retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 _id: 68807254ea8bd885def96f67
 *                 section: 688070de698c05b6586beb0c
 *                 spotNumber: SA20
 *                 type: standard
 *                 status: free
 *                 isActive: true
 *                 createdAt: 2025-07-23T05:25:40.893Z
 *                 updatedAt: 2025-07-23T05:25:40.893Z
 *                 __v: 0
 *                 id: 68807254ea8bd885def96f67
 *
 *   patch:
 *     summary: Update a parking spot by ID
 *     tags: [Parking Spots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the parking spot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               section:
 *                 type: string
 *                 example: 688070de698c05b6586beb0c
 *               spotNumber:
 *                 type: string
 *                 example: SA2022
 *     responses:
 *       200:
 *         description: Parking spot updated successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 _id: 68807254ea8bd885def96f67
 *                 section: 688070de698c05b6586beb0c
 *                 spotNumber: SA2022
 *                 type: standard
 *                 status: free
 *                 isActive: true
 *                 createdAt: 2025-07-23T05:25:40.893Z
 *                 updatedAt: 2025-07-23T05:27:23.027Z
 *                 __v: 0
 *                 id: 68807254ea8bd885def96f67
 *
 *   delete:
 *     summary: Delete a parking spot by ID
 *     tags: [Parking Spots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the parking spot
 *     responses:
 *       200:
 *         description: Parking spot deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               status: success
 *               data:
 *                 message: Resource deleted successfully
 */
