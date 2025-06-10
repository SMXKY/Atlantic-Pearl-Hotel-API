import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RateModel } from "../models/Rate.model";

const CRUDRate: CRUD = new CRUD(RateModel);

const createRate = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRate.create(req.body, res, req);
  }
);

const readOneRate = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRate.readOne(req.params.id, res, [], req);
  }
);

const readAllRates = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRate.readAll(res, req, 1, 100, []);
  }
);

const updateRate = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRate.update(req.params.id, res, req);
  }
);

const deleteRate = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRate.delete(req.params.id, res, req);
  }
);

export const rateControllers = {
  createRate,
  readOneRate,
  readAllRates,
  updateRate,
  deleteRate,
};
