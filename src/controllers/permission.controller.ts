import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { PermissionModel } from "../models/Permission.model";

const CRUDPermission: CRUD = new CRUD(PermissionModel);

const createPermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.create(req.body, res);
  }
);

const readOnePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.readOne(req.params.id, res, []);
  }
);

const readAllPermissions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.readAll(res, req, 1, 100, []);
  }
);

const updatePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.update(req.params.id, res, req);
  }
);

const deletePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.delete(req.params.id, res);
  }
);

export const permissionControllers: object = {
  createPermission,
  readOnePermission,
  readAllPermissions,
  updatePermission,
  deletePermission,
};
