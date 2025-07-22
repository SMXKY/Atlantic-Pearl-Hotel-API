import express from "express";

import { billControllers } from "../controllers/bill.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const billRouter = express.Router();

billRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bills.create),
    billControllers.createBill
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bills.readAll),
    billControllers.readAllBills
  );

billRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bills.readOne),
    billControllers.readOneBill
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bills.update),
    billControllers.updateBill
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.bills.delete),
    billControllers.deleteBill
  );
