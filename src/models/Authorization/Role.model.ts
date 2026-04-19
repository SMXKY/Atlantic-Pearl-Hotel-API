import * as mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roleSchema.virtual("permissions", {
  ref: "rolePermissions",
  localField: "_id",
  foreignField: "role",
  justOne: false,
});

import { Query } from "mongoose";

roleSchema.pre(/^find/, function (this: Query<any, any>, next) {
  this.populate({
    path: "permissions",
    populate: { path: "permission" },
  });

  next();
});

export const RoleModel = mongoose.model("roles", roleSchema);
