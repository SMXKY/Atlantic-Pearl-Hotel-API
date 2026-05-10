import { NextFunction, Request, Response } from "express";
import * as bcrypt from "bcrypt";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { UserModel } from "../../models/HR/User.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { appResponder } from "../../util/appResponder.util";
import { logUserActivity } from "../../util/logUserActivity.util";
import {
  deleteFilesFromFTP,
  handleFileUploads,
} from "../../services/ftpServer";

const CRUDUser: CRUD = new CRUD(UserModel);

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.create(req.body, res, req);
  }
);

const readOneUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readOne(req.params.id, res, ["role"], req);
  }
);

const readAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readAll(res, req, 1, 100, ["role"]);
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

    if (req.body.role) {
      return next(
        new AppError(
          "You cannot update user role on this route.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    req.body.password = undefined;
    delete req.body.password;

    await CRUDUser.update(req.params.id, res, req);
  }
);

const readMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDUser.readOne(String(res.locals.user._id), res, ["role"], req);
  }
);

const updateMe = catchAsync(
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

    if (req.body.role) {
      return next(
        new AppError(
          "You cannot update user role on this route.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    req.body.password = undefined;
    delete req.body.password;

    await CRUDUser.update(String(res.locals.user._id), res, req);
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
      "",
      ""
    );

    appResponder(
      StatusCodes.OK,
      { message: "Password successfully updated." },
      res
    );
  }
);

const updateUserRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.body;

    if (!req.params.id) {
      return next(
        new AppError("User param id is required.", StatusCodes.BAD_REQUEST)
      );
    }

    const data = await UserModel.findByIdAndUpdate(
      req.params.id,
      {
        role,
      },
      { new: true, runValidators: true }
    );

    appResponder(StatusCodes.OK, { data }, res);
  }
);

interface SearchQuery {
  q?: string;
  gender?: string;
  userType?: string;
  limit?: string;
}

export const searchUsers = async (
  req: Request<{}, {}, {}, SearchQuery>,
  res: Response
) => {
  try {
    const { q, gender, userType, limit = "10" } = req.query;

    const filter: any = { userType: userType || "Guest" };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    if (gender) {
      filter.gender = gender;
    }

    const users = await UserModel.find(filter)
      .limit(parseInt(limit))
      .select("name email phoneNumber gender profilePictureUrl isVerified");

    const count = await UserModel.countDocuments(filter);

    res.status(200).json({ success: true, data: users, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Search failed" });
  }
};

const modifyProfilePicture = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return next(
        new AppError(
          "User ID is required in request parameters as /:id",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const user = await UserModel.findById(id);

    if (!user) {
      return next(
        new AppError(
          "User Id does not exist in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (String(user._id) !== String(res.locals.user._id)) {
      return next(
        new AppError(
          "You may only update your own profile picture",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const { NODE_ENV, FTP_BASE_URL } = process.env;

    if (!NODE_ENV || !FTP_BASE_URL) {
      return next(
        new AppError(
          "Environment variables for FTP base url and NODE_ENV must be set",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const fileUrls = await handleFileUploads(req, 20, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    if (!fileUrls || fileUrls.length === 0) {
      return next(
        new AppError(
          "A profile picture file is required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // keep old pic reference before overwriting
    const oldProfilePic = user.profilePictureUrl;

    // update user profile picture
    user.profilePictureUrl = fileUrls[0];
    await user.save();

    // delete old picture (not the new one)
    if (NODE_ENV === "production" && oldProfilePic) {
      await deleteFilesFromFTP([oldProfilePic]);
    }

    appResponder(
      StatusCodes.OK,
      {
        message: "Profile picture updated successfully",
        url: FTP_BASE_URL + user.profilePictureUrl,
      },
      res
    );
  }
);

// ─── User Stats Controller ─────────────────────────────────────────────────
// Query param: ?type=guest | ?type=employee
export const getUserStats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const type = req.query.type as string;

    if (!type || !["guest", "employee"].includes(type)) {
      return next(
        new AppError(
          "Query param 'type' must be either 'guest' or 'employee'",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const userType = type === "guest" ? "Guest" : "Employee";

    const [total, male, female, verified] = await Promise.all([
      UserModel.countDocuments({ userType }),
      UserModel.countDocuments({ userType, gender: "M" }),
      UserModel.countDocuments({ userType, gender: "F" }),
      UserModel.countDocuments({ userType, isVerified: true }),
    ]);

    appResponder(StatusCodes.OK, { total, male, female, verified }, res);
  }
);

export const userControllers = {
  createUser,
  readOneUser,
  readAllUsers,
  updateUser,
  deleteUser,
  updatePassword,
  updateUserRole,
  searchUsers,
  modifyProfilePicture,
  readMe,
  updateMe,
  getUserStats,
};
