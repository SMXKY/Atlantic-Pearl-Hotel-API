import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryItemModel } from "models/Inventory/Inventoryitem.model";

const CRUDInventoryItem: CRUD = new CRUD(InventoryItemModel);

const createInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.create(req.body, res, req);
  }
);

const readOneInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryItems = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.update(req.params.id, res, req);
  }
);

const deleteInventoryItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryItem.delete(req.params.id, res, req);
  }
);

export const InventoryItemControllers = {
  createInventoryItem,
  readOneInventoryItem,
  readAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
};
