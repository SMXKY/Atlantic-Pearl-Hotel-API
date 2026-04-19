import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryMovementModel } from "models/Inventory/Inventorymovement.model";

const CRUDInventroyMovement: CRUD = new CRUD(InventoryMovementModel);

const createInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.create(req.body, res, req);
  }
);

const readOneInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyMovements = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.update(req.params.id, res, req);
  }
);

const deleteInventroyMovement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyMovement.delete(req.params.id, res, req);
  }
);

export const inventroyMovementControllers = {
  createInventroyMovement,
  readOneInventroyMovement,
  readAllInventroyMovements,
  updateInventroyMovement,
  deleteInventroyMovement,
};
