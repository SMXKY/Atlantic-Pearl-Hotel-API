import express from "express";

import { roomTypeControllers } from "../controllers/roomType.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeRouter = express.Router();

roomTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.create),
    roomTypeControllers.createRoomType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.readAll),
    roomTypeControllers.readAllRoomTypes
  );

roomTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.readOne),
    roomTypeControllers.readOneRoomType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.update),
    roomTypeControllers.updateRoomType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.delete),
    roomTypeControllers.deleteRoomType
  );
