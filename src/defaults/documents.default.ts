import { RoleModel } from "../models/Role.model";

const createDefualtDcouments = () => {
  const allDefaultRoles = [];

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
          allDefaultRoles.push(createdRole._id);
          console.log(`Created default role: ${role}`);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };
};
