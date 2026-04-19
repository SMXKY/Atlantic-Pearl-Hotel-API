import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryRequisitionModel } from "models/Inventory/Inventoryrequisition.model";

const CRUDInventroyRequisition: CRUD = new CRUD(InventoryRequisitionModel);

const createInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.create(req.body, res, req);
  }
);

const readOneInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyRequisitions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.update(req.params.id, res, req);
  }
);

const deleteInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.delete(req.params.id, res, req);
  }
);

export const inventroyRequisitionControllers = {
  createInventroyRequisition,
  readOneInventroyRequisition,
  readAllInventroyRequisitions,
  updateInventroyRequisition,
  deleteInventroyRequisition,
};
