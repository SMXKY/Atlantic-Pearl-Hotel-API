import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomTypeReviewModel } from "../models/RoomTypeReview.model";

const CRUDRoomTypeReview: CRUD = new CRUD(RoomTypeReviewModel);

const createRoomTypeReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeReview.create(req.body, res, req);
  }
);

const readOneRoomTypeReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeReview.readOne(req.params.id, res, [], req);
  }
);

const readAllRoomTypeReviews = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeReview.readAll(res, req, 1, 100, []);
  }
);

const updateRoomTypeReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeReview.update(req.params.id, res, req);
  }
);

const deleteRoomTypeReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomTypeReview.delete(req.params.id, res, req);
  }
);

export const roomTypeReviewControllers = {
  createRoomTypeReview,
  readOneRoomTypeReview,
  readAllRoomTypeReviews,
  updateRoomTypeReview,
  deleteRoomTypeReview,
};
