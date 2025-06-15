import { expirePay } from "../external-apis/fapshi.api";
import { InvoiceModel } from "../models/Invoice.model";
import { RoomModel } from "../models/Room.model";
import { ReservationModel } from "../models/Reservation.model";
import cron from "node-cron";

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
