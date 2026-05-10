import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { EmployeeModel } from "../../models/HR/Employee.model";
import { UserModel } from "../../models/HR/User.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../../util/appResponder.util";

const CRUDEmployee: CRUD = new CRUD(EmployeeModel);

const createEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.create(req.body, res, req);
  }
);

const readOneEmployee = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.readOne(
      req.params.id,
      res,
      ["user", "department", "position"],
      req
    );
  }
);

const readAllEmployees = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDEmployee.readAll(res, req, 1, 100, [
      "user",
      "department",
      "position",
    ]);
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

interface SearchEmployeeQuery {
  q?: string;
  gender?: string;
  employmentType?: string;
  limit?: string;
}

export const search = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q, gender, employmentType, limit = "10" } = req.query;

    const filter: any = {};

    // Employee filters
    if (employmentType) {
      filter.employmentType = employmentType;
    }

    // User filters
    const userFilter: any = {
      userType: "Employee",
    };

    if (q) {
      userFilter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    if (gender) {
      userFilter.gender = gender;
    }

    // Find matching users first
    const users = await UserModel.find(userFilter).select("_id");

    const userIds = users.map((u) => u._id);

    filter.user = {
      $in: userIds,
    };

    const employees = await EmployeeModel.find(filter)
      .populate({
        path: "user",
      })
      .populate({
        path: "department",
      })
      .populate({
        path: "position",
      })
      .limit(parseInt(String(limit)))
      .lean();

    const count = await EmployeeModel.countDocuments(filter);

    appResponder(
      StatusCodes.OK,
      {
        success: true,
        count,
        data: employees,
      },
      res
    );
  } catch (err) {
    next(err);
  }
};

const getEmployeeDetails = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;

    const employee = await EmployeeModel.findOne({
      user: userId,
    })
      .populate({
        path: "user",
        select:
          "name email phoneNumber profilePictureUrl gender dateOfBirth createdAt",
      })
      .populate({
        path: "department",
        select: "name description",
      })
      .populate({
        path: "position",
        select: "name description",
      })
      .lean();

    if (!employee) {
      return next(
        new AppError(
          "No such employee exists in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    // Ensure user exists after populate
    if (!employee.user) {
      return next(
        new AppError("Associated user record not found", StatusCodes.NOT_FOUND)
      );
    }

    // Tenure calculation
    let tenure = null;

    if (employee.dateHired) {
      const dateHired = new Date(employee.dateHired);
      const now = new Date();

      let years = now.getFullYear() - dateHired.getFullYear();
      let months = now.getMonth() - dateHired.getMonth();

      // Adjust based on day of month
      if (now.getDate() < dateHired.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      tenure = `${years} year${years !== 1 ? "s" : ""}, ${months} month${
        months !== 1 ? "s" : ""
      }`;
    }

    const data = {
      id: employee._id,

      user: {
        ...(employee.user as any),
      },

      department: employee.department,
      position: employee.position,

      nationality: employee.nationality,
      residentialAddress: employee.residentialAddress,
      employmentType: employee.employmentType,

      salaryInCFA: employee.salaryInCFA,

      dateHired: employee.dateHired,
      tenure,

      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };

    appResponder(StatusCodes.OK, data, res);
  }
);
export const employeeControllers = {
  createEmployee,
  readOneEmployee,
  readAllEmployees,
  updateEmployee,
  deleteEmployee,
  search,
  getEmployeeDetails,
};
