import express from "express";

import { invoiceControllers } from "../controllers/invoice.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const invoiceRouter = express.Router();

invoiceRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.invoices.create),
    invoiceControllers.createInvoice
  )
  .get(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.invoices.readAll),
    invoiceControllers.readAllInvoices
  );

invoiceRouter
  .route("/:id")
  .get(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.invoices.readOne),
    invoiceControllers.readOneInvoice
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.invoices.update),
    invoiceControllers.updateInvoice
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.invoices.delete),
    invoiceControllers.deleteInvoice
  );
