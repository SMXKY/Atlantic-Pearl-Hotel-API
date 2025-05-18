import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../util/catchAsync";
import { ActivityLogModel } from "../models/ActivityLog.model";
import { appResponder } from "../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { logUserActivity } from "../util/logUserActivity.util";

const readActivityLogs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      startDate,
      endDate,
      collectionName,
      user,
      page = 1,
      limit = 20,
    } = req.query;

    // Build the base query
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
      filter.user = user;
    }

    // Fetch filtered and sorted data
    const data = await ActivityLogModel.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .skip((+page - 1) * +limit)
      .limit(+limit);

    appResponder(StatusCodes.OK, data, res);
  }
);

export const activityLogControllers = {
  readActivityLogs,
};
