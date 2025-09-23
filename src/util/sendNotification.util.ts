// utils/notification.ts
import { Types } from "mongoose";
import {
  NotificationModel,
  NotificationType,
  INotification,
  SendNotificationInput,
} from "../models/Notification.model";
import { io } from "../index";
import { PermissionModel } from "../models/Permission.model";
import { RolePermissionModel } from "../models/RolePermission.model";
import { UserModel } from "../models/User.model";
import { AppError } from "./AppError.util";
import { StatusCodes } from "http-status-codes";
import { RoleOverideModel } from "../models/RoleOveride.model";
import { PermissionOverideModel } from "../models/PermissionOveride";

interface sendNotificationInput {
  userIds?: string[];
  title: string;
  message: string;
  type: NotificationType;
  entityRef?: { model: string; id: Types.ObjectId };
  redirectUrl?: string;
  isGlobal?: boolean;
}

export async function sendNotification(input: SendNotificationInput) {
  const {
    userIds = [],
    title,
    message,
    type,
    entityRef,
    redirectUrl,
    isGlobal = false,
  } = input;

  if (!isGlobal && userIds.length === 0) {
    throw new Error(
      "Either userIds must be provided or isGlobal must be true."
    );
  }

  console.log("📝 Creating notifications for:", {
    isGlobal,
    userIdsCount: userIds.length,
    userIds,
  });

  // Create notification objects without manual timestamps
  const notifications: Partial<INotification>[] = isGlobal
    ? [
        {
          title,
          message,
          type,
          entityRef: entityRef
            ? {
                model: entityRef.model,
                id: new Types.ObjectId(entityRef.id),
              }
            : undefined,
          redirectUrl,
          isRead: false,
          isGlobal: true,
          // No user field for global notifications
        },
      ]
    : userIds.map((id) => {
        console.log("🔍 Processing user ID:", id, typeof id);
        return {
          user: new Types.ObjectId(id),
          title,
          message,
          type,
          entityRef: entityRef
            ? {
                model: entityRef.model,
                id: new Types.ObjectId(entityRef.id),
              }
            : undefined,
          redirectUrl,
          isRead: false,
          isGlobal: false,
        };
      });

  console.log("📋 Notifications to create:", notifications.length);
  console.log(
    "🔍 Sample notification:",
    JSON.stringify(notifications[0], null, 2)
  );

  try {
    const createdNotifications = await NotificationModel.insertMany(
      notifications
    );

    console.log(
      "✅ Successfully created notifications:",
      createdNotifications.length
    );

    // Socket events are handled by post-save hook, but you can also emit here
    // if you prefer manual control:

    if (isGlobal) {
      io.emit("notification:new", createdNotifications[0]);
    } else {
      for (const notif of createdNotifications) {
        if (notif.user) {
          io.to(notif.user.toString()).emit("notification:new", notif);
        }
      }
    }

    return createdNotifications;
  } catch (error: any) {
    console.error("❌ insertMany failed:", error);

    if (error.name === "BulkWriteError") {
      console.error("💥 Write errors:", error.writeErrors);
      console.error("✅ Successful inserts:", error.result.insertedCount);

      // Log each error in detail
      error.writeErrors?.forEach((writeError: any, index: any) => {
        console.error(`Error ${index + 1}:`, {
          code: writeError.code,
          message: writeError.errmsg,
          document: writeError.getOperation(),
        });
      });

      // Return any successful insertions
      if (error.result.insertedCount > 0) {
        const insertedIds = Object.values(error.result.insertedIds || {});
        return await NotificationModel.find({ _id: { $in: insertedIds } });
      }
    }

    throw error;
  }
}

export async function getIdsFromPermissions(permissionName: string) {
  // 1. Fetch the permission by name
  const permission = await PermissionModel.findOne({
    name: permissionName,
  }).select("_id");
  if (!permission) {
    throw new AppError(
      `Error fetching user Id's: No such permission '${permissionName}' in the DB`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // 2. Find all roles that include this permission
  const roleIds = await RolePermissionModel.find({
    permission: permission._id,
  }).select("role");
  const roles = roleIds.map((el) => el.role);

  // 3. Users with one or more of these roles
  const usersFromRoles = (
    await UserModel.find({ role: { $in: roles } })
      .select("_id")
      .lean()
  ).map((el) => el._id.toString());

  // 4. Users with active role overrides (granted + not expired or no expiry)
  const usersFromRoleOverride = (
    await RoleOverideModel.find({
      role: { $in: roles },
      isGranted: true,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } },
      ],
    })
      .select("user")
      .lean()
  ).map((el) => el.user.toString());

  // 5. Users with active permission overrides (granted + not expired or no expiry)
  const usersFromPermissionOverride = (
    await PermissionOverideModel.find({
      permission: permission._id,
      isGranted: true,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } },
      ],
    })
      .select("user")
      .lean()
  ).map((el) => el.user.toString());

  // 6. Merge and deduplicate user IDs
  const userIds = [
    ...new Set([
      ...usersFromRoles,
      ...usersFromRoleOverride,
      ...usersFromPermissionOverride,
    ]),
  ];

  return userIds;
}
