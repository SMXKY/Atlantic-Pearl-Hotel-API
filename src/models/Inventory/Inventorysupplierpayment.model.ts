import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryGoodsReceiptModel } from "./Inventorygoodsreceipt.model";
import { InventorySupplierModel } from "./Inventorysupplier.model";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cheque"
  | "mobile_money"
  | "other";

export type PaymentStatus =
  | "pending" // Payment recorded but not yet confirmed
  | "confirmed" // Payment confirmed by hotel manager
  | "reversed"; // Payment reversed due to error or dispute

export interface IInventorySupplierPayment extends Document {
  paymentNumber: string;
  goodsReceipt: Types.ObjectId;
  supplier: Types.ObjectId;
  amountInCFA: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  referenceNumber?: string;
  status: PaymentStatus;
  notes?: string;
  confirmedBy?: Types.ObjectId;
  confirmedAt?: Date;
  reversedBy?: Types.ObjectId;
  reversedAt?: Date;
  reversalReason?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySupplierPaymentSchema = new mongoose.Schema(
  {
    // Auto-generated in the format PAY-{YEAR}-{SEQUENCE}
    // e.g. PAY-2026-0001
    paymentNumber: {
      type: String,
      // required: [true, "Payment number is required"],
      unique: true,
      trim: true,
    },

    // Every payment must be tied to a posted GRN.
    // You cannot pay for goods that have not been received and posted.
    goodsReceipt: {
      type: mongoose.Types.ObjectId,
      ref: "inventorygoodsreceipts",
      required: [true, "Goods receipt reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const grn = await InventoryGoodsReceiptModel.findById(id);
          if (!grn) return false;
          // Can only pay against a posted GRN
          if (grn.status !== "posted") return false;
          return true;
        },
        message:
          "Goods receipt not found or has not been posted yet. Payments can only be recorded against posted receipts.",
      },
    },

    // Denormalized from GRN for quick access on payment documents and reports
    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "inventorysuppliers",
      required: [true, "Supplier reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventorySupplierModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Supplier Id not found in the database",
      },
    },

    amountInCFA: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Payment amount must be greater than zero"],
    },

    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["cash", "bank_transfer", "cheque", "mobile_money", "other"],
        message:
          "Invalid payment method. Must be one of: cash, bank_transfer, cheque, mobile_money, other",
      },
    },

    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
    },

    // Bank reference, cheque number, mobile money transaction ID, etc.
    referenceNumber: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      required: [true, "Payment status is required"],
      enum: {
        values: ["pending", "confirmed", "reversed"],
        message:
          "Invalid payment status. Must be one of: pending, confirmed, reversed",
      },
      default: "pending",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    confirmedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    confirmedAt: {
      type: Date,
    },

    reversedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    reversedAt: {
      type: Date,
    },

    // Required when reversing a payment
    reversalReason: {
      type: String,
      trim: true,
      maxlength: [500, "Reversal reason cannot exceed 500 characters"],
    },

    recordedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Recorded by user is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
inventorySupplierPaymentSchema.index({ paymentNumber: 1 });
inventorySupplierPaymentSchema.index({ goodsReceipt: 1 });
inventorySupplierPaymentSchema.index({ supplier: 1, status: 1, createdAt: -1 });
inventorySupplierPaymentSchema.index({ paymentDate: -1 });
inventorySupplierPaymentSchema.index({ status: 1 });

// Auto-generate payment number before first save.
// Format: PAY-{YEAR}-{ZERO_PADDED_SEQUENCE}
inventorySupplierPaymentSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const year = new Date().getFullYear();
    const count = await InventorySupplierPaymentModel.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    this.paymentNumber = `PAY-${year}-${sequence}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Validate total payments against a GRN do not exceed its totalAmountInCFA.
// Prevents overpayment. Reversed payments are excluded from the running total.
inventorySupplierPaymentSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const grn = await InventoryGoodsReceiptModel.findById(this.goodsReceipt);
    if (!grn) return next(new Error("Goods receipt not found"));

    const existingPayments = await InventorySupplierPaymentModel.find({
      goodsReceipt: this.goodsReceipt,
      status: { $ne: "reversed" },
    });

    const totalPaid = existingPayments.reduce(
      (sum, p) => sum + p.amountInCFA,
      0
    );

    if (totalPaid + this.amountInCFA > grn.totalAmountInCFA) {
      return next(
        new Error(
          `This payment of ${
            this.amountInCFA
          } CFA would exceed the goods receipt total of ${
            grn.totalAmountInCFA
          } CFA. Already paid: ${totalPaid} CFA. Maximum remaining: ${
            grn.totalAmountInCFA - totalPaid
          } CFA.`
        )
      );
    }

    next();
  } catch (err: any) {
    next(err);
  }
});

// Stamp confirmation or reversal timestamps on status change
inventorySupplierPaymentSchema.pre("save", function (next) {
  if (!this.isModified("status")) return next();

  if (this.status === "confirmed" && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }

  if (this.status === "reversed" && !this.reversedAt) {
    this.reversedAt = new Date();
  }

  next();
});

// Enforce reversalReason is present when reversing a payment
inventorySupplierPaymentSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "reversed" &&
    (!this.reversalReason || this.reversalReason.trim() === "")
  ) {
    return next(
      new Error("A reversal reason is required when reversing a payment")
    );
  }
  next();
});

// Prevent editing a confirmed payment.
// Confirmed payments are part of the financial record.
// Reverse and re-record if a correction is needed.
inventorySupplierPaymentSchema.pre("save", function (next) {
  if (
    !this.isNew &&
    this.status === "confirmed" &&
    (this.isModified("amountInCFA") ||
      this.isModified("paymentMethod") ||
      this.isModified("paymentDate"))
  ) {
    return next(
      new Error(
        "A confirmed payment cannot be edited. Reverse the payment and record a new one."
      )
    );
  }
  next();
});

export const InventorySupplierPaymentModel =
  mongoose.model<IInventorySupplierPayment>(
    "inventorysupplierpayments",
    inventorySupplierPaymentSchema
  );
