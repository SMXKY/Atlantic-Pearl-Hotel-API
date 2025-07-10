import express from "express";

import { rateControllers } from "../controllers/rate.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const rateRouter = express.Router();

rateRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.create),
    rateControllers.createRate
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.readAll),
    rateControllers.readAllRates
  );

rateRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.readOne),
    rateControllers.readOneRate
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.update),
    rateControllers.updateRate
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.delete),
    rateControllers.deleteRate
  );

/**
 * @swagger
 * tags:
 *   name: Rates
 *   description: API endpoints for managing room rates.
 */

/**
 * @swagger
 * /api/v1/rates:
 *   post:
 *     summary: Create a new room rate
 *     description: |
 *       Creates a new room rate resource.
 *       Ensures the rate meets the minimum price for the associated room type.
 *       Enforces unique combination of roomType and mealPlan.
 *     tags: [Rates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - description
 *               - totalPriceInCFA
 *               - mealPlan
 *               - roomType
 *             properties:
 *               code:
 *                 type: string
 *                 example: STD-RO
 *                 description: Unique code identifier for the rate.
 *               name:
 *                 type: string
 *                 example: Standard Room - Room Only
 *               description:
 *                 type: string
 *                 example: Room-only plan for Standard Room with no meals.
 *               totalPriceInCFA:
 *                 type: number
 *                 example: 15000
 *                 minimum: 100
 *                 description: Total rate price in CFA including all taxes.
 *               mealPlan:
 *                 type: string
 *                 enum: [RO, B&B, HB, FB, AI]
 *                 example: RO
 *                 description: |
 *                   Meal plan options:
 *                   - RO: Room Only
 *                   - B&B: Bed and Breakfast
 *                   - HB: Half Board (Breakfast + Dinner)
 *                   - FB: Full Board (Breakfast, Lunch, Dinner)
 *                   - AI: All Inclusive (All meals + selected drinks)
 *               occupancy:
 *                 type: integer
 *                 example: 2
 *                 description: Maximum number of guests included in this rate.
 *               roomType:
 *                 type: string
 *                 example: 6847fb6971971ba932d254c3
 *                 description: MongoDB ObjectId of the associated room type.
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Rate created successfully
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
 *                   $ref: '#/components/schemas/Rate'
 *       400:
 *         description: |
 *           Possible errors:
 *           - Missing or invalid fields
 *           - totalPriceInCFA below room type minimum
 *           - Duplicate combination of roomType and mealPlan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/rates:
 *   get:
 *     summary: Retrieve all room rates
 *     description: Returns all room rate documents in the system.
 *     tags: [Rates]
 *     responses:
 *       200:
 *         description: List of room rates
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
 *                     $ref: '#/components/schemas/Rate'
 */

/**
 * @swagger
 * /api/v1/rates/{id}:
 *   get:
 *     summary: Retrieve a rate by ID
 *     description: Returns the rate object matching the given ID.
 *     tags: [Rates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *         description: Rate ID to retrieve
 *     responses:
 *       200:
 *         description: Rate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rate'
 *       404:
 *         description: Rate not found
 */

/**
 * @swagger
 * /api/v1/rates/{id}:
 *   patch:
 *     summary: Update an existing rate
 *     description: |
 *       Update one or more fields of a rate.
 *       Cannot violate minimum price rule or duplicate mealPlan+roomType combination.
 *     tags: [Rates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the rate to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Standard Rate
 *               totalPriceInCFA:
 *                 type: number
 *                 example: 18000
 *               mealPlan:
 *                 type: string
 *                 enum: [RO, B&B, HB, FB, AI]
 *               description:
 *                 type: string
 *                 example: Updated description
 *     responses:
 *       200:
 *         description: Rate updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rate'
 *       400:
 *         description: Validation error or duplicate entry
 */

/**
 * @swagger
 * /api/v1/rates/{id}:
 *   delete:
 *     summary: Delete a rate by ID
 *     description: Permanently deletes the rate identified by the given ID.
 *     tags: [Rates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the rate to delete
 *     responses:
 *       200:
 *         description: Rate deleted successfully
 *       404:
 *         description: Rate not found
 */

////////////////////////////////////////////////////////////////////////////////////

/**
 * @swagger
 * components:
 *   schemas:
 *     Rate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *         code:
 *           type: string
 *           example: STD-BB
 *         name:
 *           type: string
 *           example: Standard with Breakfast
 *         description:
 *           type: string
 *           example: Rate includes breakfast but no other meals.
 *         totalPriceInCFA:
 *           type: number
 *           example: 17000
 *         mealPlan:
 *           type: string
 *           enum: [RO, B&B, HB, FB, AI]
 *         occupancy:
 *           type: number
 *           example: 2
 *         isActive:
 *           type: boolean
 *           example: true
 *         roomType:
 *           type: string
 *           example: 6847fb6971971ba932d254c3
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-06-22T17:27:54.148Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-06-23T10:15:12.000Z
 *         __v:
 *           type: integer
 *           example: 0
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Rate total price cannot be less than the room type minimum price
 */
