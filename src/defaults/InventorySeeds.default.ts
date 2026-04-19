import { RoleModel } from "../models/Authorization/Role.model";
import { PermissionModel } from "../models/Authorization/Permission.model";
import { RolePermissionModel } from "../models/Authorization/RolePermission.model";
import { UserModel } from "../models/HR/User.model";
import { InventoryRetentionConfigModel } from "../models/Inventory/Inventoryretentionconfig.model";

const createInventoryRolesAndPermissions = async (forceUpdate = false) => {
  const inventoryRoleDefinitions = [
    {
      name: "inventory superadmin",
      description:
        "Full access to all inventory module features across all locations",
    },
    {
      name: "store manager",
      description:
        "Manages day-to-day inventory operations within their assigned location",
    },
  ];

  for (const roleDef of inventoryRoleDefinitions) {
    const exists = await RoleModel.findOne({ name: roleDef.name });
    if (!exists) {
      await RoleModel.create(roleDef);
      console.log(`✅ Created role: ${roleDef.name}`);
    } else {
      console.log(`ℹ️ Role already exists: ${roleDef.name}`);
    }
  }

  const inventorySuperadmin = await RoleModel.findOne({
    name: "inventory superadmin",
  });
  const storeManager = await RoleModel.findOne({ name: "store manager" });

  if (!inventorySuperadmin || !storeManager) {
    console.log(
      "❌ Inventory roles not found after creation, skipping permissions"
    );
    return;
  }

  const allInventoryPermissions = await PermissionModel.find({
    module: "Inventory Management",
  });

  const storeManagerExcluded = [
    "can_approve_inventory_po",
    "can_read_global_inventory",
    "can_manage_inventory_retention",
    "can_set_inventory_budget",
    "can_approve_inventory_stocktake",
  ];

  const storeManagerPermissions = allInventoryPermissions.filter(
    (p) => !storeManagerExcluded.includes(p.name)
  );

  const assignPermissionsToRole = async (role: any, permissions: any[]) => {
    const existing = await RolePermissionModel.find({
      role: role._id,
    }).populate("permission");

    const validExisting = existing.filter((rp) => rp.permission !== null);

    const orphaned = existing.filter((rp) => rp.permission === null);
    if (orphaned.length > 0) {
      await RolePermissionModel.deleteMany({
        _id: { $in: orphaned.map((rp) => rp._id) },
      });
      console.log(
        `🗑️ Cleaned up ${orphaned.length} orphaned permissions for ${role.name}`
      );
    }

    const existingPermissionIds = validExisting.map((rp) =>
      (rp.permission as any)._id.toString()
    );

    const toAdd = permissions.filter(
      (p) => !existingPermissionIds.includes(p._id.toString())
    );

    let created = 0;
    for (const permission of toAdd) {
      await RolePermissionModel.create({
        role: role._id,
        permission: permission._id,
      });
      created++;
    }

    if (created > 0) {
      console.log(`✅ Added ${created} permissions to role: ${role.name}`);
    } else {
      console.log(`ℹ️ All permissions already mapped to role: ${role.name}`);
    }

    if (forceUpdate) {
      const validPermissionIds = permissions.map((p) => p._id.toString());
      const toRemove = validExisting.filter(
        (rp) =>
          !validPermissionIds.includes((rp.permission as any)._id.toString())
      );

      if (toRemove.length > 0) {
        await RolePermissionModel.deleteMany({
          _id: { $in: toRemove.map((rp) => rp._id) },
        });
        console.log(
          `🗑️ Removed ${toRemove.length} outdated permissions from role: ${role.name}`
        );
      }
    }
  };

  await assignPermissionsToRole(inventorySuperadmin, allInventoryPermissions);
  await assignPermissionsToRole(storeManager, storeManagerPermissions);
};

const createInventoryRetentionConfig = async (forceUpdate = false) => {
  const exists = await InventoryRetentionConfigModel.countDocuments();

  if (exists > 0 && !forceUpdate) {
    console.log(`ℹ️ Inventory retention config already exists.`);
    return;
  }

  // We need a user to set as updatedBy -- use the super admin
  const superAdmin = await RoleModel.findOne({ name: "super admin" });
  const superAdminUser = superAdmin
    ? await UserModel.findOne({ role: superAdmin._id })
    : null;

  if (!superAdminUser) {
    console.log(
      "❌ No super admin user found, skipping inventory retention config"
    );
    return;
  }

  const defaultConfig = {
    key: "singleton",
    movementRetentionDays: 365,
    goodsReceiptRetentionDays: 730,
    purchaseOrderRetentionDays: 730,
    stockTakeRetentionDays: 730,
    financialEventRetentionDays: 1825, // 5 years
    supplierPaymentRetentionDays: 1825, // 5 years
    requisitionRetentionDays: 365,
    updatedBy: superAdminUser._id,
  };

  if (exists && forceUpdate) {
    await InventoryRetentionConfigModel.deleteMany({});
    await InventoryRetentionConfigModel.create(defaultConfig);
    console.log(`🔄 Updated inventory retention config.`);
  } else {
    await InventoryRetentionConfigModel.create(defaultConfig);
    console.log(`✅ Created default inventory retention config.`);
  }
};

const seedInventoryModule = async (forceUpdate = false) => {
  await createInventoryRolesAndPermissions(forceUpdate);
  await createInventoryRetentionConfig(forceUpdate);
};

export default seedInventoryModule;
