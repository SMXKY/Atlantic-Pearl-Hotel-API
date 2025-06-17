import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomTypeBedTypesModel } from "../models/RoomTypeBedTypes.model";

const CRUDRoomTypeBedType: CRUD = new CRUD(RoomTypeBedTypesModel);

const createRoomTypeBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeBedType.create(req.body, res, req);
  }
);

const readOneRoomTypeBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeBedType.readOne(req.params.id, res, [], req);
  }
);

const readAllRoomTypeBedTypes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeBedType.readAll(res, req, 1, 100, []);
  }
);

const updateRoomTypeBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeBedType.update(req.params.id, res, req);
  }
);

const deleteRoomTypeBedType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeBedType.delete(req.params.id, res, req);
  }
);

export const roomTypeBedTypeControllers = {
  createRoomTypeBedType,
  readOneRoomTypeBedType,
  readAllRoomTypeBedTypes,
  updateRoomTypeBedType,
  deleteRoomTypeBedType,
};
