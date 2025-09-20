import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomModel } from "../models/Room.model";
import { handleFileUploads } from "../external-apis/ftpServer";
import { appResponder } from "../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { deleteFileFromFTP } from "../external-apis/ftpServer";
import { ReservationModel } from "../models/Reservation.model";
import mongoose from "mongoose";

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
    await CRUDRoom.readOne(
      req.params.id,
      res,
      ["building", "assignedTo"],
      req,
      false
    );
  }
);

const readAllRooms = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // console.log("touched");
    await CRUDRoom.readAll(
      res,
      req,
      1,
      1000,
      ["building", "assignedTo"],
      "-createdAt",
      false
    );
  }
);

const updateRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoom.update(req.params.id, res, req);
  }
);
const deleteRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.id) {
      return next(
        new AppError(
          "Room Id is required, as URL parameter",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const room = await RoomModel.findById(req.params.id);
    if (!room) {
      return next(
        new AppError("No such room Id in the database", StatusCodes.NOT_FOUND)
      );
    }

    const exists = await ReservationModel.findOne({
      status: { $in: ["pending", "confirmed", "checked in"] },
      items: {
        $elemMatch: {
          rooms: { $elemMatch: { room: room._id } },
        },
      },
    });

    if (exists) {
      return next(
        new AppError(
          "You may not delete a room tied to a pending, confirmed, or checked in reservation!",
          StatusCodes.BAD_REQUEST
        )
      );
    }

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
