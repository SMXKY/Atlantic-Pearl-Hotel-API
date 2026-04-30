import express, { NextFunction, Request, Response } from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyRequisitionControllers } from "../../controllers/Inventory/Inventoryrequisition.controller";

export const inventoryRequisitionRouter = express.Router();

inventoryRequisitionRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryRequisitions.create),
    (req: Request, res: Response, next: NextFunction) => {
      req.body.requestedBy = req.body.requestedBy
        ? req.body.requestedBy
        : res.locals.user._id;
      next();
    },
    inventroyRequisitionControllers.createInventroyRequisition
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryRequisitions.readAll),
    inventroyRequisitionControllers.readAllInventroyRequisitions
  );

// Self-service requisition — any authenticated employee
inventoryRequisitionRouter.post(
  "/self",
  authControllers.protect,
  inventroyRequisitionControllers.createSelfRequisition
);

// My requisitions history — any authenticated user
inventoryRequisitionRouter.get(
  "/my",
  authControllers.protect,
  inventroyRequisitionControllers.getMyRequisitions
);

inventoryRequisitionRouter.get(
  "/available-locations",
  authControllers.protect,
  inventroyRequisitionControllers.getAvailableLocationsForEmployee
);

inventoryRequisitionRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryRequisitions.readOne),
    inventroyRequisitionControllers.readOneInventroyRequisition
  );

// Approve, partially fulfill, or reject a requisition
inventoryRequisitionRouter.patch(
  "/:id/approve",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryRequisitions.approve),
  (req: Request, res: Response, next: NextFunction) => {
    req.body.reviewedBy = res.locals.user._id;
    next();
  },
  inventroyRequisitionControllers.approveRequisition
);

inventoryRequisitionRouter.patch(
  "/:id/reject",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryRequisitions.approve),
  (req: Request, res: Response, next: NextFunction) => {
    req.body.reviewedBy = res.locals.user._id;
    next();
  },
  inventroyRequisitionControllers.rejectRequisition
);

inventoryRequisitionRouter.patch(
  "/:id/cancel",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryRequisitions.create),
  inventroyRequisitionControllers.cancelRequisition
);
