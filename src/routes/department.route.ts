import express from "express";

import { departmentControllers } from "../controllers/department.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const departmentRouter = express.Router();

departmentRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.create),
    departmentControllers.createDepartment
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.readAll),
    departmentControllers.readAllDepartments
  );

departmentRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.readOne),
    departmentControllers.readOneDepartment
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.update),
    departmentControllers.updateDepartment
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.delete),
    departmentControllers.deleteDepartment
  );
