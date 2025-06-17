import express from "express";

import { roomTypeReviewControllers } from "../controllers/roomTypeReviews";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const roomTypeReviewRouter = express.Router();

roomTypeReviewRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.create),
    roomTypeReviewControllers.createRoomTypeReview
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.readAll),
    roomTypeReviewControllers.readAllRoomTypeReviews
  );

roomTypeReviewRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.readOne),
    roomTypeReviewControllers.readOneRoomTypeReview
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.update),
    roomTypeReviewControllers.updateRoomTypeReview
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypeReviews.delete),
    roomTypeReviewControllers.deleteRoomTypeReview
  );
