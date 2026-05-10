import * as mongoose from "mongoose";
import validator from "validator";
import { isValidNumber } from "libphonenumber-js";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { GuestModel, IGuest } from "../HR/Guest.model";
import { EmployeeModel } from "../HR/Employee.model";
import { DiscountModel } from "../Finance/Discount.model";
import { RateModel } from "./Rate.model";
import { RoomTypeModel } from "../Properties/RoomType.model";
import { IRoom, RoomModel } from "../Properties/Room.model";
import { TaxModel } from "../Finance/Tax.model";
import { AdminConfigurationModel } from "../Config/AdminConfiguration.model";
import { UserModel } from "../HR/User.model";
const { v4: uuidv4 } = require("uuid");
import dayjs from "dayjs";
import { ReservationStatusChangeModel } from "./ReservationStatusChange.model";
import { io } from "../../index";
import { computeReservationDashboard } from "../../util/computeReservationDashboard";
import { computeAdminDashboard } from "../../controllers/Content/defaultDashbord.content";
import { allPermissions } from "../../types/Permissions.type";
import { sendNotification } from "../../util/sendNotification.util";
import { getIdsFromPermissions } from "../../util/sendNotification.util";
import { NotificationType } from "../Notifications/Notification.model";
import { StationModel } from "../Properties/Station.model";
import { iptv } from "../../services/iptv.api";

interface IRoomEntry {
  room: mongoose.Types.ObjectId | IRoom;
  checkIn: Date;
  checkOut: Date;
}

export interface IReservationItem {
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
  settlementUrl: string;
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
  hasRoom(roomId: mongoose.Types.ObjectId | string): boolean;
  checkInStation: mongoose.Types.ObjectId;
  checkOutStation: mongoose.Types.ObjectId;
  roomUpdateStation: mongoose.Types.ObjectId;
  preferedLanguage: "ENG" | "THA" | "CHN" | "FR";
  wifi: {
    name: string;
    password: string;
  };
}

const reservationSchema = new mongoose.Schema<IReservation>(
  {
    bookingReference: {
      type: String,
      required: [true, "Booking reference is required to create reservation"],
      unique: true,
      immutable: true,
    },
    checkInStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "stations",
      // required: [true, "Check-in station required."],
      validate: {
        validator: async function (id: mongoose.Schema.Types.ObjectId) {
          return (await StationModel.exists({ _id: id })) !== null;
        },
        message: "Invalid station Id in reservation.",
      },
    },
    checkOutStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "stations",
      validate: {
        validator: async function (id: mongoose.Schema.Types.ObjectId) {
          return (await StationModel.exists({ _id: id })) !== null;
        },
        message: "Invalid station Id in reservation.",
      },
    },
    roomUpdateStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "stations",
      validate: {
        validator: async function (id: mongoose.Schema.Types.ObjectId) {
          return (await StationModel.exists({ _id: id })) !== null;
        },
        message: "Invalid station Id in reservation.",
      },
    },
    preferedLanguage: {
      type: String,
      enum: {
        values: ["ENG", "THA", "CHN", "FR"],
        message: "Not a supported language",
      },
      default: "ENG",
    },
    wifi: {
      name: {
        type: String,
      },
      password: {
        type: String,
      },
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
    },
    checkOutDate: {
      type: Date,
      required: true,
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
    settlementUrl: {
      type: String,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reservationSchema.methods.hasRoom = function (
  roomId: string | mongoose.Types.ObjectId
) {
  const roomIdStr = roomId.toString();

  return this.items.some((item: IReservationItem) =>
    item.rooms.some(
      (roomEntry: IRoomEntry) =>
        (roomEntry.room._id
          ? roomEntry.room._id.toString()
          : roomEntry.room.toString()) === roomIdStr
    )
  );
};

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
    if (!this.items || !Array.isArray(this.items)) return 0;
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
      if (entry.checkOut.getTime() <= entry.checkIn.getTime()) {
        throw new AppError(
          "Item check in date, can not be before or on the same date as the checkout datae",
          StatusCodes.BAD_REQUEST
        );
      }

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

  console.log(priceAndTax);
  return priceAndTax;
};

reservationSchema.pre("save", async function (next) {
  if (this.bookingSource !== "online") return next();

  this.depositInCFA = Number(this.depositInCFA);

  if (!this.depositInCFA) {
    return next(
      new AppError(
        "Deposit in CFA is required to make a reservation",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  if (isNaN(this.depositInCFA)) {
    return next(
      new AppError(
        "deposit in CFAT is not a number!!!",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  console.log(this.depositInCFA);

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

//avoid employee and client email clashes
reservationSchema.pre("save", async function (next) {
  try {
    if (!this.isNew && !this.isModified("guestEmail")) {
      return next();
    }

    const email = this.guestEmail;
    const userExist = await UserModel.findOne({ email });

    if (!userExist) {
      return next(); // no conflict, continue
    }

    const employeeExist = await EmployeeModel.findOne({ user: userExist._id });

    if (employeeExist) {
      return next(
        new AppError(
          "Employee account already exists with this email, please use a different email for this reservation",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    next();
  } catch (err: any) {
    next(err);
  }
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
    const roomType = await RoomTypeModel.findById(item.roomType).populate(
      "rooms"
    );

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
      newItem.roomType = roomType;

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

async function autoPopulateReservation(docOrDocs: any) {
  if (!docOrDocs) return;

  const docs = Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs];

  await ReservationModel.populate(docs, [
    { path: "guest" },
    { path: "createdby" },
    { path: "discount" },
    { path: "items.roomType" },
    { path: "items.rate" },
    { path: "items.rooms.room" },
  ]);
}

reservationSchema.post("find", autoPopulateReservation);
reservationSchema.post("findOne", autoPopulateReservation);
reservationSchema.post("findOneAndReplace", autoPopulateReservation);
reservationSchema.post("findOneAndDelete", autoPopulateReservation);

reservationSchema.pre("save", function (next) {
  if (!this.isNew) return next(); // Only validate for new documents

  const now = new Date();

  if (!this.checkInDate || !this.checkOutDate) {
    throw new AppError(
      "check-in and check-out dates are required",
      StatusCodes.BAD_REQUEST
    );
  }

  if (this.checkInDate <= now) {
    return next(new Error("Check-in date must be in the future."));
  }

  if (this.checkOutDate <= now) {
    return next(new Error("Check-out date must be in the future."));
  }

  if (this.checkOutDate <= this.checkInDate) {
    return next(new Error("Check-out date must be after check-in date."));
  }

  next();
});

async function buildReservationCalendar() {
  const reservations = await ReservationModel.find({
    $or: [
      { status: "confirmed" },
      { status: "checked in" },
      { status: "checked out" },
    ],
  });

  const data: any[] = [];
  for (const mutant of reservations) {
    const unwinded = await mutant.mutateForCalendar();
    data.push(...unwinded);
  }

  return data;
}

reservationSchema.pre("save", async function (next) {
  try {
    if (!this.items || this.items.length === 0) {
      return next(
        new AppError(
          "Reservation must include at least one reservation item.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const roomTypeIds = this.items.map((item) => item.roomType);
    const roomTypes = await RoomTypeModel.find({
      _id: { $in: roomTypeIds },
    });

    if (roomTypes.length !== roomTypeIds.length) {
      return next(
        new AppError(
          "One or more selected room types do not exist.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Calculate max allowed guests
    const maxAllowedGuest = roomTypes.reduce(
      (sum, rt) => sum + (rt.maxNumberOfGuest || 0),
      0
    );

    if (this.numberOfGuest > maxAllowedGuest) {
      return next(
        new AppError(
          `Guest limit exceeded: reservation has ${this.numberOfGuest}, but the selected room types allow a maximum of ${maxAllowedGuest}.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    next();
  } catch (err: any) {
    return next(err);
  }
});

reservationSchema.post("save", async function (doc) {
  try {
    await autoPopulateReservation(doc);
    io.emit("newReservation", doc);
    const dashboard = await computeReservationDashboard();
    io.emit("updateDashboard", dashboard);

    const calendarData = await buildReservationCalendar();
    io.emit("reservationCalendar:update", calendarData);

    const adminDashboard = await computeAdminDashboard();
    io.emit("updateAdminDashboard", adminDashboard);
    io.emit("updateReservation", doc);
  } catch (err) {
    console.error("❌ Error in reservation post-save hook:", err);
  }
});

reservationSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  try {
    io.emit("deleteReservation", { id: doc._id });
    const dashboard = await computeReservationDashboard();
    io.emit("updateDashboard", dashboard);
    const calendarData = await buildReservationCalendar();
    io.emit("reservationCalendar:update", calendarData);
    const adminDashboard = await computeAdminDashboard();
    io.emit("updateAdminDashboard", adminDashboard);
  } catch (err) {
    console.error("❌ Error in reservation post-save hook:", err);
  }
});

async function notifyStaffOnReservationCreate(reservation: IReservation) {
  try {
    // Get staff IDs who have permission to manage reservations
    const staffIds = await getIdsFromPermissions(
      allPermissions.reservations.update // adjust if your permission name differs
    );

    if (!staffIds || staffIds.length === 0) return;

    await sendNotification({
      userIds: staffIds,
      title: "New Reservation Created",
      message: `A new reservation (${reservation.bookingReference}) has been made.`,
      type: NotificationType.RESERVATION,
      entityRef: { model: "reservations", id: reservation._id },
      redirectUrl: `/reservations/${reservation._id}`,
      isGlobal: false,
    });
  } catch (err) {
    console.error("❌ Error sending staff notification:", err);
  }
}

// --------------------------
// POST SAVE HOOK
// --------------------------
reservationSchema.post("save", async function (doc: IReservation) {
  try {
    await notifyStaffOnReservationCreate(doc);
  } catch (err) {
    console.error("❌ Error in post-save hook:", err);
  }
});

async function notifyOnReservationStatusUpdate(reservation: IReservation) {
  try {
    // Only notify if status is checked in or checked out
    if (!["checked in", "checked out"].includes(reservation.status)) return;

    // Fetch guest user
    const guest = await GuestModel.findById(reservation.guest).populate("user");
    if (!guest?.user) {
      console.warn("Guest user not found for reservation:", reservation._id);
      return;
    }

    const guestName = reservation.guestName || (guest.user as any).name;
    const guestId = (guest.user as any)._id.toString();

    // Build messages
    const guestMessage =
      reservation.status === "checked in"
        ? `Hi ${guestName}, you have successfully checked in for your reservation ${reservation.bookingReference}.`
        : `Hi ${guestName}, you have successfully checked out from your reservation ${reservation.bookingReference}.`;

    const staffMessage =
      reservation.status === "checked in"
        ? `${guestName} has checked in for reservation ${reservation.bookingReference}.`
        : `${guestName} has checked out from reservation ${reservation.bookingReference}.`;

    // Notify guest
    await sendNotification({
      userIds: [guestId],
      title: "Reservation Status Update",
      message: guestMessage,
      type: NotificationType.RESERVATION,
      entityRef: { model: "reservations", id: reservation._id },
      redirectUrl: `/reservations/${reservation._id}`,
      isGlobal: false,
    });

    // Notify staff
    const staffIds = await getIdsFromPermissions(
      allPermissions.reservations.readAll
    );
    if (staffIds.length > 0) {
      await sendNotification({
        userIds: staffIds,
        title: "Reservation Status Update",
        message: staffMessage,
        type: NotificationType.RESERVATION,
        entityRef: { model: "reservations", id: reservation._id },
        redirectUrl: `/reservations/${reservation._id}`,
        isGlobal: false,
      });
    }
  } catch (err) {
    console.error("❌ Error sending reservation status notifications:", err);
  }
}

// ─── SINGLE CONSOLIDATED PRE HOOK ─────────────────────────────────────────────
reservationSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;
  const filter = this.getQuery();

  // Store on context for post-hook use
  (this as any)._updateData = update;
  (this as any)._filterData = filter;

  // Fetch current reservation once — shared by all logic below
  const current = await this.model.findOne(filter);

  if (!current) {
    return next(
      new AppError(
        "Cannot find reservation for the update",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  (this as any)._reservationId = current._id;
  (this as any)._previousStatus = current.status;

  const newStatus: string | undefined =
    update?.status ?? update?.$set?.status ?? update?.$setOnInsert?.status;

  // Only run status logic if the status is actually changing
  const statusIsChanging = !!newStatus && newStatus !== current.status;

  // ── Duplicate status change guard ──────────────────────────────────────────
  if (statusIsChanging) {
    const alreadyLogged = await ReservationStatusChangeModel.findOne({
      reservation: current._id,
      statusChange: newStatus,
      previousStatus: current.status,
    });

    if (alreadyLogged) {
      const friendlyStatus: Record<string, string> = {
        "checked in": "already checked in",
        "checked out": "already checked out",
        "no showed": "already marked as no-showed",
        canceled: "already canceled",
        confirmed: "already confirmed",
        expired: "already expired",
        pending: "still pending",
      };

      return next(
        new AppError(
          `This reservation has ${
            friendlyStatus[newStatus] ??
            `already been updated to "${newStatus}"`
          }. You cannot perform this action again.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  }

  // ── Check-in validation ────────────────────────────────────────────────────
  if (statusIsChanging && newStatus === "checked in") {
    if (current.status !== "confirmed") {
      return next(
        new AppError(
          "Reservation cannot be checked in unless it is currently confirmed.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const incomingWifi = update?.wifi ?? update?.$set?.wifi;
    if (!incomingWifi?.name || !incomingWifi?.password) {
      return next(
        new AppError(
          "Wifi credentials must be included to check in a reservation.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const now = dayjs();
    const checkIn = dayjs(current.checkInDate);
    const checkOut = dayjs(current.checkOutDate);

    if (!checkIn.isValid() || !checkOut.isValid()) {
      return next(
        new AppError(
          "Invalid check-in or check-out date on reservation.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    if (now.diff(checkIn, "hour") >= 5) {
      return next(
        new AppError(
          "More than 5 hours have passed since check-in time. Update the check-in date or mark as no-showed.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (now.isBefore(checkIn) || !now.isBefore(checkOut)) {
      return next(
        new AppError(
          "Can only check in on or after the check-in date and before the check-out date.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Mark all rooms as occupied
    for (const item of current.items) {
      for (const roomEntry of item.rooms) {
        await RoomModel.findByIdAndUpdate(
          roomEntry.room,
          { status: "occupied" },
          { runValidators: true }
        );
      }
    }
  }

  // ── Check-out validation ───────────────────────────────────────────────────
  if (statusIsChanging && newStatus === "checked out") {
    if (current.status !== "checked in") {
      return next(
        new AppError(
          "Reservation cannot be checked out unless it is currently checked in.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!current.checkInDate || !current.checkOutDate) {
      return next(
        new AppError(
          "Reservation must have both check-in and check-out dates.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    // Mark all rooms as free
    for (const item of current.items) {
      for (const roomEntry of item.rooms) {
        await RoomModel.findByIdAndUpdate(
          roomEntry.room,
          { status: "free" },
          { runValidators: true }
        );
      }
    }
  }

  // ── Propagate top-level date changes into nested room entries ──────────────
  if (update.checkInDate || update.checkOutDate) {
    for (const item of current.items) {
      for (const roomEntry of item.rooms) {
        if (update.checkInDate) roomEntry.checkIn = update.checkInDate;
        if (update.checkOutDate) roomEntry.checkOut = update.checkOutDate;
      }
    }
    update.items = current.items;
  }

  // ── Date range validation ──────────────────────────────────────────────────
  if (update.checkInDate || update.checkOutDate) {
    const inDate: Date = update.checkInDate ?? current.checkInDate;
    const outDate: Date = update.checkOutDate ?? current.checkOutDate;

    // Only enforce future dates if the reservation hasn't started yet
    if (!["checked in", "checked out"].includes(current.status)) {
      const now = new Date();

      if (inDate <= now) {
        return next(
          new AppError(
            "Check-in date must be in the future.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (outDate <= now) {
        return next(
          new AppError(
            "Check-out date must be in the future.",
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    // Always enforce checkout after checkin regardless of status
    if (outDate <= inDate) {
      return next(
        new AppError(
          "Check-out date must be after check-in date.",
          StatusCodes.BAD_REQUEST
        )
      );
    }
  }

  next();
});

// ─── SINGLE CONSOLIDATED POST HOOK ────────────────────────────────────────────
reservationSchema.post("findOneAndUpdate", async function (doc: IReservation) {
  if (!doc) return;

  const update = (this as any)._updateData;
  const reservationId = (this as any)._reservationId;

  // ── Log the status change (now safe — duplicate was blocked in pre-hook) ───
  const newStatus: string | undefined =
    update?.status ?? update?.$set?.status ?? update?.$setOnInsert?.status;

  if (newStatus) {
    await ReservationStatusChangeModel.create({
      reservation: reservationId,
      statusChange: newStatus,
    });
  }

  // ── Socket.IO updates ──────────────────────────────────────────────────────
  try {
    const updatedReservation = await mongoose
      .model("reservations")
      .findById(doc._id);

    io.emit("updateReservation", updatedReservation);

    const [dashboard, calendarData, adminDashboard] = await Promise.all([
      computeReservationDashboard(),
      buildReservationCalendar(),
      computeAdminDashboard(),
    ]);

    io.emit("updateDashboard", dashboard);
    io.emit("reservationCalendar:update", calendarData);
    io.emit("updateAdminDashboard", adminDashboard);
  } catch (err) {
    console.error("❌ Socket.IO emission error in post-update hook:", err);
  }

  // ── Guest + staff notifications ────────────────────────────────────────────
  try {
    await notifyOnReservationStatusUpdate(doc);
  } catch (err) {
    console.error("❌ Notification error in post-update hook:", err);
  }

  // ── IPTV integration ───────────────────────────────────────────────────────
  if (process.env.IPTV === "true") {
    try {
      if (doc.status === "checked in") await iptv.checkIn(String(doc._id));
      if (doc.status === "checked out") await iptv.checkOut(String(doc._id));
    } catch (err) {
      console.error("❌ IPTV error in post-update hook:", err);
    }
  }
});

export const ReservationModel = mongoose.model<IReservation>(
  "reservations",
  reservationSchema
);
