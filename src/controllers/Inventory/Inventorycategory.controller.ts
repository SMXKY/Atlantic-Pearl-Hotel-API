import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryCategoryModel } from "models/Inventory/Inventorycategory.model";

const CRUDInventoryCategory: CRUD = new CRUD(InventoryCategoryModel);

const createInventoryCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryCategory.create(req.body, res, req);
  }
);

const readOneInventoryCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryCategory.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryCategories = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryCategory.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryCategory.update(req.params.id, res, req);
  }
);

const deleteInventoryCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryCategory.delete(req.params.id, res, req);
  }
);

export const InventoryCategoryControllers = {
  createInventoryCategory,
  readOneInventoryCategory,
  readAllInventoryCategories,
  updateInventoryCategory,
  deleteInventoryCategory,
};
