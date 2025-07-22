import express from "express";

import { billItemControllers } from "../controllers/billItem.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const billItemsRouter = express.Router();

billItemsRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.billItems.create),
    billItemControllers.createBillItem
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.billItems.readAll),
    billItemControllers.readAllBillItems
  );

billItemsRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.billItems.readOne),
    billItemControllers.readOneBillItem
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.billItems.update),
    billItemControllers.updateBillItem
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.billItems.delete),
    billItemControllers.deleteBillItem
  );
