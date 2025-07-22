import express from "express";

import { bedTypeControllers } from "../controllers/bedType.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const bedTypeRouter = express.Router();

bedTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.create),
    bedTypeControllers.createBedType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.readAll),
    bedTypeControllers.readAllBedTypes
  );

bedTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.readOne),
    bedTypeControllers.readOneBedType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.update),
    bedTypeControllers.updateBedType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.delete),
    bedTypeControllers.deleteBedType
  );

/**
 * @swagger
 * tags:
 *   name: BedTypes
 *   description: API endpoints for managing bed types in the system.
 */

/**
 * @swagger
 * /api/v1/bed-types:
 *   post:
 *     summary: Create a new bed type
 *     description: |
 *       Creates a new bed type resource with a name and optional description.
 *       The request body must contain the bed type details.
 *     tags: [BedTypes]
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
 *                 example: King Size
 *                 description: Name of the bed type.
 *               description:
 *                 type: string
 *                 example: A large bed suitable for two people
 *                 description: Description of the bed type.
 *     responses:
 *       200:
 *         description: Bed type created successfully
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
 *                     name:
 *                       type: string
 *                       example: King Size
 *                     description:
 *                       type: string
 *                       example: A large bed suitable for two people
 *                     _id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                     id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/bed-types:
 *   get:
 *     summary: Retrieve a list of all bed types
 *     description: |
 *       Returns an array of all bed type resources in the system.
 *       Each object contains detailed bed type information including timestamps.
 *     tags: [BedTypes]
 *     responses:
 *       200:
 *         description: List of bed types retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: King Size
 *                       description:
 *                         type: string
 *                         example: A large bed suitable for two people
 *                       _id:
 *                         type: string
 *                         example: 68583d1aaea0291799ea15bc
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-22T17:27:54.148Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-22T17:27:54.148Z
 *                       __v:
 *                         type: integer
 *                         example: 0
 *                       id:
 *                         type: string
 *                         example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/bed-types/{id}:
 *   get:
 *     summary: Retrieve a single bed type by ID
 *     description: |
 *       Returns the details of a specific bed type identified by its ID.
 *     tags: [BedTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the bed type to retrieve
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *     responses:
 *       200:
 *         description: Bed type retrieved successfully
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
 *                     name:
 *                       type: string
 *                       example: King Size
 *                     description:
 *                       type: string
 *                       example: A large bed suitable for two people
 *                     _id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                     id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/bed-types/{id}:
 *   patch:
 *     summary: Update a bed type by ID
 *     description: |
 *       Updates one or more properties of a bed type resource by its ID.
 *       Pass only the fields you want to update in the request body.
 *     tags: [BedTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the bed type to update
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Queen Size
 *                 description: Updated name of the bed type
 *               description:
 *                 type: string
 *                 example: A medium-sized bed for two people
 *                 description: Updated description of the bed type
 *     responses:
 *       200:
 *         description: Bed type updated successfully
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
 *                     name:
 *                       type: string
 *                       example: Queen Size
 *                     description:
 *                       type: string
 *                       example: A medium-sized bed for two people
 *                     _id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-23T10:15:12.000Z
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                     id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/bed-types/{id}:
 *   delete:
 *     summary: Delete a bed type by ID
 *     description: Deletes the bed type resource identified by the given ID.
 *     tags: [BedTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the bed type to delete
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *     responses:
 *       200:
 *         description: Bed type deleted successfully
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
 *                   example: resource successfully deleted
 */
