import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { EmployeeModel } from "../../models/HR/Employee.model";
import { UserModel } from "../../models/HR/User.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";

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

export const searchEmployees = async (
  req: Request<{}, {}, {}, SearchEmployeeQuery>,
  res: Response
) => {
  try {
    const { q, gender, employmentType, limit = "10" } = req.query;

    const pipeline: any[] = [
      {
        $lookup: {
          from: "users", // collection name
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
    ];

    const match: any = {};

    // 🔍 Search by name/email (from User)
    if (q) {
      match.$or = [
        { "user.name": { $regex: q, $options: "i" } },
        { "user.email": { $regex: q, $options: "i" } },
      ];
    }

    // 🎯 Filter by gender (User)
    if (gender) {
      match["user.gender"] = gender;
    }

    // 🎯 Filter by employmentType (Employee)
    if (employmentType) {
      match.employmentType = employmentType;
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "positions",
          localField: "position",
          foreignField: "_id",
          as: "position",
        },
      },
      {
        $unwind: {
          path: "$position",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          employmentType: 1,
          dateHired: 1,
          salaryInCFA: 1,

          department: 1,
          position: 1,

          "user.name": 1,
          "user.email": 1,
          "user.phoneNumber": 1,
          "user.gender": 1,
          "user.profilePictureUrl": 1,
          "user.isVerified": 1,
        },
      },
      {
        $limit: parseInt(limit),
      }
    );

    const employees = await EmployeeModel.aggregate(pipeline);

    // count (same filters, no limit)
    const countPipeline = [
      ...pipeline.filter((p) => !p.$limit),
      { $count: "total" },
    ];
    const countResult = await EmployeeModel.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: employees,
      count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Search failed" });
  }
};


export const employeeControllers = {
  createEmployee,
  readOneEmployee,
  readAllEmployees,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
};
