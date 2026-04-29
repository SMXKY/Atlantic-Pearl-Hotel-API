import express, { NextFunction, Request, Response } from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyStockTakeControllers } from "../../controllers/Inventory/Inventorystocktake.controller";

export const inventoryStockTakeRouter = express.Router();

inventoryStockTakeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.initiate),
    (req: Request, res: Response, next: NextFunction) => {
      req.body.initiatedBy = res.locals.user._id;
      next();
    },
    inventroyStockTakeControllers.createInventroyStockTake
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.readAll),
    inventroyStockTakeControllers.readAllInventroyStockTakes
  );

inventoryStockTakeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.readOne),
    inventroyStockTakeControllers.readOneInventroyStockTake
  );

// Store manager starts counting
inventoryStockTakeRouter.patch(
  "/:id/start",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockTakes.conduct),
  inventroyStockTakeControllers.startStockTake
);

// Store manager submits counts for approval
inventoryStockTakeRouter.patch(
  "/:id/submit",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockTakes.conduct),
  inventroyStockTakeControllers.submitStockTake
);

// Hotel manager approves variances
inventoryStockTakeRouter.patch(
  "/:id/approve",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockTakes.approve),
  inventroyStockTakeControllers.approveStockTake
);

// Post approved stock take -- adjusts stock levels
inventoryStockTakeRouter.patch(
  "/:id/post",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockTakes.approve),
  inventroyStockTakeControllers.postStockTake
);

// Cancel a scheduled or in-progress stock take
inventoryStockTakeRouter.patch(
  "/:id/cancel",
  authControllers.protect,
  authControllers.restrictTo(allPermissions.inventoryStockTakes.initiate),
  inventroyStockTakeControllers.cancelStockTake
);
