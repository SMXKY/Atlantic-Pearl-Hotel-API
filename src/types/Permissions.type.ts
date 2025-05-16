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
};
