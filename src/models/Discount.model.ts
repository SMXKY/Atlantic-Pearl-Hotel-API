import { StatusCodes } from "http-status-codes";
import * as mongoose from "mongoose";
import { AppError } from "../util/AppError.util";
const { v4: uuidv4 } = require("uuid");

interface IDiscount extends mongoose.Document {
  code: string;
  description: string;
  isActive: boolean;
  percentageOff?: number;
  amountOffInCFA?: number;
  type?: "Amount" | "Percentage";
  expiresOn: Date;
  name: string;
}

const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Discount must have a name"],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    percentageOff: {
      type: Number,
      validate: {
        validator: function (percentage: number) {
          if (percentage < 1 || percentage > 99) {
            return false;
          }
          return true;
        },
        message: "Percentage Off must be between 1 and 99",
      },
    },
    amountOffInCFA: {
      type: Number,
      validate: {
        validator: function (amount: number) {
          if (amount < 1) {
            return false;
          }
          return true;
        },
        message: "Amount Off must be between greater than 1FCFA",
      },
    },
    type: {
      type: String,
      enum: {
        values: ["Amount", "Percentage"],
        message:
          "Invalid Discount Type! Allowed values are:  ['Amount', 'Percentage']",
      },
    },
    expiresOn: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

discountSchema.pre("save", function (next) {
  if (!this.percentageOff && !this.amountOffInCFA) {
    return next(
      new AppError(
        "Discounts must have an amount or percentage off",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  if (this.percentageOff && this.amountOffInCFA) {
    return next(
      new AppError(
        "Discounts must have an amount or percentage off, not both at the same time",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  this.type = this.percentageOff ? "Percentage" : "Amount";
  next();
});

//Generate Discount Code
discountSchema.pre<IDiscount>("save", async function (next) {
  if (this.code) {
    return next();
  }

  const firstLetters = this.name
    .split(" ")
    .map((el) => el[0])
    .join("")
    .toUpperCase();

  const MAX_ATTEMPTS = 10;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    const ref = `${firstLetters}-${uuidv4().split("-")[0].toUpperCase()}`;
    const exists = await mongoose.models.discounts.exists({ code: ref });

    if (!exists) {
      this.code = ref;
      break;
    }

    attempts++;
  }

  if (!this.code) {
    return next(
      new AppError(
        "Failed to generate unique discount code",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  next();
});

discountSchema.pre(
  /^find/,
  function (this: mongoose.Query<any, IDiscount>, next) {
    this.where({
      isActive: { $ne: false },
      $or: [
        { expiresOn: { $exists: false } },
        { expiresOn: { $gt: new Date() } },
      ],
    });

    next();
  }
);

export const DiscountModel = mongoose.model("discounts", discountSchema);
