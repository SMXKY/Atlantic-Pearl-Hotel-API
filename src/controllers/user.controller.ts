import { NextFunction, Request, Response } from "express";
import * as bcrypt from "bcrypt";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/CRUD.util";
import { UserModel } from "../models/User.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../util/appResponder.util";
import { logUserActivity } from "../util/logUserActivity.util";

const CRUDUser: CRUD = new CRUD(UserModel);

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.create(req.body, res, req);
  }
);

const readOneUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readOne(req.params.id, res, [], req);
  }
);

const readAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readAll(res, req, 1, 100, []);
  }
);

const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.password) {
      return next(
        new AppError(
          "You cannot update user passwords, on this route.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (req.body.isActive) {
      return next(
        new AppError(
          "You cannot activate user accounts on this route.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    req.body.password = undefined;
    delete req.body.password;

    await CRUDUser.update(req.params.id, res, req);
  }
);

const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.delete(req.params.id, res, req);
  }
);

const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const currentPassword = req.body.currentPassword?.trim();
    const newPassword = req.body.newPassword?.trim();
    const passwordConfirm = req.body.passwordConfirm?.trim();

    const currentUser = await UserModel.findById(res.locals.user._id).select(
      "+password"
    );

    if (!currentUser) {
      return next(
        new AppError(
          "User no longer exist in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!newPassword || !currentPassword || !passwordConfirm) {
      return next(
        new AppError(
          "Enter valid current password, new password, and confirm password values.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (
      !(await bcrypt.compare(currentPassword, String(currentUser?.password)))
    ) {
      return next(
        new AppError("Incorrect Password.", StatusCodes.UNAUTHORIZED)
      );
    }

    if (newPassword.length < 8) {
      return next(
        new AppError(
          "Password must be atleast 8 characters long.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (newPassword != passwordConfirm) {
      return next(
        new AppError(
          "Password and password confirmation must match.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (await bcrypt.compare(newPassword, String(currentUser.password))) {
      return next(
        new AppError(
          "New password must be different from current password.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const newUserPassword = await bcrypt.hash(newPassword, 12);

    const data = await UserModel.findByIdAndUpdate(
      res.locals.user._id,
      {
        password: newUserPassword,
      },
      { new: true, runValidators: true }
    );

    logUserActivity(
      req,
      res.locals.user._id,
      "Updated thier password",
      "users",
      res.locals.user._id,
      undefined,
      undefined
    );

    appResponder(
      StatusCodes.OK,
      { message: "Password successfully updated." },
      res
    );
  }
);

export const userControllers = {
  createUser,
  readOneUser,
  readAllUsers,
  updateUser,
  deleteUser,
  updatePassword,
};
