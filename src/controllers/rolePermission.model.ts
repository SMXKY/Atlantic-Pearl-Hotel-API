import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { RolePermissionModel } from "../models/RolePermission.model";

const CRUDRolePermission: CRUD = new CRUD(RolePermissionModel);

const createRolePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRolePermission.create(req.body, res);
  }
);

const readOneRolePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRolePermission.readOne(req.params.id, res, []);
  }
);

const readAllRolePermissions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRolePermission.readAll(res, req, 1, 100, []);
  }
);

const updateRolePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRolePermission.update(req.params.id, res, req);
  }
);

const deleteRolePermission = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRolePermission.delete(req.params.id, res);
  }
);

export const rolePermissionControllers = {
  createRolePermission,
  readOneRolePermission,
  readAllRolePermissions,
  updateRolePermission,
  deleteRolePermission,
};
