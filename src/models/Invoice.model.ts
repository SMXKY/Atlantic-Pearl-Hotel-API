import { Schema, model, Types, Document, HydratedDocument } from "mongoose";
import * as validator from "validator";

// Line item interface
interface IInvoiceLine {
  roomType: string;
  mealPlan: string;
  unitPrice: number;
  quantity: number;
  nights: number;
  subTotal: number;
}

// Invoice interface
interface IInvoice extends Document {
  reservation: Types.ObjectId;
  issuedAt: Date;
  lineItems: IInvoiceLine[];
  netAmount: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  paymentLink: string;
  calculateTotals: () => void;
}

// Line schema
const InvoiceLineSchema = new Schema<IInvoiceLine>(
  {
    roomType: { type: String, required: true },
    mealPlan: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    nights: { type: Number, required: true },
    subTotal: { type: Number, required: true },
  },
  { _id: false }
);

// Invoice schema
const InvoiceSchema = new Schema<IInvoice>(
  {
    reservation: {
      type: Schema.Types.ObjectId,
      ref: "reservations",
      required: true,
    },
    issuedAt: { type: Date, default: Date.now },
    lineItems: { type: [InvoiceLineSchema], default: [] },
    netAmount: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    paymentLink: {
      type: String,
      validate: {
        validator: (url: string) => validator.isURL(url),
        message: "Invalid URL format",
      },
      required: [true, "Payment link is required."],
    },
  },
  { timestamps: true }
);

// Method to calculate totals
InvoiceSchema.methods.calculateTotals = function (
  this: HydratedDocument<IInvoice>
) {
  this.netAmount = this.lineItems.reduce((sum, line) => {
    const nights = Math.max(line.nights || 1, 1);
    const quantity = Math.max(line.quantity || 1, 1);
    const subTotal = line.unitPrice * nights * quantity;
    line.subTotal = subTotal;
    return sum + subTotal;
  }, 0);

  this.taxAmount = +(this.netAmount * 0.1925).toFixed(2); // 19.25% tax
  this.grandTotal = this.netAmount + this.taxAmount - this.discountAmount;
  this.amountDue = this.grandTotal - this.amountPaid;

  if (this.amountPaid >= this.grandTotal) {
    this.paymentStatus = "paid";
  } else if (this.amountPaid > 0) {
    this.paymentStatus = "partial";
  } else {
    this.paymentStatus = "unpaid";
  }
};

// Pre-save hook
InvoiceSchema.pre("save", function (next) {
  this.calculateTotals();
  next();
});

export const InvoiceModel = model<IInvoice>("invoices", InvoiceSchema);
