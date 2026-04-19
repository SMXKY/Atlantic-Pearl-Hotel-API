import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryAlertConfigModel } from "models/Inventory/Inventoryalertconfig.model";

const CRUDInventoryAlertConfig: CRUD = new CRUD(InventoryAlertConfigModel);

const createInventoryAlertConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryAlertConfig.create(req.body, res, req);
  }
);

const readOneInventoryAlertConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryAlertConfig.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryAlertConfigs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryAlertConfig.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryAlertConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryAlertConfig.update(req.params.id, res, req);
  }
);

const deleteInventoryAlertConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryAlertConfig.delete(req.params.id, res, req);
  }
);

export const inventoryAlertConfigControllers = {
  createInventoryAlertConfig,
  readOneInventoryAlertConfig,
  readAllInventoryAlertConfigs,
  updateInventoryAlertConfig,
  deleteInventoryAlertConfig,
};
