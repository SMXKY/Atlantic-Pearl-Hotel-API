import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { DepartmentModel } from "../models/Department.model";

const CRUDDepartment: CRUD = new CRUD(DepartmentModel);

const createDepartment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDepartment.create(req.body, res, req);
  }
);

const readOneDepartment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDepartment.readOne(req.params.id, res, [], req);
  }
);

const readAllDepartments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDepartment.readAll(res, req, 1, 100, []);
  }
);

const updateDepartment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDepartment.update(req.params.id, res, req);
  }
);

const deleteDepartment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDDepartment.delete(req.params.id, res, req);
  }
);

export const departmentControllers = {
  createDepartment,
  readOneDepartment,
  readAllDepartments,
  updateDepartment,
  deleteDepartment,
};
