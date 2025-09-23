import { Schema, model, Types } from "mongoose";
import validator from "validator";
import { io } from "../index";

export enum NotificationType {
  // Domain-specific
  RESERVATION = "reservation",
  PAYMENT = "payment",
  RESTAURANT = "restaurant",

  // Generic/meta
  SYSTEM = "system",
  MESSAGE = "message",
  ALERT = "alert",

  // Catch-all
  OTHER = "other",
}

export interface INotification {
  _id?: Types.ObjectId;
  user?: Types.ObjectId; // Optional since global notifications don't have user
  title: string;
  message: string;
  type: NotificationType;
  entityRef?: {
    model: string;
    id: Types.ObjectId;
  };
  redirectUrl?: string;
  isRead: boolean;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
      required: function (this: INotification) {
        return !this.isGlobal; // Only required if not global
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    entityRef: {
      model: {
        type: String,
        required: function (this: INotification) {
          return this.entityRef && this.entityRef.id;
        },
      },
      id: {
        type: Schema.Types.ObjectId,
        required: function (this: INotification) {
          return this.entityRef && this.entityRef.model;
        },
      },
    },
    redirectUrl: {
      type: String,
      // validate: {
      //   validator: function (v: string) {
      //     if (!v) return true;
      //     if (v.startsWith("/")) return true;
      //     return validator.isURL(v, { require_protocol: true });
      //   },
      //   message: "Invalid redirect URL",
      // },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically handles createdAt and updatedAt
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for better query performance
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ isGlobal: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1, createdAt: -1 });

// Pre-save validation
NotificationSchema.pre("save", function (next) {
  // Ensure global notifications don't have a user
  if (this.isGlobal && this.user) {
    this.user = undefined;
  }

  // Ensure non-global notifications have a user
  if (!this.isGlobal && !this.user) {
    return next(new Error("Non-global notifications must have a user"));
  }

  next();
});

// Pre-validate for insertMany operations
NotificationSchema.pre("validate", function (next) {
  // Same validation for bulk operations
  if (this.isGlobal && this.user) {
    this.user = undefined;
  }

  if (!this.isGlobal && !this.user) {
    return next(new Error("Non-global notifications must have a user"));
  }

  next();
});

// In your Notification schema file
NotificationSchema.post("findOneAndUpdate", async function (doc) {
  try {
    if (!doc) return; // No updated document

    const notification = doc.toObject();

    if (doc.isGlobal) {
      io.emit("notification:update", notification);
    } else if (doc.user) {
      io.to(doc.user.toString()).emit("notification:update", notification);
    }
  } catch (error) {
    console.error("Error emitting notification update:", error);
  }
});

export const NotificationModel = model<INotification>(
  "Notification",
  NotificationSchema
);

// Type for input when creating notifications
export interface SendNotificationInput {
  userIds?: string[];
  title: string;
  message: string;
  type: NotificationType;
  entityRef?: {
    model: string;
    id: Types.ObjectId | string;
  };
  redirectUrl?: string;
  isGlobal?: boolean;
}
