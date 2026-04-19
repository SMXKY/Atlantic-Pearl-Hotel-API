import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryPurchaseOrderModel } from "models/Inventory/Inventorypurchaseorder.model";

const CRUDInventroyPurchaseOrder: CRUD = new CRUD(InventoryPurchaseOrderModel);

const createInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.create(req.body, res, req);
  }
);

const readOneInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyPurchaseOrders = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.update(req.params.id, res, req);
  }
);

const deleteInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.delete(req.params.id, res, req);
  }
);

export const inventroyPurchaseOrderControllers = {
  createInventroyPurchaseOrder,
  readOneInventroyPurchaseOrder,
  readAllInventroyPurchaseOrders,
  updateInventroyPurchaseOrder,
  deleteInventroyPurchaseOrder,
};
