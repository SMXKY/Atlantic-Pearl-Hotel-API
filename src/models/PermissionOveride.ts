import * as mongoose from "mongoose";

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
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
    },
    permission: {
      type: mongoose.Types.ObjectId,
      ref: "permissions",
      required: true,
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
  { timestamps: true }
);

export const permissionOverideModel = mongoose.model(
  "permissionoverides",
  permissionOverideSchema
);
