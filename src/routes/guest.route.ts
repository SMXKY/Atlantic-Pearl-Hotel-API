import express from "express";

import { guestControllers } from "../controllers/guest.controller";
import { authControllers } from "../controllers/auth.controller";

export const guestRouter = express.Router();

guestRouter
  .route("/")
  .post(guestControllers.createGuest)
  .get(authControllers.protect, guestControllers.readAllGuests);

guestRouter
  .route("/:id")
  .get(guestControllers.readOneGuest)
  .patch(guestControllers.updateGuest)
  .delete(guestControllers.deleteGuest);
