import { TaxModel } from "../models/Tax.model";
import { PermissionModel } from "../models/Permission.model";
import { RoleModel } from "../models/Role.model";
import { RolePermissionModel } from "../models/RolePermission.model";
import { allPermissions } from "../types/Permissions.type";
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";

export const createDefaultDocuments = async () => {
  const createDefaultRoles = async () => {
    const rolesExist = await RoleModel.countDocuments();
    if (rolesExist > 0) return;

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

    for (const role of defaultRoles) {
      await RoleModel.create(role);
      console.log(`✅ Created default role: ${role.name}`);
    }
  };

  const createDefaultPermissions = async () => {
    const permissionsExist = await PermissionModel.countDocuments();
    if (permissionsExist > 0) return;

    const defaultPermissions: string[] = [];
    Object.values(allPermissions).forEach((group) => {
      defaultPermissions.push(...Object.values(group));
    });

    for (const permission of defaultPermissions) {
      await PermissionModel.create({
        name: permission,
        description: "Default system permission",
      });
      console.log(`✅ Created default permission: ${permission}`);
    }
  };

  const createDefaultRolePermissions = async () => {
    const existing = await RolePermissionModel.countDocuments();
    if (existing > 0) return;

    const superAdmin = await RoleModel.findOne({ name: "super admin" });
    const permissions = await PermissionModel.find();

    if (!superAdmin) return;

    for (const permission of permissions) {
      await RolePermissionModel.create({
        role: superAdmin._id,
        permission: permission._id,
      });
    }

    console.log(`✅ Mapped all permissions to super admin role.`);
  };

  const createDefaultTaxes = async () => {
    const taxesExist = await TaxModel.countDocuments();
    if (taxesExist > 0) return;

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

    console.log(`✅ Created default taxes.`);
  };

  const createDefaultAdminConfigurations = async () => {
    const configExists = await AdminConfigurationModel.countDocuments();
    if (configExists > 0) return;

    await AdminConfigurationModel.create({
      reservations: {
        minimumDepositPercentage: {
          value: 20,
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
          refundableUntilInHours: 48,
          refundablePercentage: 80,
        },
      },
      hotel: {
        policies: {
          smokingAllowed: false,
          petsAllowed: true,
          partyingAllowed: false,
          checkInTime: "15:00",
          checkOutTime: "11:00",
          description: "No smoking. Pets allowed. Quiet hours after 10 PM.",
        },
      },
    });

    console.log(`✅ Created default admin configurations.`);
  };

  // Run all setups in parallel for better performance
  await Promise.all([
    createDefaultRoles(),
    createDefaultPermissions(),
    createDefaultRolePermissions(),
    createDefaultTaxes(),
    createDefaultAdminConfigurations(),
  ]);
};
