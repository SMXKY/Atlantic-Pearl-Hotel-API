import express from "express";

import { taxControllers } from "../controllers/tax.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const taxRouter = express.Router();

taxRouter
  .route("/")
  .post(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.taxes.create),
    taxControllers.createTax
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.readAll),
    taxControllers.readAllTaxes
  );

taxRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.readOne),
    taxControllers.readOneTax
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.update),
    taxControllers.updateTax
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.delete),
    taxControllers.deleteTax
  );
