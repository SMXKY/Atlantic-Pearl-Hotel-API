import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { StatusCodes } from "http-status-codes";

import { departmentRouter } from "./routes/department.route";
import { employeeRouter } from "./routes/employee.route";
import { guestRouter } from "./routes/guest.route";
import { permissionRouter } from "./routes/permission.route";
import { permissionOverideRouter } from "./routes/permissionOveride.route";
import { positionRouter } from "./routes/position.route";
import { roleRouter } from "./routes/role.route";
import { rolePermissionRouter } from "./routes/rolePermission.route";
import { userRouter } from "./routes/user.route";
import { AppError } from "./util/AppError.util";
import { globalErrorController } from "./controllers/error.controller";
import { authRouter } from "./routes/auth.route";
import { authControllers } from "./controllers/auth.controller";
import cors from "cors";

export const app = express();

//Use this as reference for api comments
/**
 * @openapi
 * /:
 *   get:
 *     summary: Test to if the Server is Running
 *     responses:
 *       200:
 *         description: Testing if the server is online.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */

/**
 * @swagger
 * /api/v1/auth/sign-in:
 *   post:
 *     summary: Register a new guest account
 *     description: Creates a new user account and associated guest profile. The user must confirm their email to activate the account.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phoneNumber
 *               - password
 *               - passwordConfirm
 *               - dateOfBirth
 *               - emergencyContact
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Alice
 *               lastName:
 *                 type: string
 *                 example: Mbeng
 *               email:
 *                 type: string
 *                 format: email
 *                 example: Alice@gmail.com
 *               phoneNumber:
 *                 type: string
 *                 example: +237654321987
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               passwordConfirm:
 *                 type: string
 *                 example: SecurePass123!
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 2000-05-10
 *               gender:
 *                 type: string
 *                 enum: [M, F]
 *                 example: F
 *               emergencyContact:
 *                 type: string
 *                 example: +237671234567
 *               profilePictureUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/profiles/alice.jpg
 *               role:
 *                 type: string
 *                 description: ObjectId of the user role
 *                 example: 68148b4b83282a32379cc78d
 *               countryOfResidence:
 *                 type: string
 *                 example: Cameroon
 *               preferedCurrency:
 *                 type: string
 *                 example: XAF
 *               preferedLanguage:
 *                 type: string
 *                 enum: [English, French]
 *                 example: English
 *               isLoyaltyProgramMember:
 *                 type: boolean
 *                 example: true
 *               guestTag:
 *                 type: string
 *                 example: VIP Platinum
 *               guestType:
 *                 type: string
 *                 enum: [Individual, Couple, Family, Group, Corporate, Walk-in, VIP, Loyalty Member, Event Attendee, Government/Military, Long-stay, OTA]
 *                 example: VIP
 *     responses:
 *       201:
 *         description: Guest account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Account Created successfully
 *       400:
 *         description: Bad request (validation or duplicate data)
 *       500:
 *         description: Internal server error
 */

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const corsOptions = {
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};

app.use(cors(corsOptions));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the Atlantic Pearl Hotel and Resort API...");
});

app.use(express.json());

app.get("/api/v1/verify-email/:token", authControllers.verifyEmail);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/guests", guestRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/permissionOverides", permissionOverideRouter);
app.use("/api/v1/positions", positionRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/rolePermissions", rolePermissionRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", authRouter);

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Atlantic Pearl Hotel and Resort API",
      version: "1.0.0",
    },
  },
  apis: ["./src/**/*.ts"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Invalid route accessed: ${req.originalUrl}`);
  next(
    new AppError(
      `${req.originalUrl} does not exist for ${req.method} requests`,
      StatusCodes.NOT_FOUND
    )
  );
});

app.use(globalErrorController);
