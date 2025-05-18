import express from "express";

import { userControllers } from "../controllers/user.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const userRouter = express.Router();

userRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.create),
    userControllers.createUser
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.readAll),
    userControllers.readAllUsers
  );

userRouter
  .route("/update-password")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.updatePassword),
    userControllers.updatePassword
  );

userRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.readOne),
    userControllers.readOneUser
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.update),
    userControllers.updateUser
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.delete),
    userControllers.deleteUser
  );
