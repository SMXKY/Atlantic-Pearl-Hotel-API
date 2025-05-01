import express from "express";

import { permissionOverideControllers } from "../controllers/PermissionOveride.controller";

export const permissionOverideRouter = express.Router();

permissionOverideRouter
  .route("/")
  .post(permissionOverideControllers.createPermissionOveride)
  .get(permissionOverideControllers.readAllPermissionOverides);

permissionOverideRouter
  .route("/:id")
  .get(permissionOverideControllers.readOnePermissionOveride)
  .patch(permissionOverideControllers.updatePermissionOveride)
  .delete(permissionOverideControllers.deletePermissionOveride);
