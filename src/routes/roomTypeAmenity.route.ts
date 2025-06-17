import express from "express";

import { roomTypeAmenityControllers } from "../controllers/roomTypeAmenity.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeAmenityRouter = express.Router();

roomTypeAmenityRouter
  .route("/")
  .post(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.roomTypeAmenities.create),
    roomTypeAmenityControllers.createRoomTypeAmenity
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.readAll),
    roomTypeAmenityControllers.readAllRoomTypeAmenitys
  );

roomTypeAmenityRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.readOne),
    roomTypeAmenityControllers.readOneRoomTypeAmenity
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.update),
    roomTypeAmenityControllers.updateRoomTypeAmenity
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeAmenities.delete),
    roomTypeAmenityControllers.deleteRoomTypeAmenity
  );
