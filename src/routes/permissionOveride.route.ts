import express from "express";

import { permissionOverideControllers } from "../controllers/PermissionOveride.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const permissionOverideRouter = express.Router();

/**
 * @swagger
 * /api/v1/permission-overides:
 *   post:
 *     summary: Create a new permission override
 *     description: Grants or revokes a permission for a user, with optional temporary expiry.
 *     tags:
 *       - PermissionOverrides
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - createdBy
 *               - permission
 *               - reason
 *             properties:
 *               user:
 *                 type: string
 *                 description: ID of the user whose permission is being overridden.
 *               createdBy:
 *                 type: string
 *                 description: ID of the user performing the override.
 *               permission:
 *                 type: string
 *                 description: ID of the permission being granted or revoked.
 *               isGranted:
 *                 type: boolean
 *                 description: Whether the permission is being granted (true) or revoked (false).
 *                 example: true
 *               isTemporary:
 *                 type: boolean
 *                 description: Whether the override is temporary (true) or permanent (false).
 *                 example: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date for a temporary override.
 *                 example: 2025-12-31T23:59:59.000Z
 *               reason:
 *                 type: string
 *                 description: Reason for granting or revoking the permission.
 *                 example: Temporary access for project X
 *     responses:
 *       200:
 *         description: Permission override created successfully.
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
 *                     user:
 *                       type: string
 *                     createdBy:
 *                       type: string
 *                     permission:
 *                       type: string
 *                     isGranted:
 *                       type: boolean
 *                     isTemporary:
 *                       type: boolean
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     reason:
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
 *     summary: Get all permission overrides
 *     description: Retrieves a list of all permission override records.
 *     tags:
 *       - PermissionOverrides
 *     responses:
 *       200:
 *         description: A list of permission overrides.
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
 *                       user:
 *                         type: string
 *                       createdBy:
 *                         type: string
 *                       permission:
 *                         type: string
 *                       isGranted:
 *                         type: boolean
 *                       isTemporary:
 *                         type: boolean
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       reason:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                       id:
 *                         type: string
 *
 * /api/v1/permission-overides/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: PermissionOverride ID
 *
 *   get:
 *     summary: Get a permission override by ID
 *     description: Retrieves a single permission override record.
 *     tags:
 *       - PermissionOverrides
 *     responses:
 *       200:
 *         description: Permission override found.
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
 *                     user:
 *                       type: string
 *                     createdBy:
 *                       type: string
 *                     permission:
 *                       type: string
 *                     isGranted:
 *                       type: boolean
 *                     isTemporary:
 *                       type: boolean
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     reason:
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
 *     summary: Update a permission override
 *     description: Updates one or more fields of an existing permission override.
 *     tags:
 *       - PermissionOverrides
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               createdBy:
 *                 type: string
 *               permission:
 *                 type: string
 *               isGranted:
 *                 type: boolean
 *               isTemporary:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission override updated successfully.
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
 *                       example: Permission override updated successfully.
 *
 *   delete:
 *     summary: Delete a permission override
 *     description: Deletes a permission override by its ID.
 *     tags:
 *       - PermissionOverrides
 *     responses:
 *       200:
 *         description: Permission override deleted successfully.
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

permissionOverideRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissionOverides.create),
    permissionOverideControllers.createPermissionOveride
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissionOverides.readAll),
    permissionOverideControllers.readAllPermissionOverides
  );

permissionOverideRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissionOverides.readOne),
    permissionOverideControllers.readOnePermissionOveride
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissionOverides.update),
    permissionOverideControllers.updatePermissionOveride
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.permissionOverides.delete),
    permissionOverideControllers.deletePermissionOveride
  );
