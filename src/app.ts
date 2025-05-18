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
app.set("trust proxy", true);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the Atlantic Pearl Hotel and Resort API...");
});

app.use(express.json());

app.get("/api/v1/verify-email/:token", authControllers.verifyEmail);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/guests", guestRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/permission-overides", permissionOverideRouter);
app.use("/api/v1/positions", positionRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/role-permissions", rolePermissionRouter);
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
