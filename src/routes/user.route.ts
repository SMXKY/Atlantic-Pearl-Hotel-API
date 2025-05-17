import express from "express";

import { userControllers } from "../controllers/user.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const userRouter = express.Router();

userRouter.route("/").post(userControllers.createUser).get(
  // authControllers.protect,
  // authControllers.restrictTo(allPermissions.users.readAll),
  userControllers.readAllUsers
);

userRouter
  .route("/update-password")
  .patch(authControllers.protect, userControllers.updatePassword);

userRouter
  .route("/:id")
  .get(userControllers.readOneUser)
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
