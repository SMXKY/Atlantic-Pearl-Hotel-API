import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryItemLocationModel } from "models/Inventory/Inventoryitemlocation.model";

const CRUDInventroyItemLocation: CRUD = new CRUD(InventoryItemLocationModel);

const createInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.create(req.body, res, req);
  }
);

const readOneInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyItemLocations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.update(req.params.id, res, req);
  }
);

const deleteInventroyItemLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyItemLocation.delete(req.params.id, res, req);
  }
);

export const inventroyItemLocationControllers = {
  createInventroyItemLocation,
  readOneInventroyItemLocation,
  readAllInventroyItemLocations,
  updateInventroyItemLocation,
  deleteInventroyItemLocation,
};
