import * as mongoose from "mongoose";
import * as currencyCodes from "currency-codes";

//NB: only the user Id should be required in this model.

const guestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "User Id is required"],
    },
    countryOfResidence: {
      type: String,
      trim: true,
    },
    preferedCurrency: {
      type: String,
      validate: {
        validator: function (code: string) {
          return !!currencyCodes.code(code);
        },
        message: "Invalid Currency Code",
        default: "XAF",
      },
      preferedLanguage: {
        type: String,
        enum: {
          values: ["English", "French"],
          message: "Not a supported language",
        },
      },
      isLoyaltyProgramMember: {
        type: Boolean,
        default: false,
        select: false,
      },
      guestTag: {
        type: String,
        trim: true,
      },
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const GuestModel = mongoose.model("guests", guestSchema);
