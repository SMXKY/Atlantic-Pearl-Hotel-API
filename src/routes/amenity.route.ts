import express from "express";

import { amenityControllers } from "../controllers/amenity.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const amenityRouter = express.Router();

amenityRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.create),
    amenityControllers.createAmenity
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.readAll),
    amenityControllers.readAllAmenitys
  );

amenityRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.readOne),
    amenityControllers.readOneAmenity
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.update),
    amenityControllers.updateAmenity
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.amenities.delete),
    amenityControllers.deleteAmenity
  );
