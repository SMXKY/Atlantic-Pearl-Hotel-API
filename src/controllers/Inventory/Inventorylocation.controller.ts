import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryLocationModel } from "models/Inventory/Inventorylocation.model";

const CRUDInventroyLocation: CRUD = new CRUD(InventoryLocationModel);

const createInventroyLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyLocation.create(req.body, res, req);
  }
);

const readOneInventroyLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyLocation.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyLocations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyLocation.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyLocation.update(req.params.id, res, req);
  }
);

const deleteInventroyLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyLocation.delete(req.params.id, res, req);
  }
);

export const inventroyLocationControllers = {
  createInventroyLocation,
  readOneInventroyLocation,
  readAllInventroyLocations,
  updateInventroyLocation,
  deleteInventroyLocation,
};
