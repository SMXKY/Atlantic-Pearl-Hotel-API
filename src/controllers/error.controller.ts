import { NextFunction, Request, Response } from "express";
import { AppError } from "../util/AppError.util";

// Development response: Detailed error messages for dev environment
const developmentResponse = (err: Error | AppError, res: Response) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const status = err instanceof AppError ? err.status : "error";
  const message =
    err instanceof AppError ? err.message : "Something went wrong";
  const stack = err instanceof AppError ? err.stack : null;

  res.status(statusCode).json({
    ok: false,
    status,
    message,
    error: err,
    stack: stack || "No stack trace available",
  });
};

// Production response: Generic error messages for production environment
const productionResponse = (err: any, res: Response) => {
  if (err?.isOperational) {
    res.status(err.statusCode).json({
      ok: false,
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      ok: false,
      status: "Server error",
      message:
        "Oops! Something went wrong... Our servers are taking a coffee break. Please try again later.",
    });
  }
};

// Global error handling middleware
export const globalErrorController = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Server error"; // Corrected typo here from 'Sever error'

  if (process.env.NODE_ENV === "production") {
    productionResponse(err, res);
  } else if (process.env.NODE_ENV === "development") {
    developmentResponse(err, res);
  }
};
