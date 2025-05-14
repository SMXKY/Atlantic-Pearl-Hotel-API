import * as mongoose from "mongoose";
import * as validator from "validator";
import { isValidNumber } from "libphonenumber-js";
import bcrypt from "bcrypt";
import { RoleModel } from "./Role.model";
import { Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  passwordConfirm?: string;
  passwordChangedAt?: Date;
  dateOfBirth: Date;
  gender: "M" | "F";
  emergencyContact: string;
  isActive?: boolean;
  deactivatedUntil?: Date;
  profilePictureUrl?: string;
  role: Types.ObjectId;
  userType: "Guest" | "Employee";
  failedLoginAttempts?: number;
  lockUntil?: Date;
  googleId?: string;
  passWordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "User name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "User email is required."],
      validate: {
        validator: function (email: string) {
          return validator.isEmail(email);
        },
        message: "Invalid Email format",
      },
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required."],
      max: [12, "Phone number cannot be more than 12 characters"],
      min: [8, "Phone number cannot be less that 8 characters"],
      validate: {
        validator: function (phoneNumber: string) {
          return isValidNumber(phoneNumber, "CM");
        },
        message: "Invalid phone number format",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "User password is required"],
      minLength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      validate: {
        validator: function (this: IUser) {
          return this.isNew || this.password === this.passwordConfirm;
        },
        message: "The two passwords you entered must be identical",
      },
      select: false,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "User date of birth is required"],
      validate: {
        validator: function (dob: Date) {
          const age = new Date().getFullYear() - dob.getFullYear();
          return age >= 16; // Ensure the user is at least 18 years old
        },
        message: "User must be at least 16 years old",
      },
    },
    gender: {
      type: String,
      enum: ["M", "F"],
      default: "M", // Default to 'M' if no value is provided
    },
    emergencyContact: {
      type: String,
      required: [true, "Emergency contact phone number is required."],
      max: [12, "Phone number cannot be more than 12 characters"],
      min: [8, "Phone number cannot be less that 8 characters"],
      validate: {
        validator: function (phoneNumber: string) {
          return isValidNumber(phoneNumber, "CM");
        },
        message: "Invalid phone number format",
      },
    },
    isActive: {
      type: Boolean,
      select: false,
      default: true,
    },
    deactivatedUntil: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    profilePictureUrl: {
      type: String,
      validate: {
        validator: function (url: string) {
          return validator.isURL(url);
        },
        message: "Invalid URL format",
      },
    },
    role: {
      type: mongoose.Types.ObjectId,
      ref: "roles",
      required: [true, "User role, is required (role, id)"],
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          // Check if the manager exists
          const exists = await RoleModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Role Id not found iin the database.",
      },
    },
    userType: {
      type: String,
      required: [true, "User must be assigned a type"],
      enum: {
        values: ["Guest", "Employee"],
        message: "User must be of type Guest or Employee",
      },
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    googleId: {
      type: String,
      trim: true,
    },
    passWordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre(/^find/, function (this: mongoose.Query<any, IUser>, next) {
  this.where({ isActive: { $ne: false } });
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  // If user is not new, update passwordChangedAt
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 2000);
  }

  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) {
    return next();
  }

  this.passWordChangedAt = new Date(Date.now() - 2000);

  next();
});

export const UserModel = mongoose.model("users", userSchema);
