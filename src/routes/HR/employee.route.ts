import express from "express";

import { employeeControllers } from "../../controllers/HR/employee.controller";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";

export const employeeRouter = express.Router();

employeeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.create),
    employeeControllers.createEmployee
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.readAll),
    employeeControllers.readAllEmployees
  );

employeeRouter
  .route("/search")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.readAll),
    employeeControllers.search
  );

employeeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.readOne),
    employeeControllers.getEmployeeDetails
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.update),
    employeeControllers.updateEmployee
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.delete),
    employeeControllers.deleteEmployee
  );
