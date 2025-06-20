import * as mongoose from "mongoose";
import * as currencyCodes from "currency-codes";

import { Document, Types } from "mongoose";
import { IUser } from "./User.model";

export interface IGuest extends Document {
  user: Types.ObjectId | IUser;
  countryOfResidence?: string;
  preferedCurrency?: string;
  preferedLanguage?: "English" | "French";
  isLoyaltyProgramMember?: boolean;
  guestTag?: string;
  guestType:
    | "Individual"
    | "Couple"
    | "Family"
    | "Group"
    | "Corporate"
    | "Walk-in"
    | "VIP"
    | "Loyalty Member"
    | "Event Attendee"
    | "Government/Military"
    | "Long-stay"
    | "OTA";
  hasConfirmedEmail?: boolean;
  NIC?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

//NB: only the user Id should be required in this model.

const guestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "User Id is required"],
    },
    username: {
      type: String,
      unique: true,
      required: [true, "Guest username is required."],
    },
    countryOfResidence: {
      type: String,
      trim: true,
    },
    preferences: {
      currentcy: {
        type: String,
        validate: {
          validator: function (code: string) {
            return !!currencyCodes.code(code);
          },
          message: "Invalid Currency Code",
          default: "XAF",
        },
      },
      preferedLanguage: {
        type: String,
        enum: {
          values: ["English", "French"],
          message: "Not a supported language",
        },
        default: "English",
      },
      isLoyaltyProgramMember: {
        type: Boolean,
        default: false,
        select: false,
      },
    },
    guestTag: {
      type: String,
      trim: true,
    },
    guestType: {
      type: String,
      enum: [
        "Individual",
        "Couple",
        "Family",
        "Group",
        "Corporate",
        "Walk-in",
        "VIP",
        "Loyalty Member",
        "Event Attendee",
        "Government/Military",
        "Long-stay",
        "OTA",
      ],
      default: "Individual",
    },
    hasConfirmedEmail: {
      type: Boolean,
      default: false,
    },
    NIC: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const GuestModel = mongoose.model<IGuest>("guests", guestSchema);
