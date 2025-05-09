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
import * as Oauth from "google-auth-library";
import { RoleModel } from "../models/Role.model";
import { GoogleUserPayload } from "../types/googleUserPayload";

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

    const user = await UserModel.create({ ...req.body, role: role._id });

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
          "Please enter a valid email and password",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      return next(
        new AppError("Incorrect Email or Password", StatusCodes.UNAUTHORIZED)
      );
    }

    // Checking if user is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remaining = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000
      );
      return next(
        new AppError(
          `Account locked. Try again in ${remaining} minute(s).`,
          StatusCodes.UNAUTHORIZED
        )
      );
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();
        return next(
          new AppError(
            "Account locked due to too many failed attempts. Try again in 30 minutes.",
            StatusCodes.UNAUTHORIZED
          )
        );
      }

      await user.save();
      return next(
        new AppError("Incorrect Email or Password", StatusCodes.UNAUTHORIZED)
      );
    }

    // If login is successful, reset failed attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const employee = await EmployeeModel.findOne({ user: user._id }).populate(
      "user"
    );
    const guest = await GuestModel.findOne({ user: user._id }).populate("user");
    const data = employee || guest;

    if (!data) {
      return next(
        new AppError(
          "Access Denied. User is neither employee nor guest.",
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

// const googleRedirect = catchAsync(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const client = new Oauth.OAuth2Client({
//       clientId: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       redirectUri: process.env.GOOGLE_REDIRECT_URI,
//     });

//     const { code } = req.query;

//     if (!code) {
//       return next(
//         new AppError("No authorization code found.", StatusCodes.BAD_REQUEST)
//       );
//     }

//     const { tokens } = await client.getToken(code as string);

//     // console.log("ALL TOKENS", tokens);

//     const idToken = tokens.id_token;

//     if (!idToken) {
//       return next(
//         new AppError(
//           "ID token is missing from the response.",
//           StatusCodes.BAD_REQUEST
//         )
//       );
//     }

//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     console.log("TICKET", ticket);

//     const role = await RoleModel.findOne({ name: "guest" });

//     if (!role) {
//       return next(
//         new AppError(
//           "No guest role found in the db.",
//           StatusCodes.INTERNAL_SERVER_ERROR
//         )
//       );
//     }

//     const payload = ticket.getPayload() as GoogleUserPayload;
//     const { sub: googleId, email, name, picture } = payload;

//     let user = await UserModel.findOne({ googleId });
//     let guest;

//     if (!user) {
//       user = new UserModel({
//         googleId,
//         email,
//         name,
//         profilePictureUrl: picture,
//         role: role._id,
//         userType: "Guest",
//       });
//       await user?.save({ validateBeforeSave: false });

//       guest = await GuestModel.create({
//         user: user._id,
//         hasConfirmedEmail: true,
//       });
//     }

//     const data = {
//       token: signToken(user._id.toString()),
//       data: { ...guest, user },
//     };

//     appResponder(StatusCodes.OK, data, res);
//   }
// );
const googleRedirect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Verify environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return next(
        new AppError(
          "Google OAuth configuration missing in environment variables.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const client = new Oauth.OAuth2Client({
      clientId,
      clientSecret,
      redirectUri,
    });

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

    let user = await UserModel.findOne({ googleId });
    let guest;

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

    const data = {
      token: signToken(user._id.toString()),
      data: { ...guest, user },
    };

    appResponder(StatusCodes.OK, data, res);
  }
);

const authWithGoogle = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const client = new Oauth.OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // console.log(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["profile", "email"],
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      client_id: process.env.GOOGLE_CLIENT_ID,
    });

    // console.log("Redirecting to...", redirectUri);

    res.redirect(redirectUri);
  }
);

export const authControllers = {
  createEmployeeAccount,
  signIn,
  verifyEmail,
  login,
  googleRedirect,
  authWithGoogle,
};
