import * as mongoose from "mongoose";
import validator from "validator";
import { isValidNumber } from "libphonenumber-js";
import { AppError } from "util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { GuestModel } from "./Guest.model";
import { EmployeeModel } from "./Employee.model";
import { DiscountModel } from "./Discount.model";
const { v4: uuidv4 } = require("uuid");

interface IReservation extends mongoose.Document {
  bookingReference: string;
}

/*
TODO:
  - Automatically change status to "no show" if reservation is not redeemed 3 hours after check-in time (consider using a cron job).
  - Automatically cancel or mark as expired if a reservation is not paid for after a given time.
  - Feature: create guest account from reservation info.
  - Feature: auto-fill reservation info for guests with an account.
  - Return different room lists for employees and regular guests.
  - If account created from reservation with deposit, set the used payment method as their default preferred payment method.
*/

const reservationSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: [true, "Booking reference is required to create reservation"],
      unique: true,
    },
    status: {
      type: String,
      enum: {
        values: ["checked in", "no showed", "canceled", "pending", "expired"],
        message: `Invalid status: Allowed statuses: ["checked in", "no showed", "canceled", "pending", "expired"]`,
      },
      default: "pending",
    },
    guestName: {
      type: String,
      trim: true,
    },
    guestEmail: {
      type: String,
    },
    guestPhoneNumber: {
      type: String,
      unique: true,
    },
    countryOfResidence: {
      type: String,
      trim: true,
    },
    specialRequest: {
      type: String,
      trim: true,
    },
    checkInDate: {
      type: Date,
      required: [true, "Check In date is required to create a reservation"],
    },
    checkOutDate: {
      type: Date,
      required: [true, "Check Out date is required to create a reservation"],
    },
    numberOfGuest: {
      type: Number,
      required: [
        true,
        "Number of guest for reservation is required to create a reservation",
      ],
      default: 1,
    },
    guestId: {
      type: mongoose.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await GuestModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Guest must be an existing guest.",
      },
    },
    bookingSource: {
      type: String,
      enum: {
        values: ["online", "onsite", "phone call"],
        message: `Invalid booking source! Allowed values are: ["online", "onsite", "phone call"]`,
      },
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ["Mobile Money", "Orange Money", "Credit Card", "Cash Payment"],
        message: `Invalid payment method! Allowed methods are: ["Mobile Money", "Orange Money", "Credit Card", "Cash Payment"]`,
      },
    },
    createdby: {
      type: mongoose.Types.ObjectId,
      ref: "employees",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await EmployeeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid Employee Id.",
      },
    },
    discount: {
      type: mongoose.Types.ObjectId,
      ref: "discounts",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await DiscountModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid discount Id.",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//TODO: Calculate the number of Rooms property, for a reservation from the rooms that a mapped to that reservation
//TODO: Calculate tooalChargesInCFA with by calculation the prices of the rooms multipleid by the number of nights the guest will stay for

// Validate check-out date > check-in date
reservationSchema.pre("save", function (next) {
  if (this.checkOutDate.getTime() <= this.checkInDate.getTime()) {
    return next(
      new AppError(
        "Check out date must be later than check in date.",
        StatusCodes.BAD_REQUEST
      )
    );
  }
  next();
});

// Generate unique booking reference before saving
reservationSchema.pre<IReservation>("save", async function (next) {
  if (this.bookingReference) {
    return next();
  }

  const MAX_ATTEMPTS = 10;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    const ref = uuidv4().split("-")[0].toUpperCase();
    const exists = await mongoose.models.reservations.exists({
      bookingReference: ref,
    });

    if (!exists) {
      this.bookingReference = ref;
      break;
    }
    attempts++;
  }

  if (!this.bookingReference) {
    return next(
      new AppError(
        "Failed to generate unique booking reference",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  next();
});

reservationSchema.pre("save", function (next) {
  if (this.guestId) {
    next();
  }

  if (!this.guestEmail) {
    return next(
      new AppError(
        "Guest Email is required, to create a reservation",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  if (!validator.isEmail(this.guestEmail)) {
    return next(new AppError("Invalid Email format", StatusCodes.BAD_REQUEST));
  }

  if (!this.guestName) {
    return next(
      new AppError("Guest full name is reuqired.", StatusCodes.BAD_REQUEST)
    );
  }

  if (!this.guestPhoneNumber) {
    return next(
      new AppError("Guest phone number is required", StatusCodes.BAD_REQUEST)
    );
  }

  if (this.guestPhoneNumber.length < 8 || this.guestPhoneNumber.length > 12) {
    return next(
      new AppError(
        "Guest phone number must be 8 characters or more but not mored than 12 characters",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  if (!isValidNumber(this.guestPhoneNumber, "CM")) {
    return next(new AppError("Invalid phone number", StatusCodes.BAD_REQUEST));
  }

  next();
});

// Virtual to calculate number of nights between check-in and check-out
reservationSchema.virtual("numberOfNights").get(function () {
  const msInDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (this.checkOutDate.getTime() - this.checkInDate.getTime()) / msInDay
  );
});

export const ReservationModel = mongoose.model<IReservation>(
  "reservations",
  reservationSchema
);
