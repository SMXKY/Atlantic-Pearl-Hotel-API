import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoleOverideModel } from "../models/RoleOveride.model";

const CRUDroleOveride: CRUD = new CRUD(RoleOverideModel);

const createRoleOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDroleOveride.create(req.body, res, req);
  }
);

const readOneRoleOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDroleOveride.readOne(req.params.id, res, [], req);
  }
);

const readAllRoleOverides = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDroleOveride.readAll(res, req, 1, 100, []);
  }
);

const updateRoleOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDroleOveride.update(req.params.id, res, req);
  }
);

const deleteRoleOveride = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDroleOveride.delete(req.params.id, res, req);
  }
);

export const roleOverideControllers = {
  createRoleOveride,
  readOneRoleOveride,
  readAllRoleOverides,
  updateRoleOveride,
  deleteRoleOveride,
};
