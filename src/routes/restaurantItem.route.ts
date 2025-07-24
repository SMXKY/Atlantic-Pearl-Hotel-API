import express from "express";

import { restaurantItemControllers } from "../controllers/restaurantItem.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";
import { handleFilesMiddleware } from "../middlewares/handleFiles.middleware";
import multer from "multer";

export const roomRouter = express.Router();
const upload = multer({ dest: "../upload" });

export const restaurantItemRouter = express.Router();

restaurantItemRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.create),
    upload.array("img", 1),
    handleFilesMiddleware,
    restaurantItemControllers.createRestaurantItem
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.readAll),
    restaurantItemControllers.readAllRestaurantItems
  );

restaurantItemRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.readOne),
    restaurantItemControllers.readOneRestaurantItem
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.update),
    upload.array("img", 1),
    handleFilesMiddleware,
    restaurantItemControllers.updateRestaurantItem
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItems.delete),
    restaurantItemControllers.deleteRestaurantItem
  );

/**
 * @swagger
 * tags:
 *   name: RestaurantItems
 *   description: CRUD operations for restaurant items
 */

/**
 * @swagger
 * /api/v1/restaurant-items:
 *   post:
 *     summary: Create a new restaurant item
 *     tags: [RestaurantItems]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - priceInCFA
 *               - prepTimeInMinutes
 *               - isPerishable
 *               - img
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Classic Burger"
 *               type:
 *                 type: string
 *                 enum: [food, drink]
 *                 example: food
 *               category:
 *                 type: string
 *                 description: ObjectId of the category (optional)
 *                 example: 64a1b2c3d4e5f67890123456
 *               priceInCFA:
 *                 type: number
 *                 example: 1500
 *               prepTimeInMinutes:
 *                 type: number
 *                 example: 15
 *               isPerishable:
 *                 type: boolean
 *                 example: true
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the item uploaded under the key 'img'
 *     responses:
 *       201:
 *         description: Restaurant item created successfully
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
 *                   $ref: '#/components/schemas/RestaurantItem'
 */

/**
 * @swagger
 * /api/v1/restaurant-items:
 *   get:
 *     summary: Get all restaurant items
 *     tags: [RestaurantItems]
 *     responses:
 *       200:
 *         description: List of restaurant items
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
 *                     $ref: '#/components/schemas/RestaurantItem'
 */

/**
 * @swagger
 * /api/v1/restaurant-items/{id}:
 *   get:
 *     summary: Get a single restaurant item by ID
 *     tags: [RestaurantItems]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant item ID
 *         schema:
 *           type: string
 *           example: 64a1b2c3d4e5f67890123456
 *     responses:
 *       200:
 *         description: Restaurant item object
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
 *                   $ref: '#/components/schemas/RestaurantItem'
 *       404:
 *         description: Item not found
 */

/**
 * @swagger
 * /api/v1/restaurant-items/{id}:
 *   patch:
 *     summary: Update a restaurant item by ID
 *     tags: [RestaurantItems]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant item ID
 *         schema:
 *           type: string
 *           example: 64a1b2c3d4e5f67890123456
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Vegetarian Burger"
 *               type:
 *                 type: string
 *                 enum: [food, drink]
 *                 example: food
 *               category:
 *                 type: string
 *                 description: ObjectId of the category (optional)
 *                 example: 64a1b2c3d4e5f67890123456
 *               priceInCFA:
 *                 type: number
 *                 example: 1600
 *               prepTimeInMinutes:
 *                 type: number
 *                 example: 12
 *               isPerishable:
 *                 type: boolean
 *                 example: true
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the item uploaded under the key 'img'
 *     responses:
 *       200:
 *         description: Restaurant item updated successfully
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
 *                   $ref: '#/components/schemas/RestaurantItem'
 *       404:
 *         description: Item not found
 */

/**
 * @swagger
 * /api/v1/restaurant-items/{id}:
 *   delete:
 *     summary: Delete a restaurant item by ID
 *     tags: [RestaurantItems]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Restaurant item ID
 *         schema:
 *           type: string
 *           example: 64a1b2c3d4e5f67890123456
 *     responses:
 *       200:
 *         description: Item deleted successfully
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
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Resource deleted successfully
 *       404:
 *         description: Item not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RestaurantItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 64a1b2c3d4e5f67890123456
 *         name:
 *           type: string
 *           example: Classic Burger
 *         type:
 *           type: string
 *           enum: [food, drink]
 *           example: food
 *         category:
 *           type: string
 *           nullable: true
 *           example: 64a1b2c3d4e5f67890123456
 *         imageUrl:
 *           type: string
 *           example: https://example.com/images/classic-burger.jpg
 *         description:
 *           type: string
 *           example: A delicious classic beef burger with cheese and lettuce.
 *         priceInCFA:
 *           type: number
 *           example: 1500
 *         prepTimeInMinutes:
 *           type: number
 *           example: 15
 *         isAvailable:
 *           type: boolean
 *           example: true
 *         availableToday:
 *           type: boolean
 *           example: false
 *         isPerishable:
 *           type: boolean
 *           example: true
 *         stock:
 *           type: number
 *           nullable: true
 *           example: null
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-24T03:29:04.161Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-24T03:29:04.161Z
 *         id:
 *           type: string
 *           example: 64a1b2c3d4e5f67890123456
 */
