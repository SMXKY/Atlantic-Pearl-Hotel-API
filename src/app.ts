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
import { activityLogRouter } from "./routes/activityLogs.route";
import { roleOverideRouter } from "./routes/roleOveride.route";
import { reservationRouter } from "./routes/reservation.route";
import { buildingRouter } from "./routes/building.route";
import { roomRouter } from "./routes/room.route";
import { roomTypeRouter } from "./routes/roomType.route";
import { rateRouter } from "./routes/rate.route";
import { discountRouter } from "./routes/discount.route";
import { taxRouter } from "./routes/tax.route";
import { adminConfigurationRouter } from "./routes/adminConfiguration.route";
import { amenityRouter } from "./routes/amenity.route";
import { roomTypeAmenityRouter } from "./routes/roomTypeAmenity.route";
import { bedTypeRouter } from "./routes/bedType.route";
import { roomTypeBedTypeRouter } from "./routes/roomTypeBedType.route";
import { roomTypeReviewRouter } from "./routes/roomTypeReview.route";

export const app = express();

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
app.use("/api/v1/activity-logs", activityLogRouter);
app.use("/api/v1/role-overides", roleOverideRouter);
app.use("/api/v1/reservations", reservationRouter);
app.use("/api/v1/buildings", buildingRouter);
app.use("/api/v1/rooms", roomRouter);
app.use("/api/v1/room-types", roomTypeRouter);
app.use("/api/v1/rates", rateRouter);
app.use("/api/v1/discounts", discountRouter);
app.use("/api/v1/taxes", taxRouter);
app.use("/api/v1/admin-configurations", adminConfigurationRouter);
app.use("/api/v1/amenities", amenityRouter);
app.use("/api/v1/room-type-amenities", roomTypeAmenityRouter);
app.use("/api/v1/bed-types", bedTypeRouter);
app.use("/api/v1/room-type-bed-types", roomTypeBedTypeRouter);
app.use("/api/v1/room-type-reveiws", roomTypeReviewRouter);

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
