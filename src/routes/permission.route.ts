import express from "express";

import { permissionControllers } from "../controllers/permission.controller";

export const permissionRouter = express.Router();

permissionRouter
  .route("/")
  .post(permissionControllers.createPermission)
  .get(permissionControllers.readAllPermissions);

permissionRouter
  .route("/:id")
  .get(permissionControllers.readOnePermission)
  .patch(permissionControllers.updatePermission)
  .delete(permissionControllers.deletePermission);
