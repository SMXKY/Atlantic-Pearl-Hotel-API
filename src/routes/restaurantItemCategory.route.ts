import express from "express";

import { restaurantItemCategoryControllers } from "../controllers/restaurantItemCategory.controler";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const restaurantItemCategoryRouter = express.Router();

restaurantItemCategoryRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.create),
    restaurantItemCategoryControllers.createRestaurantItemCategory
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.readAll),
    restaurantItemCategoryControllers.readAllRestaurantItemCategorys
  );

restaurantItemCategoryRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.readOne),
    restaurantItemCategoryControllers.readOneRestaurantItemCategory
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.update),
    restaurantItemCategoryControllers.updateRestaurantItemCategory
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.restaurantItemCategorys.delete),
    restaurantItemCategoryControllers.deleteRestaurantItemCategory
  );

/**
 * @swagger
 * tags:
 *   name: RestaurantItemCategories
 *   description: CRUD operations for restaurant item categories
 */

/**
 * @swagger
 * /api/v1/restaurant-item-categories:
 *   post:
 *     summary: Create a new restaurant item category
 *     tags: [RestaurantItemCategories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Appetizers
 *               description:
 *                 type: string
 *                 example: Starters and small plates to begin your meal
 *     responses:
 *       201:
 *         description: Category created successfully
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
 *                   $ref: '#/components/schemas/RestaurantItemCategory'
 */

/**
 * @swagger
 * /api/v1/restaurant-item-categories:
 *   get:
 *     summary: Get all restaurant item categories
 *     tags: [RestaurantItemCategories]
 *     responses:
 *       200:
 *         description: List of all restaurant item categories
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
 *                     $ref: '#/components/schemas/RestaurantItemCategory'
 */

/**
 * @swagger
 * /api/v1/restaurant-item-categories/{id}:
 *   get:
 *     summary: Get a single restaurant item category by ID
 *     tags: [RestaurantItemCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The category ID
 *         schema:
 *           type: string
 *           example: 6881a8801efe1a8a0d8e1cf7
 *     responses:
 *       200:
 *         description: Restaurant item category object
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
 *                   $ref: '#/components/schemas/RestaurantItemCategory'
 *       404:
 *         description: Category not found
 */

/**
 * @swagger
 * /api/v1/restaurant-item-categories/{id}:
 *   patch:
 *     summary: Update a restaurant item category by ID
 *     tags: [RestaurantItemCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The category ID
 *         schema:
 *           type: string
 *           example: 6881a8801efe1a8a0d8e1cf7
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Vegetarian Appetizers
 *               description:
 *                 type: string
 *                 example: Starters and small plates to begin your meal
 *     responses:
 *       200:
 *         description: Updated category object
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
 *                   $ref: '#/components/schemas/RestaurantItemCategory'
 *       404:
 *         description: Category not found
 */

/**
 * @swagger
 * /api/v1/restaurant-item-categories/{id}:
 *   delete:
 *     summary: Delete a restaurant item category by ID
 *     tags: [RestaurantItemCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The category ID
 *         schema:
 *           type: string
 *           example: 6881a8801efe1a8a0d8e1cf7
 *     responses:
 *       200:
 *         description: Resource deleted successfully
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
 *         description: Category not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RestaurantItemCategory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 6881a8801efe1a8a0d8e1cf7
 *         name:
 *           type: string
 *           example: Appetizers
 *         description:
 *           type: string
 *           example: Starters and small plates to begin your meal
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-24T03:29:04.161Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-24T03:29:04.161Z
 *         __v:
 *           type: integer
 *           example: 0
 *         id:
 *           type: string
 *           example: 6881a8801efe1a8a0d8e1cf7
 */
