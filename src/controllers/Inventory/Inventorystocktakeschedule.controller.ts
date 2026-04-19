import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryStockTakeScheduleModel } from "models/Inventory/Inventorystocktakeschedule.model";

const CRUDInventroyStockTakeSchedule: CRUD = new CRUD(
  InventoryStockTakeScheduleModel
);

const createInventroyStockTakeSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTakeSchedule.create(req.body, res, req);
  }
);

const readOneInventroyStockTakeSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTakeSchedule.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyStockTakeSchedules = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTakeSchedule.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyStockTakeSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTakeSchedule.update(req.params.id, res, req);
  }
);

const deleteInventroyStockTakeSchedule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTakeSchedule.delete(req.params.id, res, req);
  }
);

export const inventroyStockTakeScheduleControllers = {
  createInventroyStockTakeSchedule,
  readOneInventroyStockTakeSchedule,
  readAllInventroyStockTakeSchedules,
  updateInventroyStockTakeSchedule,
  deleteInventroyStockTakeSchedule,
};
