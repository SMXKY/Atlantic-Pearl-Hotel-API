import express from "express";

import { guestControllers } from "../controllers/guest.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const guestRouter = express.Router();

guestRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.guest.create),
    guestControllers.createGuest
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.guest.readAll),
    guestControllers.readAllGuests
  );

guestRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.guest.readOne),
    guestControllers.readOneGuest
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.guest.update),
    guestControllers.updateGuest
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.guest.delete),
    guestControllers.deleteGuest
  );
