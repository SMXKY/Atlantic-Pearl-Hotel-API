import express from "express";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import { inventroyStockTakeScheduleControllers } from "../../controllers/Inventory/Inventorystocktakeschedule.controller";
import trackCreatedBy, {
  trackUpdateddBy,
} from "../../middlewares/trackCreatedBy.middleware";
export const inventoryStockTakeScheduleRouter = express.Router();

inventoryStockTakeScheduleRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.initiate),
    trackCreatedBy,
    inventroyStockTakeScheduleControllers.createInventroyStockTakeSchedule
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.readAll),
    inventroyStockTakeScheduleControllers.readAllInventroyStockTakeSchedules
  );

inventoryStockTakeScheduleRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.readOne),
    inventroyStockTakeScheduleControllers.readOneInventroyStockTakeSchedule
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.initiate),
    trackUpdateddBy,
    inventroyStockTakeScheduleControllers.updateInventroyStockTakeSchedule
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.inventoryStockTakes.initiate),
    inventroyStockTakeScheduleControllers.deleteInventroyStockTakeSchedule
  );
