import express from "express";

import { roleOverideControllers } from "../controllers/roleOverides.controler";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roleOverideRouter = express.Router();

roleOverideRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roleOverides.create),
    roleOverideControllers.createRoleOveride
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roleOverides.readAll),
    roleOverideControllers.readAllRoleOverides
  );

roleOverideRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roleOverides.readOne),
    roleOverideControllers.readOneRoleOveride
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roleOverides.update),
    roleOverideControllers.updateRoleOveride
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roleOverides.delete),
    roleOverideControllers.deleteRoleOveride
  );

/**
 * @swagger
 * /api/v1/role-overides:
 *   post:
 *     summary: Create a new role override
 *     description: Grants or revokes a role for a user, with optional temporary expiry.
 *     tags:
 *       - RoleOverrides
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - createdBy
 *               - role
 *               - reason
 *             properties:
 *               user:
 *                 type: string
 *                 description: ID of the user whose role is being overridden.
 *               createdBy:
 *                 type: string
 *                 description: ID of the user performing the override.
 *               role:
 *                 type: string
 *                 description: ID of the role being granted or revoked.
 *               isGranted:
 *                 type: boolean
 *                 description: Whether the role is being granted (true) or revoked (false).
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
 *                 description: Reason for granting or revoking the role.
 *                 example: Elevated access needed for project X
 *     responses:
 *       200:
 *         description: Role override created successfully.
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
 *                     role:
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
 *     summary: Get all role overrides
 *     description: Retrieves a list of all role override records.
 *     tags:
 *       - RoleOverrides
 *     responses:
 *       200:
 *         description: A list of role overrides.
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
 *                       role:
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
 *                         format: date-time
 *                       id:
 *                         type: string
 *
 * /api/v1/role-overides/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: RoleOverride ID
 *
 *   get:
 *     summary: Get a role override by ID
 *     description: Retrieves a single role override record.
 *     tags:
 *       - RoleOverrides
 *     responses:
 *       200:
 *         description: Role override found.
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
 *                     role:
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
 *   patch:
 *     summary: Update a role override
 *     description: Updates one or more fields of an existing role override.
 *     tags:
 *       - RoleOverrides
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
 *               role:
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
 *         description: Role override updated successfully.
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
 *                     role:
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
 *   delete:
 *     summary: Delete a role override
 *     description: Deletes a role override by its ID.
 *     tags:
 *       - RoleOverrides
 *     responses:
 *       200:
 *         description: Role override deleted successfully.
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
