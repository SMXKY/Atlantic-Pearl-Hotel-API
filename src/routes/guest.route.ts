import express from "express";

import { guestControllers } from "../controllers/guest.controller";

export const guestRouter = express.Router();

guestRouter
  .route("/")
  .post(guestControllers.createGuest)
  .get(guestControllers.readAllGuests);

guestRouter
  .route("/:id")
  .get(guestControllers.readOneGuest)
  .patch(guestControllers.updateGuest)
  .delete(guestControllers.deleteGuest);
