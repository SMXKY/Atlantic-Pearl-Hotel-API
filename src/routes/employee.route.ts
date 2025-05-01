import express from "express";

import { employeeControllers } from "../controllers/employee.controller";

export const employeeRouter = express.Router();

employeeRouter
  .route("/")
  .post(employeeControllers.createEmployee)
  .get(employeeControllers.readAllEmployees);

employeeRouter
  .route("/:id")
  .get(employeeControllers.readOneEmployee)
  .patch(employeeControllers.updateEmployee)
  .delete(employeeControllers.deleteEmployee);
