import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomTypeModel } from "../models/RoomType.model";
import { handleFileUploads } from "../external-apis/ftpServer";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { RoomMedia } from "../models/RoomImages.model";
import { appResponder } from "../util/appResponder.util";

const CRUDRoomType: CRUD = new CRUD(RoomTypeModel);

const createRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // console.log(req.body);
    const roomType = new RoomTypeModel(req.body);
    await roomType.validate();
    await roomType.save();

    const roomTypeFileUrls = await handleFileUploads(req, 8, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    if (!roomTypeFileUrls || roomTypeFileUrls.length === 0) {
      return next(
        new AppError(
          "Room type images are required, to create a room type",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const mediaPromises = roomTypeFileUrls.map((url) => {
      const fileType = String(url).split(".").pop();

      if (!fileType) {
        return Promise.reject(
          new AppError(
            "Invalid url creation for this media",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      return RoomMedia.create({
        url,
        roomType: roomType._id,
        mediaType: "Image",
      });
    });

    try {
      await Promise.all(mediaPromises);
    } catch (err) {
      return next(err); // Pass error to global error handler
    }

    appResponder(StatusCodes.OK, roomType, res);
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
