import * as mongoose from "mongoose";
import { UserModel } from "./User.model";
import { RoleModel } from "./Role.model";

interface IRolenOveride extends mongoose.Document {
  isTemporary: boolean;
  expiresAt: Date;
}

const roleOverideSchema = new mongoose.Schema(
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
          const exists = await UserModel.exists({ _id: id });
          return exists !== null;
        },
        message: "User (created_by) Id not found iin the database.",
      },
    },
    isGranted: { type: Boolean, default: false },
    isTemporary: {
      type: Boolean,
      default: true,
      requied: [
        true,
        "You specify if the role you are granting is permenent or temporal",
      ],
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: function (this: IRolenOveride) {
          if (this.isTemporary) {
            return !!this.expiresAt;
          }
          return true;
        },
        message: "Temporary permissions must have an expiration date.",
      },
    },
    role: {
      type: mongoose.Types.ObjectId,
      ref: "roles",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await RoleModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Role Id not found iin the database.",
      },
    },
    reason: {
      type: String,
      trim: true,
      required: [
        true,
        "You must provide a reson why this user is granted this role.",
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roleOverideSchema.pre("save", function (next) {
  if (!this.isTemporary) return next();

  if (!this.expiresAt) {
    return next(
      new Error("Temporary role overrides must have an expiry date.")
    );
  }

  if (this.expiresAt.getTime() <= Date.now()) {
    return next(new Error("Expiration date for roles must be in the future."));
  }

  next();
});

roleOverideSchema.index({ user: 1, role: 1 }, { unique: true });

export const RoleOverideModel = mongoose.model(
  "roleOverides",
  roleOverideSchema
);
