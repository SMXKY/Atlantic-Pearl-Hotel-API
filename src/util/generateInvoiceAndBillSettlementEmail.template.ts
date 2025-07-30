// generateInvoiceHtml.ts
import dayjs from "dayjs";
import { IInvoiceLine } from "../models/Invoice.model";
import { IBillItem } from "models/BillItem.model";

export interface Room {
  room: string;
  checkIn: string | Date; // accept Date or string
  checkOut: string | Date;
}

export interface LineItem {
  roomType: string;
  rate: string; // your DB shows this as a string ID
  rooms: Room[];
}

export interface InvoiceData {
  ref: string;
  lineItems: IInvoiceLine[];
  total: number; // e.g. 2_415_000
  amountPaid: number; // e.g. 484_155
  amountDue: number; // e.g. 1_930_845
}

export interface BillData {
  ref: string | undefined;
  items: IBillItem[];
  total: number; // e.g. 38_400
}

export interface EmailData {
  guestName?: string;
  issueDate: string; // ISO date or already formatted
  invoice: InvoiceData;
  bill?: BillData;
  paymentLink: string;
  total: number; // use total from email data
}

// Helper formatters
const formatDate = (iso: string | Date) => dayjs(iso).format("DD MMM YYYY");
const formatCurrency = (amt: number) =>
  new Intl.NumberFormat("en-CM", { style: "currency", currency: "XAF" }).format(
    amt
  );

export function renderInvoiceEmail(data: EmailData): string {
  const { guestName, issueDate, invoice, bill, paymentLink } = data;

  // Optional detail rows for rooms
  const roomDetailHtml = invoice.lineItems
    .map((item) =>
      item.rooms
        .map(
          (r) => `
      <tr>
        <td>${invoice.ref}</td>
        <td>${r.room}<br/><small>Type ID: ${item.roomType}</small></td>
        <td>${formatDate(r.checkIn)} &mdash; ${formatDate(r.checkOut)}</td>
        <td style="text-align:right">See summary below</td>
      </tr>
    `
        )
        .join("")
    )
    .join("");

  // Bill items rows
  const billItemsHtml =
    bill?.items
      .map(
        (bi) => `
      <tr>
        <td>${bill.ref}</td>
        <td>${bi.description}</td>
        <td>${formatDate(bi.createdAt)}</td>
        <td style="text-align:right">${formatCurrency(bi.amount)}</td>
      </tr>
    `
      )
      .join("") ?? "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice | ATLANTIC PEARL HOTEL and RESORT</title>
  <style>
    body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;color:#333}
    .container{max-width:600px;margin:auto;padding:20px}
    .header{text-align:center;border-bottom:2px solid #e6e6e6;padding-bottom:20px}
    .header h1{margin:0;font-size:24px;color:rgb(30,58,138);text-transform:uppercase}
    .header .issue-date{margin-top:5px;font-size:14px;color:#777}
    .greeting{margin:30px 0 10px;font-size:16px}
    .section-title{font-size:18px;margin:20px 0 10px;color:rgb(30,58,138);border-bottom:1px solid #e6e6e6;padding-bottom:5px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th,td{padding:10px;border:1px solid #e6e6e6;font-size:14px;text-align:left}
    th{background:rgb(30,58,138);color:#fff;text-transform:uppercase;font-size:13px}
    .total{text-align:right;font-size:18px;margin:20px 0}
    .btn-pay{display:block;width:200px;margin: auto;text-align:center;background:rgb(245,158,11);color:#fff;text-decoration:none;padding:12px 0;border-radius:4px;font-weight:bold;font-size:16px}
    .footer{margin-top:40px;text-align:center;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ATLANTIC PEARL HOTEL and RESORT</h1>
      <div class="issue-date">Issue Date: ${formatDate(issueDate)}</div>
    </div>

    <p class="greeting">
      Hello ${guestName},<br/>
      Thank you for staying with us. Below is your invoice summary:
    </p>

    <div class="section-title">Invoice Summary</div>
    <table>
      <tr><th>Invoice Ref</th><td>${invoice.ref}</td></tr>
      <tr><th>Total</th><td>${formatCurrency(invoice.total)}</td></tr>
      <tr><th>Amount Paid</th><td>${formatCurrency(
        invoice.amountPaid
      )}</td></tr>
      <tr><th>Amount Due</th><td>${formatCurrency(invoice.amountDue)}</td></tr>
    </table>

    ${
      roomDetailHtml
        ? `
      <div class="section-title">Room Detail</div>
      <table>
        <tr>
          <th>Invoice Ref</th>
          <th>Room # / TypeID</th>
          <th>Check-In → Check-Out</th>
          <th>Note</th>
        </tr>
        ${roomDetailHtml}
      </table>
    `
        : ""
    }

    ${
      bill
        ? `
      <div class="section-title">Additional Charges</div>
      <table>
        <tr>
          <th>Bill Ref</th>
          <th>Description</th>
          <th>Date</th>
          <th>Amount</th>
        </tr>
        ${billItemsHtml}
        <tr>
          <th colspan="3">Bill Total</th>
          <th style="text-align:right">${formatCurrency(bill.total)}</th>
        </tr>
      </table>
    `
        : ""
    }

    <div class="total">
      <strong>Grand Total Due: ${formatCurrency(data.total)}</strong>
    </div>

    <a href="${paymentLink}" class="btn-pay">Pay Now</a>

    <div class="footer">
      If you have any questions, reply to this email or call +237 123 456 789.<br/>
      &copy; 2025 Atlantic Pearl Hotel and Resort. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
}
