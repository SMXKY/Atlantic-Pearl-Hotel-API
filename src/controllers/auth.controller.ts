import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";
import { UserModel } from "../models/User.model";
import { appResponder } from "../util/appResponder.util";
import { EmployeeModel } from "../models/Employee.model";
import { StatusCodes } from "http-status-codes";

const createEmployeeAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await UserModel.create(req.body);

    await EmployeeModel.create({
      ...req.body,
      user: user._id,
    });

    appResponder(
      StatusCodes.OK,
      {
        ok: true,
        message: "Employee account created successfully",
      },
      res
    );
  }
);

export const authControllers = {
  createEmployeeAccount,
};
