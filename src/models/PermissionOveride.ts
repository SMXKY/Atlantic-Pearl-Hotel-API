import * as mongoose from "mongoose";
import { UserModel } from "./User.model";
import { PermissionModel } from "./Permission.model";

interface IPermissionOveride extends mongoose.Document {
  isTemporary: boolean;
  expiresAt: Date;
}

const permissionOverideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await UserModel.exists({ _id: id });
          return exists !== null;
        },
        message: "User Id not found iin the database.",
      },
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await UserModel.exists({ _id: id });
          return exists !== null;
        },
        message: "User (created_by) Id not found iin the database.",
      },
    },
    permission: {
      type: mongoose.Types.ObjectId,
      ref: "permissions",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await PermissionModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Permission Id not found iin the database.",
      },
    },
    isGranted: { type: Boolean, default: false },
    isTemporary: {
      type: Boolean,
      default: true,
      requied: [
        true,
        "You specify if the permison you are granting is permenent or temporal",
      ],
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: function (this: IPermissionOveride) {
          if (this.isTemporary) {
            return !!this.expiresAt;
          }
          return true;
        },
        message: "Temporary permissions must have an expiration date",
      },
    },

    reason: {
      type: String,
      trim: true,
      required: [
        true,
        "You must provide a reson why this user is granted this perssion",
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const PermissionOverideModel = mongoose.model(
  "permissionoverides",
  permissionOverideSchema
);
