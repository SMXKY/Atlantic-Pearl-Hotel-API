import express from "express";

import { amenityControllers } from "../controllers/amenity.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const amenityRouter = express.Router();

/**
 * @swagger
 * /api/v1/amenities:
 *   get:
 *     summary: Get all amenities
 *     tags: [Amenities]
 *     description: Retrieve a list of all amenities available in the system.
 *     responses:
 *       200:
 *         description: List of amenities retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Amenity'
 *   post:
 *     summary: Create a new amenity
 *     tags: [Amenities]
 *     description: Add a new amenity to the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Free Wi-Fi
 *               description:
 *                 type: string
 *                 example: Complimentary high-speed wireless internet throughout the property.
 *     responses:
 *       201:
 *         description: Amenity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Amenity'
 *
 * /api/v1/amenities/{id}:
 *   get:
 *     summary: Get a single amenity by ID
 *     tags: [Amenities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the amenity to retrieve
 *     responses:
 *       200:
 *         description: Amenity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Amenity'
 *       404:
 *         description: Amenity not found
 *
 *   patch:
 *     summary: Update an amenity by ID
 *     tags: [Amenities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the amenity to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Free Parking
 *               description:
 *                 type: string
 *                 example: On-site parking at no additional cost.
 *     responses:
 *       200:
 *         description: Amenity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Amenity'
 *       404:
 *         description: Amenity not found
 *
 *   delete:
 *     summary: Delete an amenity by ID
 *     tags: [Amenities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the amenity to delete
 *     responses:
 *       200:
 *         description: Amenity deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: resource deleted successfully
 *       404:
 *         description: Amenity not found
 *
 * components:
 *   schemas:
 *     Amenity:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6847fb6971971ba932d254c0"
 *         name:
 *           type: string
 *           example: "Free Wi-Fi"
 *         description:
 *           type: string
 *           example: "Complimentary high-speed wireless internet throughout the property."
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-10T09:31:21.065Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-10T09:31:21.065Z"
 *         __v:
 *           type: integer
 *           example: 0
 */

amenityRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.create),
    amenityControllers.createAmenity
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.readAll),
    amenityControllers.readAllAmenitys
  );

amenityRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.readOne),
    amenityControllers.readOneAmenity
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.update),
    amenityControllers.updateAmenity
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.delete),
    amenityControllers.deleteAmenity
  );
