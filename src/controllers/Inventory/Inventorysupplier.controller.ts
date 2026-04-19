import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventorySupplierModel } from "models/Inventory/Inventorysupplier.model";

const CRUDInventroySupplier: CRUD = new CRUD(InventorySupplierModel);

const createInventroySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplier.create(req.body, res, req);
  }
);

const readOneInventroySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplier.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroySuppliers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplier.readAll(res, req, 1, 100, []);
  }
);

const updateInventroySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplier.update(req.params.id, res, req);
  }
);

const deleteInventroySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplier.delete(req.params.id, res, req);
  }
);

export const inventroySupplierControllers = {
  createInventroySupplier,
  readOneInventroySupplier,
  readAllInventroySuppliers,
  updateInventroySupplier,
  deleteInventroySupplier,
};
