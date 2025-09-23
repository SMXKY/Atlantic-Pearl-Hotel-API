import express from "express";

import { notificationControllers } from "../controllers/notification.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const notificationRouter = express.Router();

notificationRouter
  .route("/")
  .post(authControllers.protect, notificationControllers.createNotification)
  .get(authControllers.protect, notificationControllers.readAllNotifications);

notificationRouter
  .route("/mark-all-read")
  .patch(
    authControllers.protect,
    notificationControllers.markAllNotificationsRead
  );

notificationRouter
  .route("/:id")
  .get(authControllers.protect, notificationControllers.readOneNotification)
  .patch(authControllers.protect, notificationControllers.updateNotification)
  .delete(authControllers.protect, notificationControllers.deleteNotification);
