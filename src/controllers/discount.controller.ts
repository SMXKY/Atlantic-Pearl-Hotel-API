import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { DiscountModel } from "../models/Discount.model";

const CRUDDiscount: CRUD = new CRUD(DiscountModel);

const createDiscount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDiscount.create(req.body, res, req);
  }
);

const readOneDiscount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDiscount.readOne(req.params.id, res, [], req);
  }
);

const readAllDiscounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDiscount.readAll(res, req, 1, 100, []);
  }
);

const updateDiscount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDiscount.update(req.params.id, res, req);
  }
);

const deleteDiscount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDiscount.delete(req.params.id, res, req);
  }
);

export const discountControllers = {
  createDiscount,
  readOneDiscount,
  readAllDiscounts,
  updateDiscount,
  deleteDiscount,
};
