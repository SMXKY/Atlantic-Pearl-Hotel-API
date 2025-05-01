import * as mongoose from "mongoose";
import * as validator from "validator";
import { isValidNumber } from "libphonenumber-js";

interface IUser extends mongoose.Document {
  password: string;
  passwordConfirm: string;
}

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "User first name is required."],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "User last name is required."],
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
          return this.password === this.passwordConfirm;
        },
        message: "The two passwords you entered must be identical",
      },
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
    },
    deactivatedUntile: {
      type: Date,
      select: false,
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
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model("users", userSchema);
