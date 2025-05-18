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
};
