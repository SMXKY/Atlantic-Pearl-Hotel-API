import { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError.util";

export const catchAsync = (
  func: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch((err: any) => {
      console.log(err);

      const statusCode = err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      next(new AppError(message, statusCode));
    });
  };
};
