import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { RoleModel } from "../models/Role.model";

const CRUDRole: CRUD = new CRUD(RoleModel);

const createRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.create(req.body, res);
  }
);

const readOneRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.readOne(req.params.id, res, []);
  }
);

const readAllRoles = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.readAll(res, req, 1, 100, []);
  }
);

const updateRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.update(req.params.id, res, req);
  }
);

const deleteRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.delete(req.params.id, res);
  }
);

export const RoleControllers: object = {
  createRole,
  readOneRole,
  readAllRoles,
  updateRole,
  deleteRole,
};
