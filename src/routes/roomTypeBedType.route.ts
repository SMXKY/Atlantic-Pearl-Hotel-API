import express from "express";

import { roomTypeBedTypeControllers } from "../controllers/roomTypeBedType.contoller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeBedTypeRouter = express.Router();

roomTypeBedTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.create),
    roomTypeBedTypeControllers.createRoomTypeBedType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.readAll),
    roomTypeBedTypeControllers.readAllRoomTypeBedTypes
  );

roomTypeBedTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.readOne),
    roomTypeBedTypeControllers.readOneRoomTypeBedType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.update),
    roomTypeBedTypeControllers.updateRoomTypeBedType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.delete),
    roomTypeBedTypeControllers.deleteRoomTypeBedType
  );

/**
 * @swagger
 * /api/v1/room-type-bed-types:
 *   get:
 *     summary: Get all room-type and bed-type associations
 *     tags: [Room Type Bed Types]
 *     description: Retrieve all associations between room types and bed types.
 *     responses:
 *       200:
 *         description: Associations retrieved successfully
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
 *                     $ref: '#/components/schemas/RoomTypeBedType'

 *   post:
 *     summary: Create a new room-type and bed-type association
 *     tags: [Room Type Bed Types]
 *     description: Assign a bed type to a room type.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomType
 *               - bedType
 *             properties:
 *               roomType:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c0"
 *               bedType:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c1"
 *     responses:
 *       201:
 *         description: Association created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomTypeBedType'

 * /api/v1/room-type-bed-types/{id}:
 *   get:
 *     summary: Get a room-type and bed-type association by ID
 *     tags: [Room Type Bed Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room-type and bed-type association
 *     responses:
 *       200:
 *         description: Association fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomTypeBedType'
 *       404:
 *         description: Association not found

 *   patch:
 *     summary: Update a room-type and bed-type association
 *     tags: [Room Type Bed Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the association to update
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
 *               bedType:
 *                 type: string
 *                 example: "6847fb6971971ba932d254c2"
 *     responses:
 *       200:
 *         description: Association updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomTypeBedType'
 *       404:
 *         description: Association not found

 *   delete:
 *     summary: Delete a room-type and bed-type association
 *     tags: [Room Type Bed Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the association to delete
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
 *     RoomTypeBedType:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6851ac9671971ba932d25001"
 *         roomType:
 *           type: string
 *           description: ObjectId of the room type
 *           example: "6847fb6971971ba932d254c0"
 *         bedType:
 *           type: string
 *           description: ObjectId of the bed type
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
