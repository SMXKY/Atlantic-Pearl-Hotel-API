import { RolePermissionModel } from "../models/RolePermission.model";
// import { PermissionModel } from "../models/Permission.model";
import { PermissionOverideModel } from "../models/PermissionOveride";
import { IUser } from "../models/User.model";
import { IPermission } from "../models/Permission.model";

export const getUserPermissions = async (user: IUser) => {
  const permissions = (
    await RolePermissionModel.find({
      role: user?.role,
    })
      .populate("permission")
      .exec()
  )?.map((doc) => (doc.permission as IPermission).name);

  const permissionOverides = await PermissionOverideModel.find({
    user: user._id,
  }).populate("permission");

  permissionOverides.forEach((override) => {
    if (
      override.isGranted &&
      override.permission &&
      (!override.expiresAt || override.expiresAt.getTime() > Date.now())
    ) {
      permissions.push((override.permission as IPermission).name);
    }
  });

  return Array.from(new Set(permissions));
};
