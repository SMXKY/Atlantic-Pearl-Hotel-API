import express from "express";

import { contentControllers } from "../controllers/content.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const contentRouter = express.Router();

contentRouter.route("/admin-dashboard").get(
  // authControllers.protect,
  //   authControllers.restrictTo(allPermissions.content.adminDashboard),
  contentControllers.dashboardAdmin
);
