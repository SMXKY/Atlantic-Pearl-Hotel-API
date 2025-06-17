import express from "express";

import { roomTypeBedTypeControllers } from "../controllers/roomTypeBedType.contoller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeBedTypeRouter = express.Router();

roomTypeBedTypeRouter
  .route("/")
  .post(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.roomTypeBedTypes.create),
    roomTypeBedTypeControllers.createRoomTypeBedType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.readAll),
    roomTypeBedTypeControllers.readAllRoomTypeBedTypes
  );

roomTypeBedTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.readOne),
    roomTypeBedTypeControllers.readOneRoomTypeBedType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.update),
    roomTypeBedTypeControllers.updateRoomTypeBedType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeBedTypes.delete),
    roomTypeBedTypeControllers.deleteRoomTypeBedType
  );
