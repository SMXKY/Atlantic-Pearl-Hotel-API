import express from "express";

import { roomControllers } from "../controllers/room.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";
import { handleFilesMiddleware } from "../middlewares/handleFiles.middleware";
import multer from "multer";

export const roomRouter = express.Router();
const upload = multer({ dest: "../upload" });

roomRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rooms.create),
    upload.array("img", 1),
    handleFilesMiddleware,
    roomControllers.createRoom
  )
  .get(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.rooms.readAll),
    roomControllers.readAllRooms
  );

roomRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rooms.readOne),
    roomControllers.readOneRoom
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rooms.update),
    roomControllers.updateRoom
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rooms.delete),
    roomControllers.deleteRoom
  );
