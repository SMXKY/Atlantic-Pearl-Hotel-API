import express from "express";

import { RestaurantOrderControllers } from "../controllers/RestaurantOrder.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantOrderRouter = express.Router();

restaurantOrderRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.create),
    RestaurantOrderControllers.createRestaurantOrder
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.readAll),
    RestaurantOrderControllers.readAllRestaurantOrders
  );

restaurantOrderRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.readOne),
    RestaurantOrderControllers.readOneRestaurantOrder
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.update),
    RestaurantOrderControllers.updateRestaurantOrder
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantOrders.delete),
    RestaurantOrderControllers.deleteRestaurantOrder
  );

/**
 * @swagger
 * tags:
 *   name: RestaurantOrders
 *   description: API endpoints for managing restaurant orders.
 */

/**
 * @swagger
 * /api/v1/restaurant-orders:
 *   post:
 *     summary: Create a new restaurant order
 *     description: |
 *       Creates a new restaurant order from a cart submitted by a guest.
 *       - Validates guest ID and item availability
 *       - Rejects non-positive quantities or missing item references
 *       - Ensures stock availability for non-perishable items
 *       - Automatically computes the total amount and stores cart snapshot
 *     tags: [RestaurantOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestId
 *               - cart
 *             properties:
 *               guestId:
 *                 type: string
 *                 example: 6847fb6971971ba932d254c3
 *                 description: MongoDB ObjectId of the guest placing the order.
 *               cart:
 *                 type: array
 *                 description: List of items to include in the order.
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - amount
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       example: 6855df3f987a45bd12f12345
 *                       description: ID of the restaurant item.
 *                     amount:
 *                       type: number
 *                       minimum: 1
 *                       example: 2
 *                       description: Quantity of the item being ordered.
 *     responses:
 *       200:
 *         description: Restaurant order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestaurantOrder'
 *       400:
 *         description: |
 *           Possible validation errors:
 *           - Missing guest ID
 *           - Cart is empty or invalid
 *           - Item unavailable, out of stock, or missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Referenced item not found in DB
 */

/**
 * @swagger
 * /api/v1/restaurant-orders:
 *   get:
 *     summary: Retrieve all restaurant orders
 *     description: Returns all restaurant orders from the system.
 *     tags: [RestaurantOrders]
 *     responses:
 *       200:
 *         description: List of all restaurant orders
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
 *                     $ref: '#/components/schemas/RestaurantOrder'
 */

/**
 * @swagger
 * /api/v1/restaurant-orders/{id}:
 *   get:
 *     summary: Get a restaurant order by ID
 *     description: Retrieve details of a single restaurant order by its MongoDB ObjectId.
 *     tags: [RestaurantOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 6857cc728d192b9a2a46dd91
 *         description: The ID of the restaurant order to retrieve.
 *     responses:
 *       200:
 *         description: Restaurant order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestaurantOrder'
 *       404:
 *         description: Restaurant order not found
 */

/**
 * @swagger
 * /api/v1/restaurant-orders/{id}:
 *   patch:
 *     summary: Update a restaurant order
 *     description: |
 *       Update one or more fields of an existing restaurant order.
 *       Only status or billing-related changes should typically be made.
 *     tags: [RestaurantOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the order to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, preparing, ready, delivering, delivered, cancelled]
 *                 example: preparing
 *               addedToGuestBill:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Restaurant order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestaurantOrder'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/v1/restaurant-orders/{id}:
 *   delete:
 *     summary: Delete a restaurant order
 *     description: Permanently deletes the specified restaurant order.
 *     tags: [RestaurantOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the restaurant order to delete
 *     responses:
 *       200:
 *         description: Restaurant order deleted successfully
 *       404:
 *         description: Restaurant order not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RestaurantOrder:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 6857cc728d192b9a2a46dd91
 *         cart:
 *           type: string
 *           example: 6848a7aeb5e6ab63c527b021
 *         guest:
 *           type: string
 *           example: 6847fb6971971ba932d254c3
 *         status:
 *           type: string
 *           enum: [pending, accepted, preparing, ready, delivering, delivered, cancelled]
 *           example: pending
 *         totalAmountInCFA:
 *           type: number
 *           example: 12500
 *         addedToGuestBill:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-20T15:30:45.123Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-20T16:00:45.123Z
 *         __v:
 *           type: integer
 *           example: 0
 */
