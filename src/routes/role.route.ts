import express from "express";

import { roleControllers } from "../controllers/role.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roleRouter = express.Router();

/**
 * @swagger
 * /api/v1/roles:
 *   post:
 *     summary: Create a new role
 *     description: Creates a role with a unique name and optional description.
 *     tags:
 *       - Roles
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
 *                 description: Unique name of the role.
 *                 example: Admin
 *               description:
 *                 type: string
 *                 description: A brief description of the role.
 *                 example: Full access to all resources.
 *     responses:
 *       200:
 *         description: Role created successfully.
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
 *                       description: Role ID.
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
 *     summary: Get all roles
 *     description: Retrieves a list of all roles.
 *     tags:
 *       - Roles
 *     responses:
 *       200:
 *         description: A list of roles.
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
 * /api/v1/roles/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: Role ID
 *   get:
 *     summary: Get a role by ID
 *     description: Retrieves a single role object.
 *     tags:
 *       - Roles
 *     responses:
 *       200:
 *         description: Role found.
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
 *     summary: Update a role
 *     description: Updates one or more fields of a role.
 *     tags:
 *       - Roles
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
 *         description: Role updated successfully.
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
 *     summary: Delete a role
 *     description: Deletes a role by its ID.
 *     tags:
 *       - Roles
 *     responses:
 *       200:
 *         description: Role deleted successfully.
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

roleRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roles.create),
    roleControllers.createRole
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roles.readAll),
    roleControllers.readAllRoles
  );

roleRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roles.readOne),
    roleControllers.readOneRole
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roles.update),
    roleControllers.updateRole
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roles.delete),
    roleControllers.deleteRole
  );
