import express from "express";
import { authControllers } from "../controllers/auth.controller";

export const authRouter = express.Router();

authRouter
  .route("/create-employee")
  .post(authControllers.createEmployeeAccount);
