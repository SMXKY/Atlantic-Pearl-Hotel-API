import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { EmployeeModel } from "../models/Employee.model";

const CRUDEmployee: CRUD = new CRUD(EmployeeModel);

const createEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.create(req.body, res);
  }
);

const readOneEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.readOne(req.params.id, res, []);
  }
);

const readAllEmployees = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.readAll(res, req, 1, 100, []);
  }
);

const updateEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.update(req.params.id, res, req);
  }
);

const deleteEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.delete(req.params.id, res);
  }
);

export const employeeControllers: object = {
  createEmployee,
  readOneEmployee,
  readAllEmployees,
  updateEmployee,
  deleteEmployee,
};
