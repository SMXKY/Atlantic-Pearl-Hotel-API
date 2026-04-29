import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventorySupplierRatingModel } from "../../models/Inventory/Inventorysuplierrating.model";

const CRUDInventroySupplierRating: CRUD = new CRUD(
  InventorySupplierRatingModel
);

const createInventroySupplierRating = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierRating.create(req.body, res, req);
  }
);

const readOneInventroySupplierRating = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierRating.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroySupplierRatings = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierRating.readAll(res, req, 1, 100, []);
  }
);

const updateInventroySupplierRating = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierRating.update(req.params.id, res, req);
  }
);

const deleteInventroySupplierRating = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierRating.delete(req.params.id, res, req);
  }
);

export const inventroySupplierRatingControllers = {
  createInventroySupplierRating,
  readOneInventroySupplierRating,
  readAllInventroySupplierRatings,
  updateInventroySupplierRating,
  deleteInventroySupplierRating,
};
