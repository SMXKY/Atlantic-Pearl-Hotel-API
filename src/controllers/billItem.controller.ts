import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { BillItemModel } from "../models/BillItem.model";

const CRUDBillItem: CRUD = new CRUD(BillItemModel);

const createBillItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBillItem.create(req.body, res, req);
  }
);

const readOneBillItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBillItem.readOne(req.params.id, res, [], req);
  }
);

const readAllBillItems = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBillItem.readAll(res, req, 1, 100, []);
  }
);

const updateBillItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBillItem.update(req.params.id, res, req);
  }
);

const deleteBillItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBillItem.delete(req.params.id, res, req);
  }
);

export const billItemControllers = {
  createBillItem,
  readOneBillItem,
  readAllBillItems,
  updateBillItem,
  deleteBillItem,
};
