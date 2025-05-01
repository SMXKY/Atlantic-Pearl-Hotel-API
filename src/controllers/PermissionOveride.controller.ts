import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { PermissionOverideModel } from "../models/PermissionOveride";

const CRUDPermissionOveride: CRUD = new CRUD(PermissionOverideModel);

const createPermissionOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermissionOveride.create(req.body, res);
  }
);

const readOnePermissionOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermissionOveride.readOne(req.params.id, res, []);
  }
);

const readAllPermissionOverides = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermissionOveride.readAll(res, req, 1, 100, []);
  }
);

const updatePermissionOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermissionOveride.update(req.params.id, res, req);
  }
);

const deletePermissionOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermissionOveride.delete(req.params.id, res);
  }
);

export const permissionOverideControllers: object = {
  createPermissionOveride,
  readOnePermissionOveride,
  readAllPermissionOverides,
  updatePermissionOveride,
  deletePermissionOveride,
};
