import express from "express";

import { roleControllers } from "../controllers/role.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roleRouter = express.Router();

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
