import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoleModel } from "../models/Role.model";

const CRUDRole: CRUD = new CRUD(RoleModel);

const createRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.create(req.body, res, req);
  }
);

const readOneRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRole.readOne(req.params.id, res, [], req);
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
    await CRUDRole.delete(req.params.id, res, req);
  }
);

export const roleControllers = {
  createRole,
  readOneRole,
  readAllRoles,
  updateRole,
  deleteRole,
};
