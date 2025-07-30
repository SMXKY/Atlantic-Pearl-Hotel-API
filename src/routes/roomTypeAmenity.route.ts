import express from "express";

import { roomTypeAmenityControllers } from "../controllers/roomTypeAmenity.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeAmenityRouter = express.Router();

roomTypeAmenityRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.create),
    roomTypeAmenityControllers.createRoomTypeAmenity
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.readAll),
    roomTypeAmenityControllers.readAllRoomTypeAmenitys
  );

roomTypeAmenityRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.readOne),
    roomTypeAmenityControllers.readOneRoomTypeAmenity
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.update),
    roomTypeAmenityControllers.updateRoomTypeAmenity
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.delete),
    roomTypeAmenityControllers.deleteRoomTypeAmenity
  );

/**
 * @swagger
 * /api/v1/room-type-amenities:
 *   get:
 *     summary: Get all room-amenity associations
 *     tags: [Room Amenities]
 *     description: Retrieve all associations between room types and amenities.
 *     responses:
 *       200:
 *         description: Associations fetched successfully
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
 *                     $ref: '#/components/schemas/RoomAmenity'

 *   post:
 *     summary: Create a new room-amenity association
 *     tags: [Room Amenities]
 *     description: Assign an amenity to a room type.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomType
 *               - amenity
 *             properties:
 *               roomType:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c0"
 *               amenity:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c1"
 *     responses:
 *       201:
 *         description: Association created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomAmenity'

 * /api/v1/room-amenities/{id}:
 *   get:
 *     summary: Get a room-amenity association by ID
 *     tags: [Room Amenities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room-amenity association
 *     responses:
 *       200:
 *         description: Association fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomAmenity'
 *       404:
 *         description: Association not found

 *   patch:
 *     summary: Update a room-amenity association
 *     tags: [Room Amenities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room-amenity association to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomType:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c0"
 *               amenity:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c2"
 *     responses:
 *       200:
 *         description: Association updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomAmenity'
 *       404:
 *         description: Association not found

 *   delete:
 *     summary: Delete a room-amenity association
 *     tags: [Room Amenities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room-amenity association to delete
 *     responses:
 *       200:
 *         description: Association deleted successfully
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
 *         description: Association not found

 * components:
 *   schemas:
 *     RoomAmenity:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6851ac9671971ba932d25001"
 *         roomType:
 *           type: string
 *           description: ObjectId of the room type
 *           example: "6847fb6971971ba932d254c0"
 *         amenity:
 *           type: string
 *           description: ObjectId of the amenity
 *           example: "6847fb6971971ba932d254c1"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-22T12:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-22T12:00:00.000Z"
 *         __v:
 *           type: integer
 *           example: 0
 */
