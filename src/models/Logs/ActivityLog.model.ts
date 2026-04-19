import * as mongoose from "mongoose";
import { UserModel } from "../HR/User.model";
import { io } from "../../index";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
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
      type: String,
      default: "",
    },
    newDocumentState: {
      type: String,
      default: "",
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

export async function populateActivityLog(doc: any) {
  if (!doc) return null;

  // Populate user
  const populatedDoc = await doc.populate({
    path: "user",
  });

  return populatedDoc || doc;
}

activityLogSchema.post("save", async function (doc) {
  try {
    const populatedDoc = await populateActivityLog(doc);
    io.emit("actitiviryLog:new", populatedDoc);
  } catch (err) {
    console.error("Error emitting restaurantOrder:new:", err);
  }
});

export const ActivityLogModel = mongoose.model(
  "activityLogs",
  activityLogSchema
);
