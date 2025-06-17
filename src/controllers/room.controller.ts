import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomModel } from "../models/Room.model";
import { handleFileUploads } from "../external-apis/ftpServer";
import { appResponder } from "../util/appResponder.util";
import { StatusCodes } from "http-status-codes";

const CRUDRoom: CRUD = new CRUD(RoomModel);

const createRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.imageUrl = "https://image.url";

    const room = new RoomModel(req.body);
    await room.validate();

    const roomImageUrl = await handleFileUploads(req, 2, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    room.imageUrl = roomImageUrl[0];

    await room.save();

    appResponder(StatusCodes.OK, { room }, res);
    // await CRUDRoom.create(req.body, res, req);
  }
);

const readOneRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoom.readOne(req.params.id, res, [], req);
  }
);

const readAllRooms = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoom.readAll(res, req, 1, 100, []);
  }
);

const updateRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoom.update(req.params.id, res, req);
  }
);

const deleteRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoom.delete(req.params.id, res, req);
  }
);

export const roomControllers = {
  createRoom,
  readOneRoom,
  readAllRooms,
  updateRoom,
  deleteRoom,
};
