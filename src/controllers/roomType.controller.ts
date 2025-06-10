import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomTypeModel } from "../models/RoomType.model";

const CRUDRoomType: CRUD = new CRUD(RoomTypeModel);

const createRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.create(req.body, res, req);
  }
);

const readOneRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.readOne(req.params.id, res, [], req);
  }
);

const readAllRoomTypes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.readAll(res, req, 1, 100, []);
  }
);

const updateRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.update(req.params.id, res, req);
  }
);

const deleteRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.delete(req.params.id, res, req);
  }
);

export const roomTypeControllers = {
  createRoomType,
  readOneRoomType,
  readAllRoomTypes,
  updateRoomType,
  deleteRoomType,
};
