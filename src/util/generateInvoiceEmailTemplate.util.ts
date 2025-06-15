import { InvoiceModel } from "../models/Invoice.model";
import { ReservationModel } from "../models/Reservation.model";
import { RoomTypeModel } from "../models/RoomType.model";
import { RateModel } from "../models/Rate.model";
import { IUser } from "../models/User.model";
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
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";
import { AppError } from "./AppError.util";
import { StatusCodes } from "http-status-codes";

export function renderInvoiceHTMLFromTemplate(data: any): string {
  const templatePath = path.join(
    __dirname,
    "/../templates/invoice.template.html"
  );
  const rawHtml = fs.readFileSync(templatePath, "utf-8");

  const { guest, invoice, reservation, time } = data;

  const guestInfo = `
    <ul>
      <li><strong>Name:</strong> ${guest.name}</li>
      <li><strong>Email:</strong> ${guest.email}</li>
      <li><strong>Phone:</strong> ${guest.phone}</li>
      <li><strong>Country:</strong> ${guest.country}</li>
    </ul>
  `;

  const reservationInfo = `
    <ul>
      <li><strong>Reference:</strong> ${reservation.reference}</li>
      <li><strong>Check-In:</strong> ${reservation.checkIn}</li>
      <li><strong>Check-Out:</strong> ${reservation.checkOut}</li>
      <li><strong>Guests:</strong> ${reservation.numberOfGuests}</li>
      <li><strong>Booking Source:</strong> ${reservation.bookingSource}</li>
      <li><strong>Payment Method:</strong> ${reservation.paymentMethod}</li>
      <li><strong>Special Request:</strong> ${reservation.specialRequest}</li>
    </ul>
  `;

  const roomDetailsHtml = reservation.roomDetails
    .map(
      (room: any) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc;">${room.roomType}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${room.rate}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${room.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${room.nights}</td>
        </tr>
      `
    )
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
      <li><strong>Issued At:</strong> ${invoice.issuedAt}</li>
      <li><strong>Due Date:</strong> ${invoice.dueDate}</li>
      <li><strong>Net Amount:</strong> ${invoice.netAmount}</li>
      <li><strong>Tax:</strong> ${invoice.taxAmount}</li>
      <li><strong>Initial Deposit:</strong> ${reservation.initialDeposit}</li>
      <li><strong>Total:</strong> <strong style="color: #28a745;">${invoice.total}</strong></li>
      <li><strong>Status:</strong> ${invoice.status}</li>
    </ul>
  `;

  const paymentButton = invoice.paymentLink
    ? `<p><a href="${invoice.paymentLink}" style="display: inline-block; background-color: #28a745; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a></p>`
    : "";

  const finalHtml = rawHtml
    .replace(/{{invoiceNumber}}/g, invoice.number)
    .replace(/{{guestName}}/g, guest.name)
    .replace(/{{guestInfo}}/g, guestInfo)
    .replace(/{{reservationInfo}}/g, reservationInfo)
    .replace(/{{roomSummary}}/g, roomSummary)
    .replace(/{{invoiceSummary}}/g, invoiceSummary)
    .replace(/{{paymentButton}}/g, paymentButton)
    .replace(/{{expirationTime}}/g, `${time}`);

  return finalHtml;
}
