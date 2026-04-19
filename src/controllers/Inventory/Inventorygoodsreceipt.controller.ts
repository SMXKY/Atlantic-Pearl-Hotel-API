import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryGoodsReceiptModel } from "models/Inventory/Inventorygoodsreceipt.model";

const CRUDInventoryGoodsReceipt: CRUD = new CRUD(InventoryGoodsReceiptModel);

const createInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.create(req.body, res, req);
  }
);

const readOneInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryGoodsReceipts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.update(req.params.id, res, req);
  }
);

const deleteInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.delete(req.params.id, res, req);
  }
);

export const InventoryGoodsReceiptControllers = {
  createInventoryGoodsReceipt,
  readOneInventoryGoodsReceipt,
  readAllInventoryGoodsReceipts,
  updateInventoryGoodsReceipt,
  deleteInventoryGoodsReceipt,
};
