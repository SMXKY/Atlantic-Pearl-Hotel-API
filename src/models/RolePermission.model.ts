import * as mongoose from "mongoose";

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: mongoose.Types.ObjectId,
      ref: "roles",
      required: true,
    },
    permission: {
      type: mongoose.Types.ObjectId,
      ref: "permissions",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RolePermissionModel = mongoose.model(
  "rolePermissions",
  rolePermissionSchema
);
