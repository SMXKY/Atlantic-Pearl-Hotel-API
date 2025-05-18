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
