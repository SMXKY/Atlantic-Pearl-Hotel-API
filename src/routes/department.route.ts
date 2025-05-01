import express from "express";

import { departmentControllers } from "../controllers/department.controller";

export const departmentRouter = express.Router();

departmentRouter
  .route("/")
  .post(departmentControllers.createDepartment)
  .get(departmentControllers.readAllDepartments);

departmentRouter
  .route("/:id")
  .get(departmentControllers.readOneDepartment)
  .patch(departmentControllers.updateDepartment)
  .delete(departmentControllers.deleteDepartment);
