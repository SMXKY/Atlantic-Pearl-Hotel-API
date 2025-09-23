import mongoose, { Schema, Document, Model } from "mongoose";
import { ParkingSpotModel } from "./ParkingSpot.model";
import { GuestModel } from "./Guest.model";
import { ReservationModel } from "./Reservation.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { allPermissions } from "../types/Permissions.type";
import { sendNotification } from "../util/sendNotification.util";
import { NotificationType } from "./Notification.model";
import { getIdsFromPermissions } from "../util/sendNotification.util";
import { io } from "../index";

export interface IParkingReservation extends Document {
  guest: mongoose.Types.ObjectId;
  spot: mongoose.Types.ObjectId;
  reservation: mongoose.Types.ObjectId;
  reservedFrom: Date;
  reservedTo: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: "reserved" | "active" | "completed" | "cancelled" | "no_show";
}

const parkingReservationSchema: Schema<IParkingReservation> = new Schema(
  {
    guest: {
      type: Schema.Types.ObjectId,
      ref: "guests",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await GuestModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Guest ID not found in the database.",
      },
    },
    reservation: {
      type: Schema.Types.ObjectId,
      ref: "reservations",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await ReservationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Reservation ID not found in the database.",
      },
    },
    spot: {
      type: Schema.Types.ObjectId,
      ref: "parking_spots",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await ParkingSpotModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Parking Spot ID not found in the database.",
      },
    },
    reservedFrom: {
      type: Date,
      required: true,
    },
    reservedTo: {
      type: Date,
      required: true,
    },
    checkInTime: Date,
    checkOutTime: Date,
    status: {
      type: String,
      enum: ["reserved", "active", "completed", "cancelled", "no_show"],
      default: "reserved",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

async function populateParkingReservation(doc: any) {
  if (!doc) return null;

  await doc.populate([
    {
      path: "guest",
      populate: { path: "user" }, // populate the user inside guest
    },
    { path: "spot" },
    { path: "reservation" },
  ]);

  return doc;
}

async function notifyParkingReservation(
  doc: any,
  guestMessage: string,
  staffMessage: string
) {
  const orderDoc = await populateParkingReservation(doc);

  if (!orderDoc) return;

  const guest = await GuestModel.findById(orderDoc.guest?._id).populate("user");
  if (!guest?.user) {
    throw new AppError(
      "Guest or associated user not found",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Notify guest
  await sendNotification({
    userIds: [(guest.user as any)._id.toString()],
    title: "Parking Reservation Notification",
    message: `${(guest.user as any).name}${guestMessage}`,
    type: NotificationType.OTHER,
    entityRef: { model: "parking_reservations", id: orderDoc._id },
    redirectUrl: `/parking`,
    isGlobal: false,
  });

  const frontEndUrl =
    process.env.NODE_ENV === "production"
      ? process.env.FRONT_END_URL_PROD
      : process.env.FRONT_END_URL_DEV;

  if (!frontEndUrl) {
    throw new AppError(
      "Front-end base URL is missing from env",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const staffIds = await getIdsFromPermissions(
    allPermissions.parkingReservations.update
  );

  if (staffIds.length > 0) {
    await sendNotification({
      userIds: staffIds,
      title: "Parking Reservation Notification",
      message: `${(guest.user as any).name}${staffMessage}`,
      type: NotificationType.OTHER,
      entityRef: { model: "parking_reservations", id: orderDoc._id },
      redirectUrl: `${frontEndUrl}/parking`,
      isGlobal: false,
    });
  }
}

// Notify on CREATE
parkingReservationSchema.post("save", async function (doc) {
  try {
    await notifyParkingReservation(
      doc,
      " your parking reservation was made successfully.",
      " made a parking reservation."
    );
  } catch (err) {
    console.error("Error emitting parkingReservation:new:", err);
  }
});

// Notify on UPDATE
parkingReservationSchema.post(
  "findOneAndUpdate",
  async function (doc: any, next: any) {
    try {
      if (!doc) return;

      let guestMessage = "";
      let staffMessage = "";

      switch (doc.status) {
        case "active":
          guestMessage = " your parking reservation is now active.";
          staffMessage = " checked in for a parking reservation.";
          break;
        case "completed":
          guestMessage = " your parking reservation is now completed.";
          staffMessage = " completed a parking reservation.";
          break;
        case "cancelled":
          guestMessage = " your parking reservation has been cancelled.";
          staffMessage = " cancelled a parking reservation.";
          break;
        case "no_show":
          guestMessage = " you missed your parking reservation.";
          staffMessage = " did not show up for a parking reservation.";
          break;
      }

      if (guestMessage || staffMessage) {
        await notifyParkingReservation(doc, guestMessage, staffMessage);
      }
    } catch (err) {
      console.error("Error emitting parkingReservation:update:", err);
    }
    next?.();
  }
);

// --------------------
// Live updates via Socket.IO
// --------------------

// After CREATE
parkingReservationSchema.post("save", async function (doc) {
  try {
    const populated = await populateParkingReservation(doc);
    io.emit("parkingReservation:created", populated);
  } catch (err) {
    console.error("Error emitting parkingReservation:created:", err);
  }
});

// After UPDATE
parkingReservationSchema.post("findOneAndUpdate", async function (doc) {
  try {
    if (!doc) return;
    const populated = await populateParkingReservation(doc);
    io.emit("parkingReservation:updated", populated);
  } catch (err) {
    console.error("Error emitting parkingReservation:updated:", err);
  }
});

// After DELETE
parkingReservationSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (!doc) return;
    const populated = await populateParkingReservation(doc);
    io.emit("parkingReservation:deleted", populated);
  } catch (err) {
    console.error("Error emitting parkingReservation:deleted:", err);
  }
});

// --------------------
// Date validation middleware
// --------------------

// For new documents (create)
parkingReservationSchema.pre<IParkingReservation>("save", function (next) {
  if (!this.reservedFrom || !this.reservedTo) {
    return next(
      new AppError("Both reservedFrom and reservedTo are required", 400)
    );
  }

  const from = new Date(this.reservedFrom);
  const to = new Date(this.reservedTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return next(new AppError("Invalid date(s) provided", 400));
  }

  if (to <= from) {
    return next(
      new AppError("reservedTo must be later than reservedFrom", 400)
    );
  }

  next();
});

// For updates (findOneAndUpdate)
parkingReservationSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;

  if (!update) return next();

  const reservedFrom = update.reservedFrom
    ? new Date(update.reservedFrom)
    : undefined;
  const reservedTo = update.reservedTo
    ? new Date(update.reservedTo)
    : undefined;

  // If either date is being updated, validate
  if (reservedFrom || reservedTo) {
    // Fetch existing doc to fill in missing dates
    const existingDoc = (await this.model
      .findOne(this.getQuery())
      .lean()) as any;

    const from = reservedFrom || existingDoc.reservedFrom;
    const to = reservedTo || existingDoc.reservedTo;

    if (!from || !to) {
      return next(
        new AppError("Both reservedFrom and reservedTo are required", 400)
      );
    }

    if (isNaN(new Date(from).getTime()) || isNaN(new Date(to).getTime())) {
      return next(new AppError("Invalid date(s) provided", 400));
    }

    if (new Date(to).getTime() <= new Date(from).getTime()) {
      return next(
        new AppError("reservedTo must be later than reservedFrom", 400)
      );
    }
  }

  next();
});

export const ParkingReservationModel: Model<IParkingReservation> =
  mongoose.model<IParkingReservation>(
    "parking_reservations",
    parkingReservationSchema
  );
