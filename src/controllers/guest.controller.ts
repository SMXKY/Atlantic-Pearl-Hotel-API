import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { GuestModel } from "../models/Guest.model";
import { UserModel } from "../models/User.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";

const CRUDGuest: CRUD = new CRUD(GuestModel);

const createGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.create(req.body, res, req);
  }
);

const readOneGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.readOne(req.params.id, res, ["user"], req);
  }
);

const readAllGuests = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.readAll(res, req, 1, 100, ["user"]);
  }
);

const updateGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.update(req.params.id, res, req);
  }
);

const deleteGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.id) {
      return next(
        new AppError(
          "Guest Id is required in request parameters",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const guest = await GuestModel.findById(req.params.id);

    if (!guest) {
      return next(
        new AppError(
          "Guest does not exist in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    await UserModel.findByIdAndDelete(guest?.user);
    await CRUDGuest.delete(req.params.id, res, req);
  }
);

export const guestControllers = {
  createGuest,
  readOneGuest,
  readAllGuests,
  updateGuest,
  deleteGuest,
};
