import express from "express";

import { roleControllers } from "../controllers/role.controller";

export const roleRouter = express.Router();

roleRouter
  .route("/")
  .post(roleControllers.createRole)
  .get(roleControllers.readAllRoles);

roleRouter
  .route("/:id")
  .get(roleControllers.readOneRole)
  .patch(roleControllers.updateRole)
  .delete(roleControllers.deleteRole);
