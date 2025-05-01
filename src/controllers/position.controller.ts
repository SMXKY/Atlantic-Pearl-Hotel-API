import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { PositionModel } from "../models/Position.model";

const CRUDPosition: CRUD = new CRUD(PositionModel);

const createPosition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPosition.create(req.body, res);
  }
);

const readOnePosition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPosition.readOne(req.params.id, res, []);
  }
);

const readAllPositions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPosition.readAll(res, req, 1, 100, []);
  }
);

const updatePosition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPosition.update(req.params.id, res, req);
  }
);

const deletePosition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPosition.delete(req.params.id, res);
  }
);

export const positionControllers = {
  createPosition,
  readOnePosition,
  readAllPositions,
  updatePosition,
  deletePosition,
};
