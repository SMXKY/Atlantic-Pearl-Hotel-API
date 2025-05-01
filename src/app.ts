import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

import { departmentRouter } from "./routes/department.route";
import { employeeRouter } from "./routes/employee.route";
import { guestRouter } from "./routes/guest.route";
import { permissionRouter } from "./routes/permission.route";
import { permissionOverideRouter } from "./routes/permissionOveride.route";
import { positionRouter } from "./routes/position.route";
import { roleRouter } from "./routes/role.route";
import { rolePermissionRouter } from "./routes/rolePermission.route";
import { userRouter } from "./routes/user.route";

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

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the Atlantic Pearl Hotel and Resort API...");
});

app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/guests", guestRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/permissionOverides", permissionOverideRouter);
app.use("/api/v1/positions", positionRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/rolePermissions", rolePermissionRouter);
app.use("/api/v1/users", userRouter);

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
