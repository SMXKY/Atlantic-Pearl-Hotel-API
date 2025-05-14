import * as mongoose from "mongoose";
import { EmployeeModel } from "./Employee.model";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      unique: true,
      required: [true, "department name is required"],
    },
    description: {
      type: String,
      trim: true,
    },
    manager: {
      type: mongoose.Types.ObjectId,
      ref: "employees",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await EmployeeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Manager must be an existing employee.",
      },
    },
    isActive: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const DepartmentModel = mongoose.model("departments", departmentSchema);
