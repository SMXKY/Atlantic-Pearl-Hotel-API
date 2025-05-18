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
