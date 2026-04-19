import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryStockTakeModel } from "models/Inventory/Inventorystocktake.model";

const CRUDInventroyStockTake: CRUD = new CRUD(InventoryStockTakeModel);

const createInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.create(req.body, res, req);
  }
);

const readOneInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyStockTakes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.update(req.params.id, res, req);
  }
);

const deleteInventroyStockTake = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyStockTake.delete(req.params.id, res, req);
  }
);

export const inventroyStockTakeControllers = {
  createInventroyStockTake,
  readOneInventroyStockTake,
  readAllInventroyStockTakes,
  updateInventroyStockTake,
  deleteInventroyStockTake,
};
