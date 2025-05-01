import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { UserModel } from "../models/User.model";

const CRUDUser: CRUD = new CRUD(UserModel);

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.create(req.body, res);
  }
);

const readOneUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readOne(req.params.id, res, []);
  }
);

const readAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readAll(res, req, 1, 100, []);
  }
);

const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.update(req.params.id, res, req);
  }
);

const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.delete(req.params.id, res);
  }
);

export const userControllers: object = {
  createUser,
  readOneUser,
  readAllUsers,
  updateUser,
  deleteUser,
};
