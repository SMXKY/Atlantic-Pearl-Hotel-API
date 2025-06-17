import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { BedTypeModel } from "../models/BedType.model";

const CRUDBedType: CRUD = new CRUD(BedTypeModel);

const createBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBedType.create(req.body, res, req);
  }
);

const readOneBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBedType.readOne(req.params.id, res, [], req);
  }
);

const readAllBedTypes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBedType.readAll(res, req, 1, 100, []);
  }
);

const updateBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBedType.update(req.params.id, res, req);
  }
);

const deleteBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBedType.delete(req.params.id, res, req);
  }
);

export const bedTypeControllers = {
  createBedType,
  readOneBedType,
  readAllBedTypes,
  updateBedType,
  deleteBedType,
};
