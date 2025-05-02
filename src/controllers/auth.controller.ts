import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";
import { UserModel } from "../models/User.model";
import { appResponder } from "../util/appResponder.util";
import { EmployeeModel } from "../models/Employee.model";
import { StatusCodes } from "http-status-codes";
import * as generatePassword from "generate-password";
import { sendEmail } from "../util/sendEmail.util";

const createEmployeeAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const employeePassword = generatePassword.generate({
      length: 8,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      strict: true,
    });

    console.log(employeePassword);

    req.body.password = employeePassword;
    req.body.passwordConfirm = employeePassword;

    const user = await UserModel.create(req.body);

    await EmployeeModel.create({
      ...req.body,
      user: user._id,
    });

    sendEmail(
      user.email,
      "Your Account Password - Atlantic Pearl Hotel and Resort",
      "Dear employee, please find your account password below.",
      `<b>Your account password: ${employeePassword}</b>`
    );

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
