import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { BillModel } from "../models/Bill.model";

const CRUDBill: CRUD = new CRUD(BillModel);

const createBill = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBill.create(req.body, res, req);
  }
);

const readOneBill = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBill.readOne(req.params.id, res, [], req);
  }
);

const readAllBills = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBill.readAll(res, req, 1, 100, []);
  }
);

const updateBill = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBill.update(req.params.id, res, req);
  }
);

const deleteBill = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBill.delete(req.params.id, res, req);
  }
);

export const billControllers = {
  createBill,
  readOneBill,
  readAllBills,
  updateBill,
  deleteBill,
};
