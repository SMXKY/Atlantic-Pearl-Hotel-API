import * as mongoose from "mongoose";

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
    },
    position: {
      type: mongoose.Types.ObjectId,
      ref: "positions",
      required: [true, "Every employee must be assigned a position"],
    },
  },
  {
    timestamps: true,
  }
);

export const EmployeeModel = mongoose.model("employees", employeeSchema);
