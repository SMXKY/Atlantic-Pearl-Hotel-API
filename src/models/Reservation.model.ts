import * as mongoose from "mongoose";
import validator from "validator";
import { isValidNumber } from "libphonenumber-js";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { GuestModel } from "./Guest.model";
import { EmployeeModel } from "./Employee.model";
import { DiscountModel } from "./Discount.model";
import { RateModel } from "./Rate.model";
import { RoomTypeModel } from "./RoomType.model";
import { RoomModel } from "./Room.model";
const { v4: uuidv4 } = require("uuid");

interface IReservation extends mongoose.Document {
  bookingReference: string;
}

const reservationSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: [true, "Booking reference is required to create reservation"],
      unique: true,
    },
    status: {
      type: String,
      enum: ["checked in", "no showed", "canceled", "pending", "expired"],
      default: "pending",
    },
    guestName: { type: String, trim: true },
    guestEmail: { type: String },
    guestPhoneNumber: { type: String, unique: true },
    countryOfResidence: { type: String, trim: true },
    specialRequest: { type: String, trim: true },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    numberOfGuest: { type: Number, default: 1, required: true },
    guestNIC: { type: String },

    guest: {
      type: mongoose.Types.ObjectId,
      ref: "guests",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          return (await GuestModel.exists({ _id: id })) !== null;
        },
        message: "Guest must be an existing guest.",
      },
    },

    bookingSource: {
      type: String,
      enum: ["online", "onsite", "phone call"],
    },

    paymentMethod: {
      type: String,
      enum: ["Mobile Money", "Orange Money", "Credit Card", "Cash Payment"],
    },

    createdby: {
      type: mongoose.Types.ObjectId,
      ref: "employees",
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          return (await EmployeeModel.exists({ _id: id })) !== null;
        },
        message: "Invalid Employee Id.",
      },
    },

    discount: {
      type: String,
      validate: {
        validator: async function (code: string) {
          return await DiscountModel.exists({ code });
        },
        message: "Invalid discount code.",
      },
    },

    items: [
      new mongoose.Schema(
        {
          roomType: {
            type: mongoose.Types.ObjectId,
            ref: "roomtypes",
            required: [true, "Room type is required for a reservation item"],
            validate: {
              validator: async function (id: mongoose.Types.ObjectId) {
                return (await RoomTypeModel.exists({ _id: id })) !== null;
              },
              message: "Invalid room type Id for this reservation item.",
            },
          },
          quantity: { type: Number, min: 1, default: 1 },
          checkIn: { type: Date, required: true },
          checkOut: { type: Date, required: true },
          rate: {
            type: mongoose.Types.ObjectId,
            ref: "rates",
            required: [true, "Rate is required for each reservation item"],
            validate: {
              validator: async function (id: mongoose.Types.ObjectId) {
                return (await RateModel.exists({ _id: id })) !== null;
              },
              message: "Invalid rate Id in reservation item.",
            },
          },
        },
        { _id: false }
      ),
    ],
    rooms: [
      {
        type: mongoose.Types.ObjectId,
        ref: "rooms",
        required: [true, "Rooms reserved are required"],
        validate: {
          validator: async function (id: mongoose.Types.ObjectId) {
            return (await RoomModel.exists({ _id: id })) !== null;
          },
          message: "Invalid room Id in reservtion.",
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Check-in/check-out date validation (if provided)
reservationSchema.pre("save", function (next) {
  if (this.checkInDate && this.checkOutDate) {
    if (this.checkOutDate.getTime() <= this.checkInDate.getTime()) {
      return next(
        new AppError(
          "Check out date must be later than check in date.",
          StatusCodes.BAD_REQUEST
        )
      );
    }
  }
  next();
});

// Generate unique booking reference before saving
reservationSchema.pre<IReservation>("save", async function (next) {
  if (this.bookingReference) return next();

  const MAX_ATTEMPTS = 10;
  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const ref = uuidv4().split("-")[0].toUpperCase();
    const exists = await mongoose.models.reservations.exists({
      bookingReference: ref,
    });
    if (!exists) {
      this.bookingReference = ref;
      return next();
    }
  }

  return next(
    new AppError(
      "Failed to generate unique booking reference",
      StatusCodes.INTERNAL_SERVER_ERROR
    )
  );
});

// Validate required guest details when `guest` account not linked
reservationSchema.pre("save", function (next) {
  if (this.guest) return next();

  if (!this.guestEmail || !validator.isEmail(this.guestEmail)) {
    return next(
      new AppError("Valid guest email is required", StatusCodes.BAD_REQUEST)
    );
  }
  if (!this.guestName) {
    return next(
      new AppError("Guest full name is required.", StatusCodes.BAD_REQUEST)
    );
  }
  if (!this.guestPhoneNumber) {
    return next(
      new AppError("Guest phone number is required", StatusCodes.BAD_REQUEST)
    );
  }
  if (this.guestPhoneNumber.length < 8 || this.guestPhoneNumber.length > 12) {
    return next(
      new AppError("Phone number must be 8–12 digits", StatusCodes.BAD_REQUEST)
    );
  }
  if (!isValidNumber(this.guestPhoneNumber, "CM")) {
    return next(new AppError("Invalid phone number", StatusCodes.BAD_REQUEST));
  }
  if (!this.guestNIC) {
    return next(
      new AppError("Guest NIC number required.", StatusCodes.BAD_REQUEST)
    );
  }

  next();
});

// Virtual: Overall nights for the top-level check-in/check-out
reservationSchema.virtual("numberOfNights").get(function () {
  const msInDay = 1000 * 60 * 60 * 24;
  if (!this.checkInDate || !this.checkOutDate) return 0;
  return Math.round(
    (this.checkOutDate.getTime() - this.checkInDate.getTime()) / msInDay
  );
});

// Virtual: Calculate total nights from items
reservationSchema.virtual("totalNightsFromItems").get(function () {
  const msInDay = 1000 * 60 * 60 * 24;
  if (!this.items || !Array.isArray(this.items)) return 0;

  return this.items.reduce((acc, item) => {
    if (!item.checkIn || !item.checkOut) return acc;
    const nights = Math.round(
      (item.checkOut.getTime() - item.checkIn.getTime()) / msInDay
    );
    return acc + nights * (item.quantity || 1);
  }, 0);
});

// Virtual: Total charges in CFA (requires populated rate with price field)
reservationSchema.methods.calculateTotalChargesInCFA =
  async function (): Promise<number> {
    if (!Array.isArray(this.items)) return 0;

    await this.populate("items.rate");

    const msInDay = 1000 * 60 * 60 * 24;

    return this.items.reduce((total: number, item: any) => {
      if (
        !item.rate ||
        !item.rate.totalPriceInCFA || // Adjusted field name
        !item.checkIn ||
        !item.checkOut
      )
        return total;

      const nights = Math.max(
        Math.round(
          (new Date(item.checkOut).getTime() -
            new Date(item.checkIn).getTime()) /
            msInDay
        ),
        1
      );

      const quantity = item.quantity || 1;
      const price = item.rate.totalPriceInCFA;

      return total + nights * quantity * price;
    }, 0);
  };

export const ReservationModel = mongoose.model<IReservation>(
  "reservations",
  reservationSchema
);
