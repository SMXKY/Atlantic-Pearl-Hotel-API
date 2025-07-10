import express from "express";

import { rolePermissionControllers } from "../controllers/rolePermission.model";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const rolePermissionRouter = express.Router();

rolePermissionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rolePermissions.create),
    rolePermissionControllers.createRolePermission
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rolePermissions.readAll),
    rolePermissionControllers.readAllRolePermissions
  );

rolePermissionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rolePermissions.readOne),
    rolePermissionControllers.readOneRolePermission
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rolePermissions.update),
    rolePermissionControllers.updateRolePermission
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rolePermissions.delete),
    rolePermissionControllers.deleteRolePermission
  );

/**
 * @swagger
 * /api/v1/role-permissions:
 *   post:
 *     summary: Assign a permission to a role
 *     description: Creates a role-permission link specifying which permission is granted to which role.
 *     tags:
 *       - RolePermissions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - permission
 *             properties:
 *               role:
 *                 type: string
 *                 description: The ID of the role to assign the permission to.
 *                 example: 68260bfdc02d3ed3890cd8b5
 *               permission:
 *                 type: string
 *                 description: The ID of the permission to assign.
 *                 example: 6829cf22dec28aa0136fa307
 *     responses:
 *       200:
 *         description: Role-permission link created successfully.
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
 *                       description: RolePermission ID.
 *                     role:
 *                       type: string
 *                     permission:
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
 *     summary: Get all role-permission links
 *     description: Retrieves a list of all role-permission assignments.
 *     tags:
 *       - RolePermissions
 *     responses:
 *       200:
 *         description: A list of role-permission links.
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
 *                       role:
 *                         type: string
 *                       permission:
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
 * /api/v1/role-permissions/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: RolePermission ID
 *
 *   get:
 *     summary: Get a role-permission link by ID
 *     description: Retrieves a single role-permission assignment.
 *     tags:
 *       - RolePermissions
 *     responses:
 *       200:
 *         description: Role-permission link found.
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
 *                     role:
 *                       type: string
 *                     permission:
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
 *     summary: Update a role-permission link
 *     description: Updates the role and/or permission in an existing link.
 *     tags:
 *       - RolePermissions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               permission:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role-permission link updated successfully.
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
 *                     role:
 *                       type: string
 *                     permission:
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
 *     summary: Delete a role-permission link
 *     description: Deletes a role-permission assignment by its ID.
 *     tags:
 *       - RolePermissions
 *     responses:
 *       200:
 *         description: Role-permission link deleted successfully.
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
