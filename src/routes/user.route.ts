import express from "express";

import { userControllers } from "../controllers/user.controller";
import { authControllers } from "../controllers/auth.controller";

export const userRouter = express.Router();

userRouter
  .route("/")
  .post(userControllers.createUser)
  .get(authControllers.protect, userControllers.readAllUsers);

userRouter
  .route("/:id")
  .get(authControllers.protect, userControllers.readOneUser)
  .patch(userControllers.updateUser)
  .delete(userControllers.deleteUser);
