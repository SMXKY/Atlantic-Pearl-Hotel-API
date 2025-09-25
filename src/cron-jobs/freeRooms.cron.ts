import { expirePay } from "../external-apis/fapshi.api";
import { InvoiceModel } from "../models/Invoice.model";
import { RoomModel } from "../models/Room.model";
import { ReservationModel } from "../models/Reservation.model";
import cron from "node-cron";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";
import { sendEmail } from "../util/sendEmail.util";
import { promises as fs } from "fs";

async function fillTemplate(
  templatePath: string,
  replacements: Record<string, string>
) {
  let html: string = await fs.readFile(templatePath, "utf-8");
  for (const key in replacements) {
    html = html.replace(new RegExp(`\\[${key}\\]`, "g"), replacements[key]);
  }
  return html;
}

export const freeRoomsCronJob = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    // Find all rooms with expired lock
    const expiredRooms = await RoomModel.find({
      "lock.until": { $lte: now },
    });

    // console.log(expiredRooms);

    for (const room of expiredRooms) {
      try {
        if (room.lock?.reservation) {
          // Get reservation for this room lock
          const invoice = await InvoiceModel.findOne({
            reservation: room.lock.reservation,
          });

          const reservation = await ReservationModel.findById(
            room.lock.reservation
          );

          if (
            invoice &&
            invoice.paymentLinkId &&
            reservation &&
            reservation.status
          ) {
            // Call the payment provider's expire function with paymentLinkId
            await expirePay(invoice.paymentLinkId);

            // Optionally update reservation payment status to expired
            reservation.status = "expired";
            await reservation.save();

            const frontEndUrl =
              process.env.NODE_ENV === "production"
                ? process.env.FRONT_END_URL_PROD
                : process.env.FRONT_END_URL_DEV;

            if (!frontEndUrl) {
              throw new AppError(
                "Front-end base URL is missing from environment variables",
                StatusCodes.INTERNAL_SERVER_ERROR
              );
            }

            const emailHtml = await fillTemplate(
              __dirname + "/../templates/notPayedOnTime.template.html",
              {
                "Guest Name": String(reservation.guestName),
                "Reservation Code": reservation.bookingReference,
                "Reservation Link": `${frontEndUrl}/landing/rooms`,
              }
            );

            await sendEmail(
              String(reservation.guestEmail),
              "Reservation Expired",
              "",
              emailHtml
            );
          }
        }

        // Now free the room and clear lock
        room.status = "free";
        room.lock = undefined;

        await room.save();

        // console.log("Room freed", room);
      } catch (error) {
        console.error(
          `Failed to expire payment or free room ${room._id}`,
          error
        );
      }
    }
  });
};

const freeRoomsOnReservationCompletion = async () => {
  const now = new Date();

  try {
    const reservations = await ReservationModel.find({
      checkInDate: { $lte: now },
    });

    const adminConfiguration = await AdminConfigurationModel.findOne();
    if (!adminConfiguration) {
      throw new AppError(
        "Admin config document not found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const noShowGraceHours =
      adminConfiguration.hotel.policies.hoursPassedBeforeConsideredNoShow || 5;
    const noShowMs = noShowGraceHours * 60 * 60 * 1000;

    for (const reservation of reservations) {
      let shouldSave = false;

      // Auto-checkout
      if (reservation.status === "checked in" && reservation.checkOutDate) {
        if (reservation.checkOutDate.getTime() <= now.getTime()) {
          reservation.status = "checked out";
          shouldSave = true;

          // Free rooms
          for (const item of reservation.items) {
            for (const roomEntry of item.rooms) {
              await RoomModel.findByIdAndUpdate(
                roomEntry.room,
                { status: "free" },
                { runValidators: true }
              );
            }
          }
        }
      }

      // No-show logic
      if (reservation.status === "confirmed" && reservation.checkInDate) {
        const noShowCutoff = new Date(
          reservation.checkInDate.getTime() + noShowMs
        );

        if (now.getTime() > noShowCutoff.getTime()) {
          reservation.status = "no showed";
          shouldSave = true;

          // Free rooms
          for (const item of reservation.items) {
            for (const roomEntry of item.rooms) {
              await RoomModel.findByIdAndUpdate(
                roomEntry.room,
                { status: "free" },
                { runValidators: true }
              );
            }
          }
        }

        const frontEndUrl =
          process.env.NODE_ENV === "production"
            ? process.env.FRONT_END_URL_PROD
            : process.env.FRONT_END_URL_DEV;

        if (!frontEndUrl) {
          throw new AppError(
            "Front-end base URL is missing from environment variables",
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }

        const emailHtml = await fillTemplate(
          __dirname + "/../templates/expiredReservation.template.html",
          {
            "Guest Name": String(reservation.guestName),
            "Reservation Code": reservation.bookingReference,
            "Reservation Link": `${frontEndUrl}/landing/rooms`,
          }
        );

        await sendEmail(
          String(reservation.guestEmail),
          "Reservation Expired – Action Required",
          "",
          emailHtml
        );
      }

      if (shouldSave) {
        await reservation.save();
      }
    }
  } catch (err) {
    console.error("Error in auto-checkout cron:", err);
  }
};

export const freeRoomsOnReserationStatus = () => {
  cron.schedule("* * * * * ", async () => {
    // console.log("Running the Free rooms on reservation cron job.🔯");
    await freeRoomsOnReservationCompletion();
  });
};
