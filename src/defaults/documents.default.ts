import { TaxModel } from "../models/Tax.model";
import { PermissionModel } from "../models/Permission.model";
import { RoleModel } from "../models/Role.model";
import { RolePermissionModel } from "../models/RolePermission.model";
import { allPermissions } from "../types/Permissions.type";
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";

export const createDefualtDcouments = async () => {
  const rolesExist = await RoleModel.find();
  const permissionsExist = await PermissionModel.find();

  if (rolesExist.length > 0 || permissionsExist.length > 0) {
    return;
  }

  const createDefaultRoles = async () => {
    const defaultRoles = [
      {
        name: "super admin",
        description: "Has access to all routes on the app",
      },
      {
        name: "admin",
        description: "Has access to all routes except very sensitive data",
      },
      { name: "guest", description: "Has access to user routes" },
    ];

    try {
      for (const role of defaultRoles) {
        const existingRole = await RoleModel.findOne({ name: role.name });
        if (!existingRole) {
          const createdRole = await RoleModel.create(role);
          //   allDefaultRoles.push(createdRole._id.toString());
          console.log(`Created default role: ${role}`);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const createDefaultPermissions = async () => {
    const defaultPermissions: string[] = [];

    Object.values(allPermissions).forEach((permissions) => {
      // Push each sub-property value into the array
      defaultPermissions.push(...Object.values(permissions));
    });

    try {
      for (const permission of defaultPermissions) {
        const existingRole = await PermissionModel.findOne({
          name: permission,
        });

        if (!existingRole) {
          const createdPermission = await PermissionModel.create({
            name: permission,
            description: "Default system permssion",
          });

          //   allDefaultPermissions.push(createdPermission._id.toString());
          console.log(`Created default permssion: ${permission}`);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const createDefaultRolePermissions = async () => {
    const superAdmin = await RoleModel.findOne({ name: "super admin" });
    const permissions = await PermissionModel.find();

    try {
      for (const permission of permissions) {
        await RolePermissionModel.create({
          role: superAdmin?._id,
          permission: permission._id,
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  const createDefaultTaxes = async () => {
    try {
      await TaxModel.create([
        {
          name: "Value Added Tax",
          percentage: 19.25,
          taxType: "percentage",
          protected: true,
        },
        {
          name: "Tourist Tax",
          amount: 3000,
          taxType: "amount",
          protected: true,
        },
      ]);
    } catch (err) {
      console.log(err);
    }
  };

  const createDefaultAdminConfigurations = async () => {
    try {
      await AdminConfigurationModel.create({
        reservations: {
          minimumDepositPercentage: {
            value: 30,
            description:
              "The minimum deposit required (in %) to confirm a reservation.",
          },
          expireAfter: {
            value: 30,
            description:
              "The number of minutes after which an unconfirmed reservation expires.",
          },
          cancelationPolicy: {
            isRefundable: true,
            refundableUntilInHours: 24,
            refundablePercentage: 80,
          },
        },
      });
    } catch (err) {
      console.log(err);
    }
  };

  await createDefaultRoles();
  await createDefaultPermissions();
  await createDefaultRolePermissions();
  await createDefaultTaxes();
  await createDefaultAdminConfigurations();
};
