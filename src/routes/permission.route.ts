import express from "express";

import { permissionControllers } from "../controllers/permission.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const permissionRouter = express.Router();

/**
 * @swagger
 * /api/v1/permissions:
 *   post:
 *     summary: Create a new permission
 *     description: Creates a permission with a unique name and optional description.
 *     tags:
 *       - Permissions
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
 *                 description: Unique name of the permission.
 *                 example: can_read_user
 *               description:
 *                 type: string
 *                 description: A brief description of the permission.
 *                 example: Allows reading user data.
 *     responses:
 *       200:
 *         description: Permission created successfully.
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
 *                       description: Permission ID.
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
 *                       description: Same as _id.
 *   get:
 *     summary: Get all permissions
 *     description: Retrieves a list of all permissions.
 *     tags:
 *       - Permissions
 *     responses:
 *       200:
 *         description: A list of permissions.
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
 * /api/v1/permissions/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: Permission ID
 *   get:
 *     summary: Get a permission by ID
 *     description: Retrieves a single permission object.
 *     tags:
 *       - Permissions
 *     responses:
 *       200:
 *         description: Permission found.
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
 *   patch:
 *     summary: Update a permission
 *     description: Updates one or more fields of a permission.
 *     tags:
 *       - Permissions
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
 *         description: Permission updated successfully.
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
 *   delete:
 *     summary: Delete a permission
 *     description: Deletes a permission by its ID.
 *     tags:
 *       - Permissions
 *     responses:
 *       200:
 *         description: Permission deleted successfully.
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

permissionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissions.create),
    permissionControllers.createPermission
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissions.readAll),
    permissionControllers.readAllPermissions
  );

permissionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissions.readOne),
    permissionControllers.readOnePermission
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissions.update),
    permissionControllers.updatePermission
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissions.delete),
    permissionControllers.deletePermission
  );
