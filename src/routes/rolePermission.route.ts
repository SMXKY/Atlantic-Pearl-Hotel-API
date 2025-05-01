import express from "express";

import { rolePermissionControllers } from "../controllers/rolePermission.model";

export const rolePermissionRouter = express.Router();

rolePermissionRouter
  .route("/")
  .post(rolePermissionControllers.createRolePermission)
  .get(rolePermissionControllers.readAllRolePermissions);

rolePermissionRouter
  .route("/:id")
  .get(rolePermissionControllers.readOneRolePermission)
  .patch(rolePermissionControllers.updateRolePermission)
  .delete(rolePermissionControllers.deleteRolePermission);
