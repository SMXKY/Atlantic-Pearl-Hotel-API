import * as mongoose from "mongoose";
import validator from "validator";
import { isValidNumber } from "libphonenumber-js";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { GuestModel, IGuest } from "./Guest.model";
import { EmployeeModel } from "./Employee.model";
import { DiscountModel } from "./Discount.model";
import { RateModel } from "./Rate.model";
import { RoomTypeModel } from "./RoomType.model";
import { RoomModel } from "./Room.model";
import { TaxModel } from "./Tax.model";
import { AdminConfigurationModel } from "./AdminConfiguration.model";
import { UserModel } from "./User.model";
const { v4: uuidv4 } = require("uuid");

interface IRoomEntry {
  room: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
}

interface IReservationItem {
  roomType: mongoose.Types.ObjectId;
  rate: mongoose.Types.ObjectId;
  rooms: IRoomEntry[];
  quantity?: number;
}

interface PriceAndTax {
  subTotal: number;
  VAT: number;
  touristTax: number;
  totalTaxes: number;
  totalBill: number;
}

export interface IReservation extends mongoose.Document {
  bookingReference: string;
  _id: mongoose.Types.ObjectId;
  status:
    | "checked in"
    | "no showed"
    | "canceled"
    | "pending"
    | "expired"
    | "confirmed"
    | "checked out";
  guestName?: string;
  guestEmail?: string;
  guestPhoneNumber?: string;
  countryOfResidence?: string;
  specialRequest?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  numberOfGuest: number;
  guestNIC?: string;
  guest?: mongoose.Types.ObjectId | IGuest;
  bookingSource?: "online" | "onsite" | "phone call";
  paymentMethod?:
    | "Mobile Money"
    | "Orange Money"
    | "Credit Card"
    | "Cash Payment";
  createdby?: mongoose.Types.ObjectId;
  createdAt: Date;
  discount?: string;
  items: IReservationItem[];
  rooms: mongoose.Types.ObjectId[];
  depositInCFA: number;
  calculateTotalPriceAndTax(): Promise<PriceAndTax>;
  mutateForCalendar(): Promise<any>[];
}

const reservationSchema = new mongoose.Schema<IReservation>(
  {
    bookingReference: {
      type: String,
      required: [true, "Booking reference is required to create reservation"],
      unique: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: [
        "checked in",
        "no showed",
        "canceled",
        "pending",
        "expired",
        "confirmed",
        "checked out",
      ],
      default: "pending",
    },
    guestName: { type: String, trim: true },
    guestEmail: { type: String },
    guestPhoneNumber: { type: String },
    countryOfResidence: { type: String, trim: true },
    specialRequest: { type: String, trim: true },
    checkInDate: {
      type: Date,
      required: true,
      immutable: true,
      validate: {
        validator: function (value: Date) {
          // Must be in the future (compared to now)
          return value > new Date();
        },
        message: "Check-in date must be in the future.",
      },
    },
    checkOutDate: {
      type: Date,
      required: true,
      immutable: true,
      validate: {
        validator: function (value: Date) {
          if (!this.checkInDate) return false; // If checkInDate is not set, this is invalid

          // Must be at least one full day after check-in
          const oneDayLater = new Date(this.checkInDate);
          oneDayLater.setDate(oneDayLater.getDate() + 1);

          return value >= oneDayLater;
        },
        message: "Check-out date must be at least one day after check-in date.",
      },
    },
    numberOfGuest: { type: Number, default: 1, required: true, min: 1 },
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
      immutable: true,
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
          rooms: [
            {
              room: {
                type: mongoose.Types.ObjectId,
                ref: "rooms",
                required: [true, "Room is required in reservation entry"],
                validate: {
                  validator: async function (id: mongoose.Types.ObjectId) {
                    return (await RoomModel.exists({ _id: id })) !== null;
                  },
                  message: "Invalid room Id in reservation.",
                },
              },
              checkIn: { type: Date, required: true },
              checkOut: { type: Date, required: true },
            },
          ],
        },
        { _id: false }
      ),
    ],
    depositInCFA: {
      type: Number,
      required: [true, "Reservation deposit amount is required."],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reservationSchema.pre("validate", async function (next) {
  if (this.bookingReference) return next();

  const MAX_ATTEMPTS = 10;
  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const ref = `RES-${uuidv4().split("-")[0].toUpperCase()}`;

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
      "Failed to generate unique invoice number.",
      StatusCodes.INTERNAL_SERVER_ERROR
    )
  );
});

// Date validations and pre-saves unchanged...

// Virtual: numberOfNights (top-level)
reservationSchema.virtual("numberOfNights").get(function (this: IReservation) {
  const msInDay = 1000 * 60 * 60 * 24;
  if (!this.checkInDate || !this.checkOutDate) return 0;
  return Math.round(
    (this.checkOutDate.getTime() - this.checkInDate.getTime()) / msInDay
  );
});

// Virtual: total nights from nested room entries
reservationSchema
  .virtual("totalNightsFromItems")
  .get(function (this: IReservation) {
    const msInDay = 1000 * 60 * 60 * 24;
    const items = this.items as IReservationItem[];

    return items.reduce((acc, item) => {
      item.rooms.forEach((entry) => {
        if (entry.checkIn && entry.checkOut) {
          const nights = Math.round(
            (entry.checkOut.getTime() - entry.checkIn.getTime()) / msInDay
          );
          acc += nights;
        }
      });
      return acc;
    }, 0);
  });

/* Calculate the price, tax, and price + tax */
reservationSchema.methods.calculateTotalPriceAndTax = async function (
  this: IReservation
) {
  const priceAndTax: PriceAndTax = {
    subTotal: 0,
    VAT: 0,
    touristTax: 0,
    totalTaxes: 0,
    totalBill: 0,
  };
  const VAT = await TaxModel.findOne({ code: "value.added.tax" });
  const touristTax = await TaxModel.findOne({ code: "tourist.tax" });
  if (!VAT || !touristTax || !VAT.percentage || !touristTax.amount) {
    throw new AppError(
      "VAT or Tourist tax missing or invalid in the database",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
  const msInDay = 1000 * 60 * 60 * 24;
  for (const item of this.items as IReservationItem[]) {
    const rate = await RateModel.findById(item.rate);
    if (!rate?.totalPriceInCFA) {
      throw new AppError(
        "Missing rate price in database",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    for (const entry of item.rooms) {
      const nights = Math.round(
        (entry.checkOut.getTime() - entry.checkIn.getTime()) / msInDay
      );
      const totalItemPrice = rate.totalPriceInCFA * nights;
      const totalTouristTax = touristTax.amount * nights;
      priceAndTax.subTotal += totalItemPrice;
      priceAndTax.touristTax += totalTouristTax;
    }
  }
  priceAndTax.VAT = priceAndTax.subTotal * (VAT.percentage / 100);
  priceAndTax.totalTaxes = priceAndTax.VAT + priceAndTax.touristTax;
  priceAndTax.totalBill = priceAndTax.subTotal + priceAndTax.totalTaxes;
  return priceAndTax;
};

reservationSchema.pre("save", async function (next) {
  // if (this.bookingSource !== "online") return next();

  const adminConfiguration = await AdminConfigurationModel.findOne();

  if (!adminConfiguration) {
    return next(
      new AppError(
        "Error fetching admin configuration",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  const priceAndTax = await this.calculateTotalPriceAndTax();

  const minDeposit =
    priceAndTax.totalBill *
    (adminConfiguration.reservations.minimumDepositPercentage.value / 100);

  const formattedMinDeposit = new Intl.NumberFormat("en-US").format(minDeposit);

  if (this.depositInCFA < minDeposit) {
    return next(
      new AppError(
        `Deposit is less than allowed, the minimum deposit for this reservation is XAF ${formattedMinDeposit}`,
        StatusCodes.BAD_REQUEST
      )
    );
  }

  next();
});

reservationSchema.post("save", async function (this: IReservation) {
  if (this.bookingSource !== "online") return;
  if (this.status !== "pending") return;

  const adminConfig = await AdminConfigurationModel.findOne();

  if (!adminConfig || !adminConfig.reservations?.expireAfter.value) {
    throw new AppError(
      "Admin configuration or lock expiry time is missing",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const LOCK_DURATION_MINUTES = Number(
    adminConfig.reservations.expireAfter.value
  );
  const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  const savePromises = [];

  for (const item of this.items) {
    for (const roomEntry of item.rooms) {
      const RoomObj = await RoomModel.findById(roomEntry.room);

      if (!RoomObj) {
        throw new AppError(
          `No room found with ID ${roomEntry.room}`,
          StatusCodes.BAD_REQUEST
        );
      }

      RoomObj.status = "unavailable";
      RoomObj.lock = {
        until: lockUntil,
        reservation: this._id,
      };

      savePromises.push(RoomObj.save());
    }
  }

  await Promise.all(savePromises);
});

reservationSchema.methods.mutateForCalendar = async function () {
  const reservation = this.toObject() as IReservation;

  if (!reservation.guestName) {
    const guest = await GuestModel.findById(reservation.guest);
    const user = await UserModel.findById(guest?.user);
    reservation.guestName = user?.name;
  }

  const unwindedItems = [];

  for (const item of reservation.items) {
    const rate = await RateModel.findById(item.rate);

    for (const roomItem of item.rooms) {
      const { items, ...mutant } = reservation;

      const newItem = mutant as any;

      const roomObj = await RoomModel.findById(roomItem.room);

      newItem.roomName = roomObj?.number;
      newItem.startDate = roomItem.checkIn;
      newItem.endDate = roomItem.checkOut;
      newItem.meal = rate?.mealPlan;
      newItem.rate = rate?.totalPriceInCFA;
      newItem.image = roomObj?.imageUrl;

      switch (newItem.meal) {
        case "RO":
          newItem.meal = "None";
          break;
        case "B&B":
          newItem.meal = "Breakfast";
          break;
        case "HB":
          newItem.meal = "Breakfast and Dinner";
          break;
        case "FB":
          newItem.meal = "Breakfast, Lunch, and Dinner";
          break;
        case "AI":
          newItem.meal = "Breakfast, Lunch, Dinner, and Drinks";
          break;
      }

      unwindedItems.push(newItem);
    }
  }

  return unwindedItems;
};

export const ReservationModel = mongoose.model<IReservation>(
  "reservations",
  reservationSchema
);
