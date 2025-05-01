import express from "express";

import { userControllers } from "../controllers/user.controller";

export const userRouter = express.Router();

userRouter
  .route("/")
  .post(userControllers.createUser)
  .get(userControllers.readAllUsers);

userRouter
  .route("/:id")
  .get(userControllers.readOneUser)
  .patch(userControllers.updateUser)
  .delete(userControllers.deleteUser);
