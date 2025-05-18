import express from "express";

import { permissionControllers } from "../controllers/permission.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const permissionRouter = express.Router();

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
