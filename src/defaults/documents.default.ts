import { TaxModel } from "../models/Finance/Tax.model";
import { PermissionModel } from "../models/Authorization/Permission.model";
import { RoleModel } from "../models/Authorization/Role.model";
import { RolePermissionModel } from "../models/Authorization/RolePermission.model";
import { allPermissions } from "../types/Permissions.type";
import { AdminConfigurationModel } from "../models/Config/AdminConfiguration.model";
import { RestaurantConfigModel } from "../models/Restaurant/RestaurantConfig.model";

export const createDefaultDocuments = async (forceUpdate = false) => {
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

    for (const roleData of defaultRoles) {
      const exists = await RoleModel.findOne({ name: roleData.name });
      if (!exists) {
        await RoleModel.create(roleData);
        console.log(`✅ Created default role: ${roleData.name}`);
      } else if (forceUpdate) {
        await RoleModel.updateOne({ name: roleData.name }, roleData);
        console.log(`🔄 Updated role: ${roleData.name}`);
      }
    }
  };

  const createDefaultPermissions = async () => {
    type PermItem = { name: string; module?: string; submodule?: string };
    const items: PermItem[] = [];

    Object.values(allPermissions).forEach((group: any) => {
      const module = group.module;
      const submodule = group.submodule;

      if (group.permissions && typeof group.permissions === "object") {
        Object.values(group.permissions).forEach((val) => {
          if (typeof val === "string")
            items.push({ name: val, module, submodule });
        });
        return;
      }

      Object.keys(group).forEach((key) => {
        if (key === "module" || key === "submodule") return;
        const val = (group as any)[key];
        if (typeof val === "string")
          items.push({ name: val, module, submodule });
      });
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const p of items) {
      const exists = await PermissionModel.findOne({ name: p.name });

      if (!exists) {
        await PermissionModel.create({
          name: p.name,
          description: "Default system permission",
          module: p.module ?? null,
          submodule: p.submodule ?? null,
        });
        created++;
        console.log(
          `✅ Created permission: ${p.name} (module: ${p.module}, submodule: ${p.submodule})`
        );
      } else if (forceUpdate) {
        await PermissionModel.updateOne(
          { name: p.name },
          {
            description: "Default system permission",
            module: p.module ?? null,
            submodule: p.submodule ?? null,
          }
        );
        updated++;
        console.log(`🔄 Updated permission: ${p.name}`);
      } else {
        skipped++;
      }
    }

    console.log(
      `📊 Permissions - Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`
    );
    return { created, updated, skipped };
  };

  const createDefaultRolePermissions = async () => {
    const superAdmin = await RoleModel.findOne({ name: "super admin" });
    if (!superAdmin) {
      console.log("❌ Super admin role not found, skipping role permissions");
      return;
    }

    const allPermissions = await PermissionModel.find();

    const existingRolePermissions = await RolePermissionModel.find({
      role: superAdmin._id,
    }).populate("permission");

    const validRolePermissions = existingRolePermissions.filter(
      (rp) => rp.permission !== null
    );
    const orphanedRolePermissions = existingRolePermissions.filter(
      (rp) => rp.permission === null
    );

    if (orphanedRolePermissions.length > 0) {
      await RolePermissionModel.deleteMany({
        _id: { $in: orphanedRolePermissions.map((rp) => rp._id) },
      });
      console.log(
        `🗑️ Cleaned up ${orphanedRolePermissions.length} orphaned role permissions.`
      );
    }

    const existingPermissionIds = validRolePermissions.map((rp) =>
      (rp.permission as any)._id.toString()
    );

    const permissionsToAdd = allPermissions.filter(
      (permission) => !existingPermissionIds.includes(permission._id.toString())
    );

    let created = 0;
    for (const permission of permissionsToAdd) {
      await RolePermissionModel.create({
        role: superAdmin._id,
        permission: permission._id,
      });
      created++;
    }

    if (created > 0) {
      console.log(`✅ Added ${created} new permissions to super admin role.`);
    } else {
      console.log(`ℹ️ All permissions already mapped to super admin role.`);
    }

    if (forceUpdate) {
      const validPermissionIds = allPermissions.map((p) => p._id.toString());
      const orphanedRolePermissions = validRolePermissions.filter(
        (rp) =>
          !validPermissionIds.includes((rp.permission as any)._id.toString())
      );

      if (orphanedRolePermissions.length > 0) {
        await RolePermissionModel.deleteMany({
          _id: { $in: orphanedRolePermissions.map((rp) => rp._id) },
        });
        console.log(
          `🗑️ Removed ${orphanedRolePermissions.length} orphaned role permissions.`
        );
      }
    }
  };

  const createDefaultTaxes = async () => {
    const defaultTaxes = [
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
    ];

    let created = 0;
    for (const taxData of defaultTaxes) {
      const exists = await TaxModel.findOne({ name: taxData.name });
      if (!exists) {
        await TaxModel.create(taxData);
        created++;
        console.log(`✅ Created tax: ${taxData.name}`);
      }
    }

    if (created === 0) {
      console.log(`ℹ️ All default taxes already exist.`);
    }
  };

  const createDefaultAdminConfigurations = async () => {
    const configExists = await AdminConfigurationModel.countDocuments();
    if (configExists > 0 && !forceUpdate) {
      console.log(`ℹ️ Admin configuration already exists.`);
      return;
    }

    const defaultConfig = {
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
    };

    if (configExists && forceUpdate) {
      await AdminConfigurationModel.deleteMany({});
      await AdminConfigurationModel.create(defaultConfig);
      console.log(`🔄 Updated admin configurations.`);
    } else {
      await AdminConfigurationModel.create(defaultConfig);
      console.log(`✅ Created default admin configurations.`);
    }
  };

  const createDefaultRestaurantConfig = async () => {
    const configExists = await RestaurantConfigModel.countDocuments();
    if (configExists > 0 && !forceUpdate) {
      console.log(`ℹ️ Restaurant configuration already exists.`);
      return;
    }

    const defaultConfig = {
      breakfastStart: "06:00",
      breakfastEnd: "10:00",
      lunchStart: "12:00",
      lunchEnd: "15:00",
      dinnerStart: "18:00",
      dinnerEnd: "22:00",

      maxBreakfastPerRoom: 1,
      maxLunchPerRoom: 1,
      maxDinnerPerRoom: 1,
    };

    if (configExists && forceUpdate) {
      await RestaurantConfigModel.deleteMany({});
      await RestaurantConfigModel.create(defaultConfig);
      console.log(`🔄 Updated restaurant configurations.`);
    } else {
      await RestaurantConfigModel.create(defaultConfig);
      console.log(`✅ Created default restaurant configurations.`);
    }
  };

  try {
    console.log("🚀 Starting default documents creation...");

    await createDefaultRoles();
    const permissionStats = await createDefaultPermissions();
    await createDefaultRolePermissions();
    await createDefaultTaxes();
    await createDefaultAdminConfigurations();
    await createDefaultRestaurantConfig();

    console.log("✅ Default documents creation completed!");

    return {
      success: true,
      permissionStats,
      forceUpdate,
    };
  } catch (error) {
    console.error("❌ Error creating default documents:", error);
    throw error;
  }
};
