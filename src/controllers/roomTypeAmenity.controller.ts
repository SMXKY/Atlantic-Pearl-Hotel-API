import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomTypeAmenitiesModel } from "../models/RoomTypeAmenity.model";

const CRUDRoomTypeAmenity: CRUD = new CRUD(RoomTypeAmenitiesModel);

const createRoomTypeAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeAmenity.create(req.body, res, req);
  }
);

const readOneRoomTypeAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeAmenity.readOne(req.params.id, res, [], req);
  }
);

const readAllRoomTypeAmenitys = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeAmenity.readAll(res, req, 1, 100, []);
  }
);

const updateRoomTypeAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeAmenity.update(req.params.id, res, req);
  }
);

const deleteRoomTypeAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeAmenity.delete(req.params.id, res, req);
  }
);

export const roomTypeAmenityControllers = {
  createRoomTypeAmenity,
  readOneRoomTypeAmenity,
  readAllRoomTypeAmenitys,
  updateRoomTypeAmenity,
  deleteRoomTypeAmenity,
};
