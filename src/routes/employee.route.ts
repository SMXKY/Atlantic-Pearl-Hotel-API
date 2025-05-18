import express from "express";

import { employeeControllers } from "../controllers/employee.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

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
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.employees.readOne),
    employeeControllers.readOneEmployee
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
