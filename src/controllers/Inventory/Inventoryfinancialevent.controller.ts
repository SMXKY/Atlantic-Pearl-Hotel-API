import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryFinancialEventModel } from "models/Inventory/Inventoryfinancialevent.model";

const CRUDInventoryFinancialEnvent: CRUD = new CRUD(
  InventoryFinancialEventModel
);

const createInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.create(req.body, res, req);
  }
);

const readOneInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryFinancialEnvents = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.update(req.params.id, res, req);
  }
);

const deleteInventoryFinancialEnvent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryFinancialEnvent.delete(req.params.id, res, req);
  }
);

export const InventoryFinancialEnventControllers = {
  createInventoryFinancialEnvent,
  readOneInventoryFinancialEnvent,
  readAllInventoryFinancialEnvents,
  updateInventoryFinancialEnvent,
  deleteInventoryFinancialEnvent,
};
