import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { EmployeeModel } from "../models/Employee.model";
import { UserModel } from "../models/User.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";

const CRUDEmployee: CRUD = new CRUD(EmployeeModel);

const createEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.create(req.body, res, req);
  }
);

const readOneEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.readOne(req.params.id, res, ["user"], req);
  }
);

const readAllEmployees = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.readAll(res, req, 1, 100, ["user"]);
  }
);

const updateEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.update(req.params.id, res, req);
  }
);

const deleteEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.id) {
      return next(
        new AppError(
          "Employee Id is required in request parameters",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const employee = await EmployeeModel.findById(req.params.id);

    if (!employee) {
      return next(
        new AppError(
          "Employee does not exist in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    await UserModel.findByIdAndDelete(employee?.user);
    await CRUDEmployee.delete(req.params.id, res, req);
  }
);

export const employeeControllers = {
  createEmployee,
  readOneEmployee,
  readAllEmployees,
  updateEmployee,
  deleteEmployee,
};
