import express from "express";

import { rateControllers } from "../controllers/rate.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const rateRouter = express.Router();

rateRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.create),
    rateControllers.createRate
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.readAll),
    rateControllers.readAllRates
  );

rateRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.readOne),
    rateControllers.readOneRate
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.update),
    rateControllers.updateRate
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.rates.delete),
    rateControllers.deleteRate
  );
