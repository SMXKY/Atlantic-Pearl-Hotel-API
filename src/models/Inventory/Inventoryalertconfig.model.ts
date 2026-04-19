import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryItemModel } from "./Inventoryitem.model";
import { InventoryLocationModel } from "./Inventorylocation.model";

// Alert channels supported. SMS and WhatsApp are defined here
// for forward compatibility but the service layer only activates
// them when the hotel has an active subscription for those channels.
export type AlertChannel = "in_app" | "email" | "sms" | "whatsapp";

export interface IAlertRecipient {
  user: Types.ObjectId;
  channels: AlertChannel[];
}

export interface IInventoryAlertConfig extends Document {
  item: Types.ObjectId;
  location: Types.ObjectId;
  // Stock level at which a WARNING alert fires (approaching minimum)
  warningThreshold: number;
  // Stock level at which a CRITICAL alert fires and isBlocked is set
  criticalThreshold: number;
  recipients: IAlertRecipient[];
  // Minimum minutes between repeated alerts for the same item and location
  cooldownMinutes: number;
  isActive: boolean;
  // Timestamp of the last alert sent for this config
  lastAlertSentAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const alertRecipientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Recipient user reference is required"],
    },

    // At least one channel must be selected per recipient
    channels: {
      type: [
        {
          type: String,
          enum: {
            values: ["in_app", "email", "sms", "whatsapp"],
            message:
              "Invalid channel. Must be one of: in_app, email, sms, whatsapp",
          },
        },
      ],
      validate: {
        validator: function (channels: AlertChannel[]) {
          return channels.length > 0;
        },
        message: "At least one alert channel must be selected per recipient",
      },
    },
  },
  { _id: false }
);

const inventoryAlertConfigSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Types.ObjectId,
      ref: "inventoryitems",
      required: [true, "Item reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryItemModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Item Id not found in the database",
      },
    },

    location: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
      required: [true, "Location reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryLocationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Location Id not found in the database",
      },
    },

    // When currentStock falls to or below this level a WARNING notification fires.
    // Must be higher than criticalThreshold.
    warningThreshold: {
      type: Number,
      required: [true, "Warning threshold is required"],
      min: [0, "Warning threshold cannot be negative"],
    },

    // When currentStock falls to or below this level a CRITICAL notification fires
    // and InventoryItemLocation.isBlocked is set to true automatically.
    // Must be lower than warningThreshold.
    criticalThreshold: {
      type: Number,
      required: [true, "Critical threshold is required"],
      min: [0, "Critical threshold cannot be negative"],
    },

    // Who gets notified and via which channels when an alert fires.
    // In-app and email are always available. SMS and WhatsApp require subscription.
    recipients: {
      type: [alertRecipientSchema],
      validate: {
        validator: function (recipients: IAlertRecipient[]) {
          return recipients.length > 0;
        },
        message:
          "At least one recipient must be configured for an alert config",
      },
    },

    // Minimum time between repeated alerts for the same item and location.
    // Prevents notification spam when stock is hovering around a threshold.
    // Default is 60 minutes.
    cooldownMinutes: {
      type: Number,
      required: [true, "Cooldown period is required"],
      min: [5, "Cooldown must be at least 5 minutes"],
      max: [1440, "Cooldown cannot exceed 1440 minutes (24 hours)"],
      default: 60,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Updated by the service layer each time an alert is dispatched.
    // Used to enforce the cooldown period before firing again.
    lastAlertSentAt: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },

    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One alert config per item per location
inventoryAlertConfigSchema.index({ item: 1, location: 1 }, { unique: true });

inventoryAlertConfigSchema.index({ isActive: 1 });

// Virtual: whether this alert is currently in its cooldown window.
// The service layer checks this before dispatching a new alert.
inventoryAlertConfigSchema.virtual("isInCooldown").get(function () {
  if (!this.lastAlertSentAt) return false;
  const cooldownMs = this.cooldownMinutes * 60 * 1000;
  return new Date().getTime() - this.lastAlertSentAt.getTime() < cooldownMs;
});

// Enforce criticalThreshold is strictly less than warningThreshold.
// Having them equal or reversed would cause both alerts to fire simultaneously
// or the warning to never fire at all.
inventoryAlertConfigSchema.pre("save", function (next) {
  if (this.criticalThreshold >= this.warningThreshold) {
    return next(
      new Error(
        `Critical threshold (${this.criticalThreshold}) must be strictly less than warning threshold (${this.warningThreshold})`
      )
    );
  }
  next();
});

// Enforce no duplicate users in the recipients list.
// A user appearing twice would receive double notifications.
inventoryAlertConfigSchema.pre("save", function (next) {
  if (!this.isModified("recipients")) return next();

  const userIds = this.recipients.map((r) => r.user.toString());
  const uniqueIds = new Set(userIds);

  if (uniqueIds.size !== userIds.length) {
    return next(
      new Error(
        "Duplicate recipients found. Each user can only appear once in the alert config."
      )
    );
  }

  next();
});

export const InventoryAlertConfigModel = mongoose.model<IInventoryAlertConfig>(
  "inventoryalertconfigs",
  inventoryAlertConfigSchema
);
