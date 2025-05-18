import { RolePermissionModel } from "../models/RolePermission.model";
import { PermissionOverideModel } from "../models/PermissionOveride";
import { IUser } from "../models/User.model";
import { IPermission } from "../models/Permission.model";
import { RoleOverideModel } from "../models/RoleOveride.model";

export const getUserPermissions = async (user: IUser) => {
  const roleOveride = await RoleOverideModel.findOne({ user: user._id });
  const roleId =
    roleOveride &&
    (!roleOveride.expiresAt || roleOveride.expiresAt.getTime() > Date.now())
      ? roleOveride.role
      : user.role;

  const rolePermissions = await RolePermissionModel.find({ role: roleId })
    .populate("permission")
    .exec();

  const permissions = (rolePermissions || [])
    .map((doc) => (doc.permission as IPermission)?.name)
    .filter(Boolean);

  const permissionOverides = await PermissionOverideModel.find({
    user: user._id,
  })
    .populate("permission")
    .exec();

  permissionOverides.forEach((override) => {
    if (override.isGranted && override.permission) {
      const { expiresAt } = override;
      if (!expiresAt || expiresAt.getTime() > Date.now()) {
        permissions.push((override.permission as IPermission).name);
      }
    }
  });

  return Array.from(new Set(permissions));
};
