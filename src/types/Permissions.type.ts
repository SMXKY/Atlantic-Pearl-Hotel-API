/*
The Permission tree can only be a single step deep e.g

  {
    users: {
      readOne: "can_read_user",
      readAll: "can_read_all_users",
      delete: "can_delete_user",
    },
  };

  So users.readOne, is as far as you can go
*/

export const allPermissions = {
  users: {
    readOne: "can_read_user",
    readAll: "can_read_all_users",
    delete: "can_delete_user",
    update: "can_update_user",
    create: "can_create_user",
    updatePassword: "can_update_password",
  },
  auth: {
    activateAccount: "can_activate_account",
    deActivateAccount: "can_de_activate_account",
  },
  departments: {
    readOne: "can_read_department",
    readAll: "can_read_all_departments",
    delete: "can_delete_department",
    update: "can_update_department",
    create: "can_create_department",
  },
  employees: {
    readOne: "can_read_employee",
    readAll: "can_read_all_employees",
    delete: "can_delete_employee",
    update: "can_update_employee",
    create: "can_create_employee",
  },
  guest: {
    readOne: "can_read_guest",
    readAll: "can_read_all_guests",
    delete: "can_delete_guest",
    update: "can_update_guest",
    create: "can_create_guest",
  },
  permissions: {
    readOne: "can_read_permission",
    readAll: "can_read_all_permissions",
    delete: "can_delete_permission",
    update: "can_update_permission",
    create: "can_create_permission",
  },
  permissionOverides: {
    readOne: "can_read_permission_overide",
    readAll: "can_read_all_permission_overides",
    delete: "can_delete_permission_overide",
    update: "can_update_permission_overide",
    create: "can_create_permission_overide",
  },
  roleOverides: {
    readOne: "can_read_role_overide",
    readAll: "can_read_all_role_overides",
    delete: "can_delete_role_overide",
    update: "can_update_role_overide",
    create: "can_create_role_overide",
  },
  position: {
    readOne: "can_read_position",
    readAll: "can_read_all_positions",
    delete: "can_delete_position",
    update: "can_update_position",
    create: "can_create_position",
  },
  roles: {
    readOne: "can_read_role",
    readAll: "can_read_all_roles",
    delete: "can_delete_role",
    update: "can_update_role",
    create: "can_create_role",
  },
  rolePermissions: {
    readOne: "can_read_role_permission",
    readAll: "can_read_all_role_permissions",
    delete: "can_delete_role_permission",
    update: "can_update_role_permission",
    create: "can_create_role_permission",
  },
  activityLogs: {
    read: "can_read_activity_logs",
  },
};
