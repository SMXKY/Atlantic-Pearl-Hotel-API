import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../util/catchAsync";
import { ActivityLogModel } from "../../models/Logs/ActivityLog.model";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { logUserActivity } from "../../util/logUserActivity.util";
import { UserModel } from "../../models/HR/User.model";
import { AppError } from "../../util/AppError.util";

export const readActivityLogs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      startDate,
      endDate,
      collectionName,
      user,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);

    // console.log(req.query);

    // Build the base filter
    const filter: Record<string, any> = {};

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Collection name filter
    if (collectionName) {
      filter.collectionName = collectionName;
    }

    // User ID filter
    if (user) {
      filter["user._id"] = user;
    }

    // Search across multiple fields
    if (search) {
      const s = (search as string).trim();
      const regex = new RegExp(s, "i");
      filter.$or = [
        { "user.name": regex },
        { "user.email": regex },
        { collectionName: regex },
        { resourceId: regex },
        { action: regex },
      ];
    }

    // Get total count
    const totalCount = await ActivityLogModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    // If page exceeds, clamp
    const skip = (pageNum - 1) * limitNum;
    const effectiveSkip =
      skip >= totalCount ? (totalPages - 1) * limitNum : skip;

    // Fetch filtered, sorted, paginated data
    const logs = await ActivityLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(effectiveSkip)
      .limit(limitNum)
      .populate("user");

    // Respond with logs and pagination
    if (!res.locals.user?._id) {
      throw new AppError(
        "Authentication error: user identity missing from session.",
        StatusCodes.UNAUTHORIZED
      );
    }

    const userCheck = await UserModel.findById(res.locals.user._id);

    if (!userCheck) {
      throw new AppError(
        "User not found in the database during activity logging. The account may have been deleted—check activity logs for details.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await logUserActivity(
      req,
      res.locals.user._id,
      `${userCheck.name} read all documents in activity-logs`,
      "activity-logs",
      "",
      "",
      ""
    );

    appResponder(StatusCodes.OK, { logs, totalPages, page: pageNum }, res);
  }
);

export const activityLogControllers = {
  readActivityLogs,
};
