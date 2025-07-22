import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ParkingSectionTypeModel } from "../models/ParkingSectionType.model";

const CRUDParkingSectionType: CRUD = new CRUD(ParkingSectionTypeModel);

const createParkingSectionType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSectionType.create(req.body, res, req);
  }
);

const readOneParkingSectionType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSectionType.readOne(req.params.id, res, [], req);
  }
);

const readAllParkingSectionTypes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSectionType.readAll(res, req, 1, 100, []);
  }
);

const updateParkingSectionType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSectionType.update(req.params.id, res, req);
  }
);

const deleteParkingSectionType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSectionType.delete(req.params.id, res, req);
  }
);

export const parkingSectionTypeControllers = {
  createParkingSectionType,
  readOneParkingSectionType,
  readAllParkingSectionTypes,
  updateParkingSectionType,
  deleteParkingSectionType,
};
