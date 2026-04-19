import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventorySupplierPaymentModel } from "models/Inventory/Inventorysupplierpayment.model";

const CRUDInventroySupplierPayment: CRUD = new CRUD(
  InventorySupplierPaymentModel
);

const createInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.create(req.body, res, req);
  }
);

const readOneInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroySupplierPayments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.readAll(res, req, 1, 100, []);
  }
);

const updateInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.update(req.params.id, res, req);
  }
);

const deleteInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.delete(req.params.id, res, req);
  }
);

export const inventroySupplierPaymentControllers = {
  createInventroySupplierPayment,
  readOneInventroySupplierPayment,
  readAllInventroySupplierPayments,
  updateInventroySupplierPayment,
  deleteInventroySupplierPayment,
};
