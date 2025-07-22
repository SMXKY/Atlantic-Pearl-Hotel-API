import express from "express";

import { parkingSectionTypeControllers } from "../controllers/parkingSectionType.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingSectionTypeRouter = express.Router();

parkingSectionTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.create),
    parkingSectionTypeControllers.createParkingSectionType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.readAll),
    parkingSectionTypeControllers.readAllParkingSectionTypes
  );

parkingSectionTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.readOne),
    parkingSectionTypeControllers.readOneParkingSectionType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.update),
    parkingSectionTypeControllers.updateParkingSectionType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSectionTypes.delete),
    parkingSectionTypeControllers.deleteParkingSectionType
  );
