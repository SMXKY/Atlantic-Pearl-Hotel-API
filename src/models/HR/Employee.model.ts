import * as mongoose from "mongoose";
import { DepartmentModel } from "./Department.model";
import { PositionModel } from "./Position.model";

const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "User Id is required"],
    },
    nationality: {
      type: String,
      trim: true,
    },
    residentialAddress: {
      type: String,
      trim: true,
    },
    employmentType: {
      type: String,
      enum: {
        values: [
          "Full time",
          "Part time",
          "Temporary",
          "Internship",
          "contract",
          "Freelance",
          "volunteer",
        ],
        message: `Employment type can only be "Full time","Part time", "Temporary", "Internship", "contract", "Freelance", or "volunteer",`,
      },
    },
    dateHired: {
      type: Date,
      required: [true, "Employee date of employment is required"],
    },
    salaryInCFA: {
      type: Number,
      validate: {
        validator: function (amount: number) {
          if (amount < 0) {
            return false;
          }
          return true;
        },

        message: "Salary cannot be negative",
      },
    },
    department: {
      type: mongoose.Types.ObjectId,
      ref: "departments",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await DepartmentModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Department Id not found iin the database.",
      },
    },
    position: {
      type: mongoose.Types.ObjectId,
      ref: "positions",
      required: [true, "Every employee must be assigned a position"],
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await PositionModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Position Id not found iin the database.",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const EmployeeModel = mongoose.model("employees", employeeSchema);
