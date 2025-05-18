import express from "express";

import { permissionOverideControllers } from "../controllers/PermissionOveride.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const permissionOverideRouter = express.Router();

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
