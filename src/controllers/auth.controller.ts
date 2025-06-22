import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";
import { IUser, UserModel } from "../models/User.model";
import { appResponder } from "../util/appResponder.util";
import { EmployeeModel } from "../models/Employee.model";
import { StatusCodes } from "http-status-codes";
import * as generatePassword from "generate-password";
import { sendEmail } from "../util/sendEmail.util";
import { GuestModel } from "../models/Guest.model";
import * as jwt from "jsonwebtoken";
import { AppError } from "../util/AppError.util";
import * as bcrypt from "bcrypt";
import * as Oauth from "google-auth-library";
import { RoleModel } from "../models/Role.model";
import { GoogleUserPayload } from "../types/googleUserPayload";
import { getUserPermissions } from "../util/getUserPermissions";
import crypto from "crypto";
import { Delete } from "tsoa";

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

//Todo: Log user acctivity in production for creating Employees

const createEmployeeAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const employeePassword = generatePassword.generate({
      length: 8,
      numbers: true,
      // symbols: true,
      uppercase: true,
      lowercase: true,
      strict: true,
    });

    req.body.password = employeePassword;
    req.body.passwordConfirm = employeePassword;
    req.body.userType = "Employee";

    const user = await UserModel.create(req.body);

    EmployeeModel.create({
      ...req.body,
      user: user._id,
    })
      .then(async (data) => {
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
              "Employee account created successfully. Password provided to employee through their email.",
          },
          res
        );
      })
      .catch(async (err) => {
        try {
          await UserModel.findByIdAndDelete(user._id);
        } catch (deleteErr) {
          console.error("Failed to delete user:", deleteErr);
        }
        return next(new AppError(err.message, StatusCodes.BAD_REQUEST));
      });
  }
);

const signIn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const role = await RoleModel.findOne({ name: "guest" });

    if (!role) {
      return next(
        new AppError(
          "No guest role found in the db.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    req.body.userType = "Guest";

    const user = await UserModel.create({ ...req.body, role: role._id });

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
          "Please enter a valid email and password",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const user = await UserModel.findOne({ email })
      .select("+password")
      .populate("role");

    if (!user) {
      return next(
        new AppError("Incorrect Email or Password.", StatusCodes.UNAUTHORIZED)
      );
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil.getTime() >= Date.now()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / (60 * 1000)
      );

      return next(
        new AppError(
          `Your account is locked due to multiple failed login attempts. Please try again in ${remainingTime} minutes.`,
          StatusCodes.FORBIDDEN
        )
      );
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!process.env.ACCOUNT_LOGIN_WAIT_TIME) {
      return next(
        new AppError(
          "Server error: ACCOUNT_LOGIN_WAIT_TIME is not configured.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    // Handle incorrect password
    if (!isPasswordCorrect) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(
          Date.now() + Number(process.env.ACCOUNT_LOGIN_WAIT_TIME) * 60 * 1000
        );

        await user.save();

        return next(
          new AppError(
            `Too many failed login attempts. Account locked for ${process.env.ACCOUNT_LOGIN_WAIT_TIME} minutes.`,
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      await user.save();

      return next(
        new AppError("Incorrect Email or Password.", StatusCodes.UNAUTHORIZED)
      );
    }

    // Reset login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Check if user is an employee or guest
    const employee = await EmployeeModel.findOne({ user: user._id })
      .populate({
        path: "user",
        populate: { path: "role" },
      })
      .lean();

    const guest = await GuestModel.findOne({ user: user._id })
      .populate({
        path: "user",
        populate: { path: "role" },
      })
      .lean();

    const data = employee || guest;

    if (!data) {
      return next(
        new AppError(
          "Access Denied. User is neither employee nor guest.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const flatenUserData = async () => {
      const { user, ...cleanData } = data;
      const userObj = user as any;
      const role = userObj?.role?.name || null;

      const flatUserData = {
        ...cleanData,
        ...userObj,
        role,
        permissions: await getUserPermissions(userObj as IUser),
      };

      return flatUserData;
    };

    appResponder(
      StatusCodes.OK,
      {
        token: signToken(user._id.toString()),
        ...(await flatenUserData()),
      },
      res
    );
  }
);

const googleRedirect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Verify environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const googleUri =
      process.env.NODE_ENV === "production"
        ? process.env.GOOGLE_REDIRECT_URI_PROD
        : process.env.GOOGLE_REDIRECT_URI_DEV;

    if (!clientId || !clientSecret || !googleUri) {
      return next(
        new AppError(
          "Google OAuth configuration missing in environment variables.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const client = new Oauth.OAuth2Client(clientId, clientSecret, googleUri);

    const { code } = req.query;

    if (!code) {
      return next(
        new AppError("No authorization code found.", StatusCodes.BAD_REQUEST)
      );
    }

    const { tokens } = await client.getToken(code as string);

    const idToken = tokens.id_token;

    if (!idToken) {
      return next(
        new AppError(
          "ID token is missing from the response.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload() as GoogleUserPayload;
    if (!payload) {
      return next(
        new AppError("Invalid ID token payload.", StatusCodes.BAD_REQUEST)
      );
    }

    const { sub: googleId, email, name, picture } = payload;

    const role = await RoleModel.findOne({ name: "guest" });

    if (!role) {
      return next(
        new AppError(
          "No guest role found in the database.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    let user = await UserModel.findOne({
      $or: [{ googleId }, { email }],
    }).populate("role");

    console.log("Found User", user);

    if (user && user.googleId && user.googleId !== googleId) {
      return next(
        new AppError(
          "Email already linked to a different Google account.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    let guest = user ? await GuestModel.findOne({ user: user._id }) : null;
    const permissions = user
      ? await getUserPermissions(user.toObject() as unknown as IUser)
      : null;

    if (!user) {
      user = new UserModel({
        googleId,
        email,
        name,
        profilePictureUrl: picture,
        role: role._id,
        userType: "Guest",
      });
      await user.save({ validateBeforeSave: false });

      guest = await GuestModel.create({
        user: user._id,
        hasConfirmedEmail: true,
      });
    }

    // const data = {
    //   token: signToken(user._id.toString()),
    //   data: { ...guest?.toObject(), user, permissions },
    // };

    // appResponder(StatusCodes.OK, data, res);

    if (!process.env.JWT_SECRETE) {
      return next(
        new AppError(
          "Cannot find jwt token in enviroment variables",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRETE,
      { expiresIn: "1h" }
    );

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
      path: "/",
    });

    if (!process.env.FRONT_END_DASHBOARD_REDIRECT) {
      return next(
        new AppError(
          "Cannot find front end dashboard redirect in enviroment variables",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    res.redirect(`${process.env.FRONT_END_DASHBOARD_REDIRECT}`);
  }
);

const verifyGoogleAuthCookie = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.session_token;

    if (!token) {
      return next(
        new AppError(
          "Missing Google auth session token. Please log in.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    if (!process.env.JWT_SECRETE) {
      return next(
        new AppError(
          "JWT_SECRET is not defined in environment variables.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRETE);
    } catch (err) {
      return next(
        new AppError(
          "Invalid or expired session token.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const { id, email } = decoded as { id: string; email: string };
    const user = await UserModel.findById(id);

    if (!user) {
      return next(
        new AppError(
          "User not found for the provided session token.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const guest = await GuestModel.findOne({ user: user._id });

    if (!guest) {
      return next(
        new AppError(
          "Cannot find corresponding guest",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const role = await RoleModel.findById(user.role);

    if (!role) {
      return next(
        new AppError("No such user role Id.", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    }

    const permissions = await getUserPermissions(
      user.toObject() as unknown as IUser
    );

    const data = {
      ...user.toObject(),
      ...guest.toObject(),
      permissions,
      token: signToken(user._id.toString()),
    } as any;

    data.role = role.name;

    return appResponder(StatusCodes.OK, data, res);
  }
);

const authWithGoogle = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (
      !process.env.GOOGLE_REDIRECT_URI_DEV ||
      !process.env.GOOGLE_REDIRECT_URI_PROD
    ) {
      return next(
        new AppError(
          "Google auth enviroment variables not well set",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const googleUri =
      process.env.NODE_ENV === "production"
        ? process.env.GOOGLE_REDIRECT_URI_PROD
        : process.env.GOOGLE_REDIRECT_URI_DEV;

    const client = new Oauth.OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: googleUri,
    });

    // console.log(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email"],
      redirect_uri: googleUri,
      client_id: process.env.GOOGLE_CLIENT_ID,
    });

    // console.log("Redirecting to...", redirectUri);

    res.redirect(redirectUri);
  }
);

const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError(
          "Invalid auth token, please login to access this resource",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    if (!process.env.JWT_SECRETE) {
      return next(
        new AppError("No JWT secret found", StatusCodes.INTERNAL_SERVER_ERROR)
      );
    }

    const decodedToken = (await jwt.verify(
      token,
      process.env.JWT_SECRETE
    )) as jwt.JwtPayload;

    const user = await UserModel.findById(decodedToken.id)
      .select("-password")
      .populate("role")
      .lean<IUser>()
      .exec();

    if (!user) {
      return next(
        new AppError(
          "User no longer exist in the database.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (!decodedToken.iat) {
      return next(
        new AppError(
          "Cant Find Token Issue Date",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    if (
      user.passWordChangedAt &&
      user.passWordChangedAt.getTime() / 1000 > decodedToken.iat
    ) {
      return next(
        new AppError(
          "User password was changed!, Please Login Again to access this resource.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    res.locals.user = {
      ...user,
      permissions: await getUserPermissions(user as IUser),
    };

    next();
  }
);

const restrictTo = (...permissions: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      return next(
        new AppError(
          "You are not logged in. You cannot access this resource.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const hasPermission = permissions.some((perm) =>
      res.locals.user.permissions.includes(perm)
    );
    if (!hasPermission) {
      return next(
        new AppError(
          "You do not have permission to perform this action.",
          StatusCodes.FORBIDDEN
        )
      );
    }

    // console.log("access granted");

    next();
  });
};

const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const user = await UserModel.findOne({ email }).select(
      "+passwordReset.code +passwordReset.issuedAt"
    );

    if (!user) {
      return next(
        new AppError("No email in the database", StatusCodes.NOT_FOUND)
      );
    }

    const passwordResetCode = Array.from({ length: 6 }, () =>
      crypto.randomInt(1, 9)
    ).join("");

    await UserModel.findByIdAndUpdate(
      user._id,
      {
        $set: {
          "passwordReset.code": await bcrypt.hash(passwordResetCode, 12),
          "passwordReset.issuedAt": Date.now(),
          "passwordReset.expiresAt": Date.now() + 5 * 60 * 1000,
        },
      },
      { runValidators: true, new: true }
    );

    await sendEmail(
      user.email,
      "Password Reset",
      "Clikck on the link access you password reset token",
      `<b style="font-size: 4rem;">${passwordResetCode}</b>`
    );

    appResponder(
      StatusCodes.OK,
      { message: "Password reset link sent to your email" },
      res
    );
  }
);

const verifyPasswordResetCode = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, code } = req.body;

    const user = await UserModel.findOne({ email }).select(
      "+passwordReset.code +passwordReset.issuedAt +passwordReset.expiresAt"
    );

    if (!user) {
      return next(
        new AppError("User No longer exist in the db.", StatusCodes.NOT_FOUND)
      );
    }

    if (!user.passwordReset) {
      return next(
        new AppError(
          "User has not been issued a password reset code",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    if (
      !user.passwordReset.code ||
      !(await bcrypt.compare(code, user.passwordReset?.code))
    ) {
      return next(
        new AppError("Invalid password rest code", StatusCodes.BAD_REQUEST)
      );
    }

    if (
      !user.passwordReset.expiresAt ||
      !user.passwordReset.issuedAt ||
      user.passwordReset.expiresAt.getTime() < Date.now()
    ) {
      return next(
        new AppError(
          "This password reset code has expired. Please request a new one.",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const jwtSecret = process.env.JWT_SECRETE;
    const jwtExpiresIn = "1h";

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    const options: jwt.SignOptions = {
      expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"],
    };

    const token = jwt.sign({ id: user._id.toString() }, jwtSecret, options);

    appResponder(
      StatusCodes.OK,
      {
        token,
      },
      res
    );
  }
);

const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.params.token;
    const { password, passwordConfirm } = req.body;

    if (!token) {
      return next(
        new AppError(
          "Invalid auth token, please login to access this resource",
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    if (!process.env.JWT_SECRETE) {
      return next(
        new AppError(
          "Incorrect JWT enviroment variable settings.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const decodedToken = (await jwt.verify(
      token,
      process.env.JWT_SECRETE
    )) as jwt.JwtPayload;

    const user = await UserModel.findById(decodedToken.id)
      .select("+password")
      .select(
        "+passwordReset.code +passwordReset.issuedAt +passwordReset.expiresAt"
      );

    if (!user) {
      return next(
        new AppError(
          "User no longer exist in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!password || !passwordConfirm) {
      return next(
        new AppError(
          "Enter valid new password, and confirm password values.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (password.length < 8) {
      return next(
        new AppError(
          "Password must be atleast 8 characters long.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (password != passwordConfirm) {
      return next(
        new AppError(
          "Password and password confirmation must match.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const newUserPassword = await bcrypt.hash(password, 12);

    await UserModel.findByIdAndUpdate(
      user._id,
      {
        password: newUserPassword,
        passwordReset: undefined,
      },
      { new: true, runValidators: true }
    );

    appResponder(
      StatusCodes.OK,
      { message: "Password successfully Reseted." },
      res
    );
  }
);

const activateAndDeactivateUserAccounts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    let { deactivatedUntil, isActive } = req.body;

    if (!userId || typeof isActive !== "boolean") {
      return next(
        new AppError(
          "You must provide a valid user ID and a boolean value for 'isActive'.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (isActive) {
      deactivatedUntil = undefined;
    }

    const user = await UserModel.findOne({
      _id: userId,
      includeInactive: true,
    }).select("+isActive +deactivatedUntil");

    if (!user) {
      return next(
        new AppError(
          "No user found with the provided ID.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (deactivatedUntil) {
      const parsedDate = new Date(deactivatedUntil);
      if (isNaN(parsedDate.getTime())) {
        return next(
          new AppError(
            "Invalid 'deactivatedUntil' date format.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (parsedDate.getTime() <= Date.now()) {
        console.log("");
        return next(
          new AppError(
            "Deactivated account, dates must be in the future",
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    // console.log(user);

    const data = await UserModel.findOneAndUpdate(
      { _id: user._id, includeInactive: true },
      {
        isActive,
        deactivatedUntil:
          !deactivatedUntil || isActive
            ? undefined
            : new Date(deactivatedUntil),
      },
      { new: true, runValidators: true }
    );

    appResponder(
      StatusCodes.OK,
      { message: "User account updated successfully." },
      res
    );
  }
);

const changeUserRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;

    await UserModel.findByIdAndUpdate(
      userId,
      { role: req.body.role },
      { runValidators: true, new: true }
    );

    appResponder(
      StatusCodes.OK,
      { message: "User role updated successffuly" },
      res
    );
  }
);

export const authControllers = {
  createEmployeeAccount,
  signIn,
  verifyEmail,
  login,
  googleRedirect,
  authWithGoogle,
  protect,
  restrictTo,
  forgotPassword,
  verifyPasswordResetCode,
  resetPassword,
  activateAndDeactivateUserAccounts,
  changeUserRole,
  verifyGoogleAuthCookie,
};
