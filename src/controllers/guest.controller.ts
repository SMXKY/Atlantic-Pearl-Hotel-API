import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { GuestModel } from "../models/Guest.model";

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
