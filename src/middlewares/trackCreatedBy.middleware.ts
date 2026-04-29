import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";

const trackCreatedBy = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.createdBy = res.locals.user._id;
    // console.log(req.body);
    next();
  }
);

export const trackUpdateddBy = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.updatedBy = res.locals.user._id;
    // console.log(req.body);
    next();
  }
);

export default trackCreatedBy;
