import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { isValidNumber } from "libphonenumber-js";

export interface IInventorySupplier extends Document {
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  address?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  isActive: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  // Computed from InventorySupplierRating documents via virtual
  averageRating?: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  qualityIssues: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      unique: true,
    },

    // Short code used in PO references e.g. "SUP-001"
    code: {
      type: String,
      required: [true, "Supplier code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [20, "Supplier code cannot exceed 20 characters"],
    },

    contactPerson: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Supplier email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Invalid email format",
      },
    },

    phoneNumber: {
      type: String,
      required: [true, "Supplier phone number is required"],
      validate: {
        validator: function (phone: string) {
          // Allow international format since suppliers may not be local
          return /^\+?[1-9]\d{6,14}$/.test(phone);
        },
        message: "Invalid phone number format",
      },
    },

    address: {
      type: String,
      trim: true,
    },

    // e.g. "Net 30", "Cash on delivery", "50% upfront"
    paymentTerms: {
      type: String,
      trim: true,
    },

    // How many days from order to expected delivery
    leadTimeDays: {
      type: Number,
      required: [true, "Supplier lead time in days is required"],
      min: [0, "Lead time cannot be negative"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Blacklisted suppliers cannot be selected on new POs
    isBlacklisted: {
      type: Boolean,
      default: false,
    },

    blacklistReason: {
      type: String,
      trim: true,
    },

    // Performance counters -- incremented by the service layer
    // each time a GoodsReceipt is posted against this supplier
    totalDeliveries: {
      type: Number,
      default: 0,
      min: [0, "Total deliveries cannot be negative"],
    },

    onTimeDeliveries: {
      type: Number,
      default: 0,
      min: [0, "On time deliveries cannot be negative"],
    },

    lateDeliveries: {
      type: Number,
      default: 0,
      min: [0, "Late deliveries cannot be negative"],
    },

    qualityIssues: {
      type: Number,
      default: 0,
      min: [0, "Quality issues count cannot be negative"],
    },

    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },

    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: on-time delivery rate as a percentage
// Computed from counters so no extra query needed on list views
inventorySupplierSchema.virtual("onTimeRate").get(function () {
  if (this.totalDeliveries === 0) return null;
  return Math.round((this.onTimeDeliveries / this.totalDeliveries) * 100);
});

// Indexes
inventorySupplierSchema.index({ code: 1 });
inventorySupplierSchema.index({ isActive: 1, isBlacklisted: 1 });

// Normalize code to uppercase before save
inventorySupplierSchema.pre("save", function (next) {
  if (this.isModified("code")) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

// Ensure blacklistReason is provided when blacklisting a supplier
inventorySupplierSchema.pre("save", function (next) {
  if (this.isModified("isBlacklisted") && this.isBlacklisted) {
    if (!this.blacklistReason || this.blacklistReason.trim() === "") {
      return next(
        new Error("A reason is required when blacklisting a supplier")
      );
    }
  }
  next();
});

// Clear blacklist reason when un-blacklisting
inventorySupplierSchema.pre("save", function (next) {
  if (this.isModified("isBlacklisted") && !this.isBlacklisted) {
    this.blacklistReason = undefined;
  }
  next();
});

export const InventorySupplierModel = mongoose.model<IInventorySupplier>(
  "inventorysuppliers",
  inventorySupplierSchema
);
