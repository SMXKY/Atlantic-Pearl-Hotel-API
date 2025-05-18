import * as mongoose from "mongoose";
import { UserModel } from "./User.model";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await UserModel.exists({ _id: id });
          return exists !== null;
        },
        message: "User ID not found in the database.",
      },
    },
    action: {
      type: String,
      required: [true, "Action is required to create an Activity Log"],
      trim: true,
    },
    collectionName: {
      type: String,
      required: [true, "Collection name is required to create an Activity Log"],
      trim: true,
    },
    resourceId: {
      type: String,
      // required: [true, "Resource ID is required to create an Activity Log"],
      trim: true,
    },
    previousDocumentState: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    newDocumentState: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      match: [
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        "Invalid IP address format",
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const ActivityLogModel = mongoose.model(
  "activityLogs",
  activityLogSchema
);
