import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { NotificationModel } from "../../models/Notifications/Notification.model";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { io } from "../../index";

const CRUDNotification: CRUD = new CRUD(NotificationModel);

const createNotification = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDNotification.create(req.body, res, req);
  }
);

const readOneNotification = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDNotification.readOne(req.params.id, res, [], req);
  }
);

const readAllNotifications = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.query.user = String(res.locals.user._id);
    console.log(String(res.locals.user._id), req.query.user);

    console.log(req.query);
    await CRUDNotification.readAll(res, req, 1, 100, []);
  }
);

const updateNotification = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDNotification.update(req.params.id, res, req);
  }
);

const deleteNotification = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDNotification.delete(req.params.id, res, req);
  }
);

const markAllNotificationsRead = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = res?.locals.user._id;

    // Update all unread notifications for the user
    const result = await NotificationModel.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // 🔥 Emit update event so client gets live sync without refetch
    if (result.modifiedCount > 0) {
      // Fetch the updated notifications (just the affected ones)
      const updated = await NotificationModel.find({
        user: userId,
        isRead: true,
      });

      updated.forEach((doc) => {
        const notification = doc.toObject();
        io.to(userId.toString()).emit("notification:update", notification);
      });
    }

    appResponder(StatusCodes.OK, { success: true }, res);
  }
);

export const notificationControllers = {
  createNotification,
  readOneNotification,
  readAllNotifications,
  updateNotification,
  deleteNotification,
  markAllNotificationsRead,
};
