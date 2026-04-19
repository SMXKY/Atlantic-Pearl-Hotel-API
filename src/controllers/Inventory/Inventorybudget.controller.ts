import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryBudgetModel } from "models/Inventory/Inventorybudget.model";

const CRUDInventroyBudget: CRUD = new CRUD(InventoryBudgetModel);

const createInventroyBudget = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyBudget.create(req.body, res, req);
  }
);

const readOneInventroyBudget = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyBudget.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyBudgets = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyBudget.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyBudget = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyBudget.update(req.params.id, res, req);
  }
);

const deleteInventroyBudget = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyBudget.delete(req.params.id, res, req);
  }
);

export const inventroyBudgetControllers = {
  createInventroyBudget,
  readOneInventroyBudget,
  readAllInventroyBudgets,
  updateInventroyBudget,
  deleteInventroyBudget,
};
