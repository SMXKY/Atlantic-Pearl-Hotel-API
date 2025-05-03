import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";
import { UserModel } from "../models/User.model";
import { appResponder } from "../util/appResponder.util";
import { EmployeeModel } from "../models/Employee.model";
import { StatusCodes } from "http-status-codes";
import * as generatePassword from "generate-password";
import { sendEmail } from "../util/sendEmail.util";
import { GuestModel } from "../models/Guest.model";
import * as jwt from "jsonwebtoken";
import { AppError } from "../util/AppError.util";
import * as bcrypt from "bcrypt";

const signToken = (userId: string) => {
  const jwtSecret = process.env.JWT_SECRETE;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  const options: jwt.SignOptions = {
    expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign({ id: userId }, jwtSecret, options);
};

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

    // console.log(process.env.NODE_ENV);

    req.body.password = employeePassword;
    req.body.passwordConfirm = employeePassword;
    req.body.userType = "Employee";

    const user = await UserModel.create(req.body);

    await EmployeeModel.create({
      ...req.body,
      user: user._id,
    });

    await sendEmail(
      user.email,
      "Your Account Password - Atlantic Pearl Hotel and Resort",
      `Dear employee, please find your account password below.`,
      `<b>Keep you password Confidential</b><br><p>Your account password: ${employeePassword}</p>`
    );

    appResponder(
      StatusCodes.OK,
      {
        ok: true,
        message:
          "Employee account created successfully. Password provide to employee throught thier email.",
      },
      res
    );
  }
);

const signIn = catchAsync(
  async (req: Request, res: Response, nex: NextFunction) => {
    const user = await UserModel.create(req.body);

    req.body.userType = "Guest";

    await GuestModel.create({ ...req.body, user: user._id });

    if (!process.env.JWT_SECRETE) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    const emailVerificationToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRETE,
      { expiresIn: "3h" }
    );

    await sendEmail(
      user.email,
      "Account created successfully",
      `Please verify your Email.`,
      `<b>Please Click on link bellow to Verify you email</b><br/><p>${`${process.env.HOME}/api/v1/verify-email/${emailVerificationToken}`}</p>`
    );

    appResponder(
      StatusCodes.OK,
      {
        ok: true,
        message:
          "Your account has been created! We've sent a verification link to your email. Please check your inbox to activate your account",
      },
      res
    );
  }
);

const verifyEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.params.token;

    if (!token) {
      return next(
        new AppError(
          "Invalid auth token, please login to access this resource",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRETE!) as {
      email: string;
    };

    const userEmail = decoded.email;

    const user = await UserModel.findOne({ email: userEmail });

    if (!user) {
      return next(
        new AppError(
          "Email does not match any active account in the database.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const guest = await GuestModel.findOne({ user: user._id });

    if (!guest) {
      return next(
        new AppError(
          "No such guest account associted with this user.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (guest?.hasConfirmedEmail) {
      return next(
        new AppError(
          "Account Email is already verified.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    guest.hasConfirmedEmail = true;
    await guest?.save();

    await sendEmail(
      user.email,
      "Account Verified successfully",
      `Thank you for verifying your email.`,
      `<p>Email Verified Successfully</p>`
    );

    appResponder(
      StatusCodes.OK,
      { message: "Account verified successfully" },
      res
    );
  }
);

const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(
        new AppError(
          "Please enter a valid and password",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const user = await UserModel.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(
        new AppError("Incorrect Email or Password", StatusCodes.UNAUTHORIZED)
      );
    }

    const employee = await EmployeeModel.findOne({ user: user._id }).populate(
      "user"
    );
    const guest = await GuestModel.findOne({ user: user._id }).populate("user");

    const data = employee || guest;

    if (!data) {
      return next(
        new AppError(
          "Access Denied. User is niether employee or guest.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    appResponder(
      StatusCodes.OK,
      {
        token: signToken(data._id.toString()),
        data,
      },
      res
    );
  }
);

export const authControllers = {
  createEmployeeAccount,
  signIn,
  verifyEmail,
  login,
};
