import * as bcrypt from "bcrypt";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { StatusCodes } from "http-status-codes";

import { UserModel } from "../models/HR/User.model";
import { RoleModel } from "../models/Authorization/Role.model";
import { AppError } from "../util/AppError.util";
import { EmployeeModel } from "../models/HR/Employee.model";

dotenv.config();

export const setupSuperAdmin = async (): Promise<void> => {
  const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME } =
    process.env;

  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD || !SUPER_ADMIN_NAME) {
    console.warn("⚠️ Super Admin env vars missing. Skipping auto-setup.");
    return;
  }

  const usersExist = await UserModel.exists({ email: SUPER_ADMIN_EMAIL });
  if (usersExist) {
    return;
  }

  const superAdminRole = await RoleModel.findOne({ name: "super admin" });
  if (!superAdminRole) {
    console.error("❌ 'super admin' role not found. Seed roles first.");
    return;
  }

  const adminUser = await UserModel.create({
    name: SUPER_ADMIN_NAME,
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    role: superAdminRole._id,
    isEmailVerified: true,
    active: true,
    isEmployee: true,
    isSuperAdmin: true,
    userType: "Employee",
    phoneNumber: "670000000",
  });

  await EmployeeModel.create({
    user: adminUser._id,
    nationality: "Cameroonian",
    residentialAddress: "123 Main Street, Yaoundé",
    employmentType: "Full time",
    dateHired: "2024-01-15",
    salaryInCFA: 250000,
    department: "68148bf883282a32379cc790",
    position: "68148c6c83282a32379cc793",
  });

  console.log(
    "✅ Super Admin created automatically via environment variables."
  );
};
