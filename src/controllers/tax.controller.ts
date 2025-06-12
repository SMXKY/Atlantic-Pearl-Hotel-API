import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { TaxModel } from "../models/Tax.model";

const CRUDTax: CRUD = new CRUD(TaxModel);

const createTax = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDTax.create(req.body, res, req);
  }
);

const readOneTax = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDTax.readOne(req.params.id, res, [], req);
  }
);

const readAllTaxes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDTax.readAll(res, req, 1, 100, []);
  }
);

const updateTax = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDTax.update(req.params.id, res, req);
  }
);

const deleteTax = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDTax.delete(req.params.id, res, req);
  }
);

export const taxControllers = {
  createTax,
  readOneTax,
  readAllTaxes,
  updateTax,
  deleteTax,
};
