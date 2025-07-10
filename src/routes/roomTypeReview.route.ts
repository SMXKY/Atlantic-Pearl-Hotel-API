import express from "express";

import { roomTypeReviewControllers } from "../controllers/roomTypeReviews";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeReviewRouter = express.Router();

roomTypeReviewRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.create),
    roomTypeReviewControllers.createRoomTypeReview
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.readAll),
    roomTypeReviewControllers.readAllRoomTypeReviews
  );

roomTypeReviewRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.readOne),
    roomTypeReviewControllers.readOneRoomTypeReview
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.update),
    roomTypeReviewControllers.updateRoomTypeReview
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.delete),
    roomTypeReviewControllers.deleteRoomTypeReview
  );

/**
 * @swagger
 * /api/v1/room-type-reviews:
 *   get:
 *     summary: Get all room type reviews
 *     tags: [Room Type Reviews]
 *     responses:
 *       200:
 *         description: List of room type reviews retrieved successfully
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
 *                     $ref: '#/components/schemas/RoomTypeReview'
 *
 *   post:
 *     summary: Create a new room type review
 *     tags: [Room Type Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomType
 *               - cleanliness
 *               - amenities
 *               - comfort
 *               - location
 *               - wifiConnection
 *               - guest
 *               - review
 *               - reviewTitle
 *             properties:
 *               roomType:
 *                 type: string
 *               cleanliness:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               amenities:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               comfort:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               location:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               wifiConnection:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               guest:
 *                 type: string
 *               review:
 *                 type: string
 *               reviewTitle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room type review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomTypeReview'
 *
 * /api/v1/room-type-reviews/{id}:
 *   get:
 *     summary: Get a room type review by ID
 *     tags: [Room Type Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomTypeReview'
 *       404:
 *         description: Review not found
 *
 *   patch:
 *     summary: Update a room type review by ID
 *     tags: [Room Type Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cleanliness:
 *                 type: number
 *               amenities:
 *                 type: number
 *               comfort:
 *                 type: number
 *               location:
 *                 type: number
 *               wifiConnection:
 *                 type: number
 *               review:
 *                 type: string
 *               reviewTitle:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomTypeReview'
 *       404:
 *         description: Review not found
 *
 *   delete:
 *     summary: Delete a room type review by ID
 *     tags: [Room Type Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
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
 *         description: Review not found
 *
 * components:
 *   schemas:
 *     RoomTypeReview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         roomType:
 *           type: string
 *         guest:
 *           type: string
 *         cleanliness:
 *           type: number
 *         amenities:
 *           type: number
 *         comfort:
 *           type: number
 *         location:
 *           type: number
 *         wifiConnection:
 *           type: number
 *         review:
 *           type: string
 *         reviewTitle:
 *           type: string
 *         finalRating:
 *           type: object
 *           properties:
 *             rating:
 *               type: number
 *             remark:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         __v:
 *           type: integer
 */
