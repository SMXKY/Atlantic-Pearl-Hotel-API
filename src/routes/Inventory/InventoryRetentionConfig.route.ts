import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyRetentionConfigControllers } from "../../controllers/Inventory/Inventoryretentionconfig.controller";
import { trackUpdateddBy } from "../../middlewares/trackCreatedBy.middleware";

export const inventoryRetentionConfigRouter = express.Router();

inventoryRetentionConfigRouter.get(
  "/",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventorySettings.manageRetention),
  inventroyRetentionConfigControllers.readAllInventroyRetentionConfigs
);

inventoryRetentionConfigRouter.patch(
  "/:id",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventorySettings.manageRetention),
  trackUpdateddBy,
  inventroyRetentionConfigControllers.updateInventroyRetentionConfig
);

inventoryRetentionConfigRouter.patch(
  "/",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventorySettings.manageRetention),
  trackUpdateddBy,
  inventroyRetentionConfigControllers.updateInventroyRetentionConfig
);
