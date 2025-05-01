import * as mongoose from "mongoose";

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
    },
    isActive: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

export const departmentModel = mongoose.model("departments", departmentSchema);
