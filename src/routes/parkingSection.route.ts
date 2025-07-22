import express from "express";

import { parkingSectionControllers } from "../controllers/parkingSection.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const parkingSectionRouter = express.Router();

parkingSectionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.create),
    parkingSectionControllers.createParkingSection
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.readAll),
    parkingSectionControllers.readAllParkingSections
  );

parkingSectionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.readOne),
    parkingSectionControllers.readOneParkingSection
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.update),
    parkingSectionControllers.updateParkingSection
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.parkingSections.delete),
    parkingSectionControllers.deleteParkingSection
  );
