import express from "express";

import { adminConfigurationControllers } from "../controllers/adminConfiguration.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const adminConfigurationRouter = express.Router();

adminConfigurationRouter
  .route("/")
  //   .post(adminConfigurationControllers.createAdminConfiguration)
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.adminConfigurations.read),
    adminConfigurationControllers.readAllAdminConfigurations
  );

adminConfigurationRouter
  .route("/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.adminConfigurations.update),
    adminConfigurationControllers.updateAdminConfiguration
  );
