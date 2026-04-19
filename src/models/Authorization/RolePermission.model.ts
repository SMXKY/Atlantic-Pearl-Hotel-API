import * as mongoose from "mongoose";
import { RoleModel } from "./Role.model";
import { PermissionModel } from "./Permission.model";

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: mongoose.Types.ObjectId,
      ref: "roles",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await RoleModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Role Id not found iin the database.",
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });

export const RolePermissionModel = mongoose.model(
  "rolePermissions",
  rolePermissionSchema
);
