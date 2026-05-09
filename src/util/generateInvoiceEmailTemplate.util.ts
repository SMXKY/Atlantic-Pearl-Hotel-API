import { InvoiceModel } from "../models/Finance/Invoice.model";
import { ReservationModel } from "../models/Reservations/Reservation.model";
import { IUser } from "../models/HR/User.model";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { AdminConfigurationModel } from "../models/Config/AdminConfiguration.model";
import { AppError } from "./AppError.util";
import { StatusCodes } from "http-status-codes";

// ─── DTO shape produced by generateInvoiceEmailTemplateData ──────────────────
// renderInvoiceHTMLFromTemplate consumes this — never a raw Mongoose document.

interface RoomSummaryDTO {
  roomType: string;
  rate: string;
  quantity: number;
  nights: number;
}

interface InvoiceEmailData {
  guest: {
    name: string;
    email: string;
    phone: string;
    country: string;
  };
  invoice: {
    number: string;
    issuedAt: string;
    dueDate: string;
    netAmount: string;
    taxAmount: string;
    total: string;
    status: string;
    paymentLink?: string;
  };
  reservation: {
    reference: string;
    checkIn: string;
    checkOut: string;
    numberOfGuests: number;
    bookingSource?: string;
    paymentMethod?: string;
    roomDetails: RoomSummaryDTO[];
    specialRequest: string;
    initialDeposit: string;
  };
  time: number;
}

// ─── Data builder ─────────────────────────────────────────────────────────────

export async function generateInvoiceEmailTemplateData(
  invoiceId: string
): Promise<InvoiceEmailData> {
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

  // Guest info — prefer populated user, fall back to inline fields
  let guest: InvoiceEmailData["guest"];
  if (reservation.guest?.user) {
    const user = reservation.guest.user as IUser;
    guest = {
      name: (user as any).fullName ?? (user as any).name ?? "Guest",
      email: user.email ?? reservation.guestEmail ?? "",
      phone: (user as any).phoneNumber ?? reservation.guestPhoneNumber ?? "",
      country: reservation.countryOfResidence ?? "Unknown",
    };
  } else {
    guest = {
      name: reservation.guestName ?? "Guest",
      email: reservation.guestEmail ?? "",
      phone: reservation.guestPhoneNumber ?? "",
      country: reservation.countryOfResidence ?? "Unknown",
    };
  }

  // Room summaries — transform populated items into plain DTO rows
  const roomDetails: RoomSummaryDTO[] = (reservation.items ?? []).map(
    (item: any) => {
      const roomType = item.roomType?.name ?? "Room";
      const rate = item.rate?.name ?? "Rate";
      const quantity = item.rooms?.length ?? item.quantity ?? 0;

      // Sum nights across all room entries for this item
      const nights = (item.rooms ?? []).reduce((acc: number, r: any) => {
        if (!r.checkIn || !r.checkOut) return acc;
        return (
          acc +
          Math.round(
            (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) /
              86400000
          )
        );
      }, 0);

      return { roomType, rate, quantity, nights };
    }
  );

  return {
    guest,
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
      roomDetails,
      specialRequest: reservation.specialRequest ?? "None",
      initialDeposit: reservation.depositInCFA?.toLocaleString() + " FCFA",
    },
    time: adminConfig.reservations.expireAfter.value,
  };
}

// ─── HTML renderer ────────────────────────────────────────────────────────────
// Receives the DTO produced above — never a raw Mongoose document.

export function renderInvoiceHTMLFromTemplate(data: InvoiceEmailData): string {
  const templatePath = path.join(
    __dirname,
    "/../templates/invoice.template.html"
  );
  const rawHtml = fs.readFileSync(templatePath, "utf-8");

  const { guest, invoice, reservation, time } = data;

  // ── Guest block ────────────────────────────────────────────────────────────
  const guestInfoHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:0 0 24px; border:1px solid #e8e4dc; border-radius:6px; overflow:hidden;">
      <tr>
        <td style="padding:14px 18px; background:#f7f4ee; border-bottom:1px solid #e8e4dc;">
          <span style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#8a7d5a;">
            Guest Information
          </span>
        </td>
      </tr>
      ${[
        ["Name", guest.name],
        ["Email", guest.email],
        ["Phone", guest.phone],
        ["Country", guest.country],
      ]
        .map(
          ([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fdfcf8"}">
          <td style="padding:10px 18px; font-size:14px; color:#6b6b6b; width:140px; border-right:1px solid #f0ece4;">
            ${label}
          </td>
          <td style="padding:10px 18px; font-size:14px; color:#2c2c2c; font-weight:500;">
            ${value || "—"}
          </td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;

  // ── Reservation block ──────────────────────────────────────────────────────
  const reservationInfoHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:0 0 24px; border:1px solid #e8e4dc; border-radius:6px; overflow:hidden;">
      <tr>
        <td style="padding:14px 18px; background:#f7f4ee; border-bottom:1px solid #e8e4dc;">
          <span style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#8a7d5a;">
            Reservation Details
          </span>
        </td>
      </tr>
      ${[
        ["Reference", reservation.reference],
        ["Check-In", reservation.checkIn],
        ["Check-Out", reservation.checkOut],
        ["Guests", String(reservation.numberOfGuests)],
        ["Booking Source", reservation.bookingSource ?? "—"],
        ["Payment Method", reservation.paymentMethod ?? "—"],
        ["Special Request", reservation.specialRequest],
        ["Initial Deposit", reservation.initialDeposit],
      ]
        .map(
          ([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fdfcf8"}">
          <td style="padding:10px 18px; font-size:14px; color:#6b6b6b; width:160px; border-right:1px solid #f0ece4;">
            ${label}
          </td>
          <td style="padding:10px 18px; font-size:14px; color:#2c2c2c; font-weight:500;">
            ${value || "—"}
          </td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;

  // ── Room summary table ─────────────────────────────────────────────────────
  // Uses data.reservation.roomDetails — the already-transformed DTO array.
  // No .map() on Mongoose documents here.
  const roomRowsHtml = (reservation.roomDetails ?? [])
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 16px; font-size:14px; color:#2c2c2c; border-bottom:1px solid #f0ece4;">
        ${item.roomType}
      </td>
      <td style="padding:12px 16px; font-size:14px; color:#2c2c2c; border-bottom:1px solid #f0ece4;">
        ${item.rate}
      </td>
      <td style="padding:12px 16px; font-size:14px; color:#2c2c2c; text-align:center; border-bottom:1px solid #f0ece4;">
        ${item.quantity}
      </td>
      <td style="padding:12px 16px; font-size:14px; color:#2c2c2c; text-align:center; border-bottom:1px solid #f0ece4;">
        ${item.nights}
      </td>
    </tr>
  `
    )
    .join("");

  const roomSummaryHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:0 0 24px; border:1px solid #e8e4dc; border-radius:6px; overflow:hidden;">
      <tr>
        <td style="padding:14px 18px; background:#f7f4ee; border-bottom:1px solid #e8e4dc;">
          <span style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#8a7d5a;">
            Room Summary
          </span>
        </td>
      </tr>
      <tr style="background:#fdfcf8;">
        <th style="padding:10px 16px; font-size:12px; font-weight:700; color:#8a7d5a; text-align:left; text-transform:uppercase; letter-spacing:0.8px; border-bottom:1px solid #e8e4dc;">Room Type</th>
        <th style="padding:10px 16px; font-size:12px; font-weight:700; color:#8a7d5a; text-align:left; text-transform:uppercase; letter-spacing:0.8px; border-bottom:1px solid #e8e4dc;">Rate</th>
        <th style="padding:10px 16px; font-size:12px; font-weight:700; color:#8a7d5a; text-align:center; text-transform:uppercase; letter-spacing:0.8px; border-bottom:1px solid #e8e4dc;">Qty</th>
        <th style="padding:10px 16px; font-size:12px; font-weight:700; color:#8a7d5a; text-align:center; text-transform:uppercase; letter-spacing:0.8px; border-bottom:1px solid #e8e4dc;">Nights</th>
      </tr>
      ${
        roomRowsHtml ||
        `
        <tr>
          <td colspan="4" style="padding:16px; text-align:center; color:#aaa; font-size:14px;">No room details available</td>
        </tr>
      `
      }
    </table>
  `;

  // ── Invoice summary ────────────────────────────────────────────────────────
  const invoiceSummaryHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:0 0 24px; border:1px solid #e8e4dc; border-radius:6px; overflow:hidden;">
      <tr>
        <td style="padding:14px 18px; background:#f7f4ee; border-bottom:1px solid #e8e4dc;">
          <span style="font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#8a7d5a;">
            Invoice Summary
          </span>
        </td>
      </tr>
      ${[
        ["Invoice Number", invoice.number, false],
        ["Issued At", invoice.issuedAt, false],
        ["Due Date", invoice.dueDate, false],
        ["Net Amount", invoice.netAmount, false],
        ["Tax", invoice.taxAmount, false],
        ["Initial Deposit", reservation.initialDeposit, false],
        ["Status", invoice.status, false],
      ]
        .map(
          ([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fdfcf8"}">
          <td style="padding:10px 18px; font-size:14px; color:#6b6b6b; width:160px; border-right:1px solid #f0ece4;">
            ${label}
          </td>
          <td style="padding:10px 18px; font-size:14px; color:#2c2c2c; font-weight:500;">
            ${value || "—"}
          </td>
        </tr>
      `
        )
        .join("")}
      <!-- Total row — highlighted -->
      <tr style="background:#0a2540;">
        <td style="padding:14px 18px; font-size:14px; color:#d4af37; font-weight:700; border-right:1px solid #163660;">
          Total
        </td>
        <td style="padding:14px 18px; font-size:16px; color:#d4af37; font-weight:700;">
          ${invoice.total}
        </td>
      </tr>
    </table>
  `;

  // ── Payment button ─────────────────────────────────────────────────────────
  const paymentButtonHtml = invoice.paymentLink
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"
        style="margin:28px auto;">
        <tr>
          <td align="center" style="border-radius:6px; background:#d4af37;">
            <a href="${invoice.paymentLink}" target="_blank"
              style="display:inline-block; text-decoration:none; background-color:#d4af37;
                     color:#0a2540; padding:16px 36px; font-size:15px; font-weight:700;
                     border-radius:6px; letter-spacing:0.5px;">
              Pay Now — ${invoice.total}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  // ── Inject into template ───────────────────────────────────────────────────
  return rawHtml
    .replace(/{{invoiceNumber}}/g, invoice.number)
    .replace(/{{guestName}}/g, guest.name)
    .replace(/{{expirationTime}}/g, String(time))
    .replace(/{{guestInfo}}/g, guestInfoHtml)
    .replace(/{{reservationInfo}}/g, reservationInfoHtml)
    .replace(/{{roomSummary}}/g, roomSummaryHtml)
    .replace(/{{invoiceSummary}}/g, invoiceSummaryHtml)
    .replace(/{{paymentButton}}/g, paymentButtonHtml);
}
