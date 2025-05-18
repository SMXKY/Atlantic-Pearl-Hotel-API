import express from "express";

import { positionControllers } from "../controllers/position.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const positionRouter = express.Router();

/**
 * @swagger
 * /api/v1/positions:
 *   post:
 *     summary: Create a new position
 *     description: Creates a new position with the provided name and description.
 *     tags:
 *       - Positions
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
 *                 description: Name of the position (must be unique).
 *                 example: "Software Engineer"
 *               description:
 *                 type: string
 *                 description: Brief description of the position's role.
 *                 example: "Responsible for designing and developing software."
 *     responses:
 *       200:
 *         description: Position created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     id:
 *                       type: string
 *
 *   get:
 *     summary: Get all positions
 *     description: Retrieves a list of all positions.
 *     tags:
 *       - Positions
 *     responses:
 *       200:
 *         description: A list of positions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       id:
 *                         type: string
 *
 * /api/v1/positions/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: Position ID
 *
 *   get:
 *     summary: Get a position by ID
 *     description: Retrieves a single position record by its ID.
 *     tags:
 *       - Positions
 *     responses:
 *       200:
 *         description: Position found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                     id:
 *                       type: string
 *
 *   patch:
 *     summary: Update a position
 *     description: Updates one or more fields of an existing position.
 *     tags:
 *       - Positions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Position updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Position updated successfully.
 *
 *   delete:
 *     summary: Delete a position
 *     description: Deletes a position by its ID.
 *     tags:
 *       - Positions
 *     responses:
 *       200:
 *         description: Position deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: resource deleted successfully
 */

positionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.create),
    positionControllers.createPosition
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.readAll),
    positionControllers.readAllPositions
  );

positionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.readOne),
    positionControllers.readOnePosition
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.update),
    positionControllers.updatePosition
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.position.delete),
    positionControllers.deletePosition
  );
