import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { Request, Response, NextFunction } from "express";
import { inventroySupplierPaymentControllers } from "../../controllers/Inventory/Inventorysupplierpayment.controller";

export const inventorySupplierPaymentRouter = express.Router();

inventorySupplierPaymentRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(
      allPermissions.inventoryFinancials.recordPayment
    ),
    (req: Request, res: Response, next: NextFunction) => {
      req.body.recordedBy = res.locals.user._id;
      next();
    },
    inventroySupplierPaymentControllers.createInventroySupplierPayment
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.read),
    inventroySupplierPaymentControllers.readAllInventroySupplierPayments
  );

inventorySupplierPaymentRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryFinancials.read),
    inventroySupplierPaymentControllers.readOneInventroySupplierPayment
  );

// Confirm a pending payment
inventorySupplierPaymentRouter.patch(
  "/:id/confirm",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryFinancials.recordPayment),
  inventroySupplierPaymentControllers.confirmSupplierPayment
);

// Reverse a confirmed payment
inventorySupplierPaymentRouter.patch(
  "/:id/reverse",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryFinancials.recordPayment),
  inventroySupplierPaymentControllers.reverseSupplierPayment
);
