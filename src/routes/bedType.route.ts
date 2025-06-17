import express from "express";

import { bedTypeControllers } from "../controllers/bedType.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const bedTypeRouter = express.Router();

bedTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.create),
    bedTypeControllers.createBedType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.readAll),
    bedTypeControllers.readAllBedTypes
  );

bedTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.readOne),
    bedTypeControllers.readOneBedType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.update),
    bedTypeControllers.updateBedType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bedTypes.delete),
    bedTypeControllers.deleteBedType
  );
