import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { PermissionModel } from "../models/Permission.model";

const CRUDPermission: CRUD = new CRUD(PermissionModel);

const createPermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.create(req.body, res, req);
  }
);

const readOnePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.readOne(req.params.id, res, [], req);
  }
);

const readAllPermissions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.readAll(res, req, 1, 200, []);
  }
);

const updatePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.update(req.params.id, res, req);
  }
);

const deletePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDPermission.delete(req.params.id, res, req);
  }
);

export const permissionControllers = {
  createPermission,
  readOnePermission,
  readAllPermissions,
  updatePermission,
  deletePermission,
};
