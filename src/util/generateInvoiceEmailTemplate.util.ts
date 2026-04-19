import { IInvoice, InvoiceModel } from "../models/Finance/Invoice.model";
import {
  IReservation,
  IReservationItem,
  ReservationModel,
} from "../models/Reservations/Reservation.model";
import { RoomTypeModel } from "../models/Properties/RoomType.model";
import { RateModel } from "../models/Reservations/Rate.model";
import { IUser } from "../models/HR/User.model";
import { format } from "date-fns";

export async function generateInvoiceEmailTemplateData(invoiceId: string) {
  const adminConfig = (await AdminConfigurationModel.find())[0];

  if (!adminConfig || !adminConfig.reservations.expireAfter.value) {
    throw new AppError(
      "Admin configuration not found",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const invoice = await InvoiceModel.findById(invoiceId)
    .populate({
      path: "reservation",
      populate: [
        {
          path: "guest",
          populate: {
            path: "user",
            model: "users",
            select: "fullName email phoneNumber countryOfResidence",
          },
        },
        { path: "items.roomType", model: "roomtypes" },
        { path: "items.rate", model: "rates" },
        { path: "items.rooms.room", model: "rooms" },
      ],
    })
    .populate("lineItems.roomType")
    .populate("lineItems.rate")
    .lean();

  if (!invoice || !invoice.reservation) {
    throw new Error("Invoice or Reservation not found.");
  }

  const reservation: any = invoice.reservation;

  const checkInDate = format(new Date(reservation.checkInDate), "dd MMM yyyy");
  const checkOutDate = format(
    new Date(reservation.checkOutDate),
    "dd MMM yyyy"
  );

  // Properly extract guest info from populated user
  let guestInfo;

  if (reservation.guest?.user) {
    const user = reservation.guest.user as IUser;
    guestInfo = {
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
      country: reservation.countryOfResidence || "unknown",
    };
  } else {
    guestInfo = {
      name: reservation.guestName,
      email: reservation.guestEmail,
      phone: reservation.guestPhoneNumber,
      country: reservation.countryOfResidence || "unknown",
    };
  }

  const roomSummaries = reservation.items.map((item: any) => {
    const roomType = item.roomType?.name || "Room Type";
    const rate = item.rate?.name || "Rate";
    const quantity = item.rooms.length;
    const nights = item.rooms.reduce((acc: number, r: any) => {
      const nights = Math.round(
        (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return acc + nights;
    }, 0);

    return {
      roomType,
      rate,
      quantity,
      nights,
    };
  });

  return {
    guest: guestInfo,
    invoice: {
      number: invoice.invoiceNumber,
      issuedAt: format(new Date(invoice.issuedAt), "dd MMM yyyy"),
      dueDate: format(new Date(invoice.dueDate), "dd MMM yyyy"),
      netAmount: invoice.netAmount.toLocaleString() + " FCFA",
      taxAmount: invoice.taxAmount.toLocaleString() + " FCFA",
      total: invoice.grandTotal.toLocaleString() + " FCFA",
      status: invoice.paymentStatus,
      paymentLink: invoice.paymentLink,
    },
    reservation: {
      reference: reservation.bookingReference,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numberOfGuests: reservation.numberOfGuest,
      bookingSource: reservation.bookingSource,
      paymentMethod: reservation.paymentMethod,
      roomDetails: roomSummaries,
      specialRequest: reservation.specialRequest || "None",
      initialDeposit: reservation.depositInCFA.toLocaleString() + " FCFA",
    },
    time: adminConfig.reservations.expireAfter.value,
  };
}

import fs from "fs";
import path from "path";
import { AdminConfigurationModel } from "../models/Config/AdminConfiguration.model";
import { AppError } from "./AppError.util";
import { StatusCodes } from "http-status-codes";
import { IGuest } from "models/HR/Guest.model";

export function renderInvoiceHTMLFromTemplate(data: any): string {
  const templatePath = path.join(
    __dirname,
    "/../templates/invoice.template.html"
  );
  const rawHtml = fs.readFileSync(templatePath, "utf-8");

  const {
    guest,
    invoice,
    reservation,
    time = new Date(),
  } = data as {
    guest: IGuest;
    invoice: IInvoice;
    reservation: IReservation;
    time: any;
  };

  const guestInfo = `
    <ul>
      <li><strong>Name:</strong> ${reservation?.guestName}</li>
      <li><strong>Email:</strong> ${reservation?.guestEmail}</li>
      <li><strong>Phone:</strong> ${reservation?.guestPhoneNumber}</li>
    </ul>
  `;

  const reservationInfo = `
    <ul>
      <li><strong>Reference:</strong> ${reservation.bookingReference}</li>
      <li><strong>Check-In:</strong> ${reservation.checkInDate}</li>
      <li><strong>Check-Out:</strong> ${reservation.checkOutDate}</li>
      <li><strong>Guests:</strong> ${reservation.numberOfGuest}</li>
      <li><strong>Booking Source:</strong> ${reservation.bookingSource}</li>
      <li><strong>Payment Method:</strong> ${reservation.paymentMethod}</li>
      <li><strong>Special Request:</strong> ${reservation.specialRequest}</li>
    </ul>
  `;

  const roomDetailsHtml = reservation.items
    .map((item: IReservationItem) => {
      const roomTypeName =
        typeof item.roomType === "object" && (item.roomType as any)?.name
          ? (item.roomType as any).name
          : String(item.roomType);

      const rateName =
        typeof item.rate === "object" && (item.rate as any)?.name
          ? (item.rate as any).name
          : String(item.rate);

      const quantity = item.rooms?.length ?? item.quantity ?? 0;

      // If you want to calculate nights for each room individually
      const nights = item.rooms?.[0]
        ? Math.ceil(
            (item.rooms[0].checkOut.getTime() -
              item.rooms[0].checkIn.getTime()) /
              (1000 * 60 * 60 * 24) || 0
          )
        : 0;

      return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;">${roomTypeName}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${rateName}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${quantity}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${nights}</td>
      </tr>
    `;
    })
    .join("");

  const roomSummary = `
    <h3>Room Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="padding: 8px; border: 1px solid #ccc; background-color: #f5f5f5;">Room Type</th>
          <th style="padding: 8px; border: 1px solid #ccc; background-color: #f5f5f5;">Rate</th>
          <th style="padding: 8px; border: 1px solid #ccc; background-color: #f5f5f5;">Quantity</th>
          <th style="padding: 8px; border: 1px solid #ccc; background-color: #f5f5f5;">Nights</th>
        </tr>
      </thead>
      <tbody>
        ${roomDetailsHtml}
      </tbody>
    </table>
  `;

  const invoiceSummary = `
    <h3>Invoice Summary</h3>
    <ul>
      <li><strong>Issued At:</strong> ${invoice?.issuedAt}</li>
      <li><strong>Due Date:</strong> ${invoice?.dueDate}</li>
      <li><strong>Net Amount:</strong> ${invoice.netAmount}</li>
      <li><strong>Tax:</strong> ${invoice.taxAmount}</li>
      <li><strong>Initial Deposit:</strong> ${reservation.depositInCFA}</li>
      <li><strong>Total:</strong> <strong style="color: #28a745;">${invoice?.grandTotal.toLocaleString()}</strong></li>
      <li><strong>Status:</strong> ${invoice.paymentStatus}</li>
    </ul>
  `;

  const paymentButton = invoice.paymentLink
    ? ` <a
                        href="${invoice.paymentLink}"
                        target="_blank"
                        style="
                          display: inline-block;
                          text-decoration: none;
                          background-color: #0a2540;
                          color: #ffffff;
                          padding: 14px 28px;
                          font-size: 15px;
                          font-weight: 500;
                          border-radius: 6px;
                        "
                        >Pay Now</a
                      >`
    : "";

  let finalHtml = rawHtml
    .replace(/{{invoiceNumber}}/g, invoice.invoiceNumber)
    .replace(/{{guestName}}/g, String(reservation.guestName))
    .replace(/{{guestInfo}}/g, guestInfo)
    .replace(/{{reservationInfo}}/g, reservationInfo)
    .replace(/{{roomSummary}}/g, roomSummary)
    .replace(/{{invoiceSummary}}/g, invoiceSummary)
    .replace(/{{paymentButton}}/g, paymentButton)
    .replace(/{{expirationTime}}/g, `${time}`);

  return finalHtml;
}
