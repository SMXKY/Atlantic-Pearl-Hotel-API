import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventoryLocationModel } from "./Inventorylocation.model";
import { InventoryItemModel } from "./Inventoryitem.model";
import { InventoryItemLocationModel } from "./Inventoryitemlocation.model";

export type RequisitionStatus =
  | "pending" // Submitted, awaiting store manager review
  | "approved" // Approved in full, stock issued
  | "partial" // Partially fulfilled, some items unavailable
  | "rejected" // Rejected by store manager
  | "cancelled"; // Cancelled by the requesting department

export interface IRequisitionItem {
  item: Types.ObjectId;
  quantityRequested: number;
  quantityIssued: number;
  unitCostInCFA: number;
  totalCostInCFA: number;
  notes?: string;
}

export interface IInventoryRequisition extends Document {
  requisitionNumber: string;
  location: Types.ObjectId;
  requestedBy: Types.ObjectId;
  department: Types.ObjectId;
  status: RequisitionStatus;
  items: IRequisitionItem[];
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const requisitionItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Types.ObjectId,
      ref: "inventoryitems",
      required: [true, "Item reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryItemModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Item Id not found in the database",
      },
    },

    quantityRequested: {
      type: Number,
      required: [true, "Requested quantity is required"],
      min: [0.001, "Requested quantity must be greater than zero"],
    },

    // Filled in when the store manager approves or partially fulfills.
    // Zero until then.
    quantityIssued: {
      type: Number,
      default: 0,
      min: [0, "Issued quantity cannot be negative"],
    },

    // FIFO unit cost at time of issue -- populated by service layer
    unitCostInCFA: {
      type: Number,
      default: 0,
      min: [0, "Unit cost cannot be negative"],
    },

    // Computed: quantityIssued * unitCostInCFA
    totalCostInCFA: {
      type: Number,
      default: 0,
      min: [0, "Total cost cannot be negative"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [300, "Item notes cannot exceed 300 characters"],
    },
  },
  { _id: false }
);

const inventoryRequisitionSchema = new mongoose.Schema(
  {
    // Auto-generated in the format REQ-{YEAR}-{SEQUENCE}
    // e.g. REQ-2026-0001
    requisitionNumber: {
      type: String,
      required: [true, "Requisition number is required"],
      unique: true,
      trim: true,
    },

    // The store location being requested from.
    // Validated against the requesting department's allowed locations.
    location: {
      type: mongoose.Types.ObjectId,
      ref: "inventorylocations",
      required: [true, "Location reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventoryLocationModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Location Id not found in the database",
      },
    },

    requestedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Requested by user is required"],
    },

    // Department the request is raised on behalf of.
    // Used to scope requisition history and consumption reports.
    department: {
      type: mongoose.Types.ObjectId,
      ref: "departments",
      required: [true, "Department reference is required"],
    },

    status: {
      type: String,
      required: [true, "Requisition status is required"],
      enum: {
        values: ["pending", "approved", "partial", "rejected", "cancelled"],
        message:
          "Invalid status. Must be one of: pending, approved, partial, rejected, cancelled",
      },
      default: "pending",
    },

    items: {
      type: [requisitionItemSchema],
      validate: {
        validator: function (items: IRequisitionItem[]) {
          return items.length > 0;
        },
        message: "A requisition must contain at least one item",
      },
    },

    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },

    reviewedAt: {
      type: Date,
    },

    // Required when status is rejected
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common query patterns
inventoryRequisitionSchema.index({ requisitionNumber: 1 });
inventoryRequisitionSchema.index({ location: 1, status: 1, createdAt: -1 });
inventoryRequisitionSchema.index({ requestedBy: 1, createdAt: -1 });
inventoryRequisitionSchema.index({ department: 1, status: 1, createdAt: -1 });

// Auto-generate requisition number before first save.
// Format: REQ-{YEAR}-{ZERO_PADDED_SEQUENCE}
inventoryRequisitionSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const year = new Date().getFullYear();
    const count = await InventoryRequisitionModel.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    this.requisitionNumber = `REQ-${year}-${sequence}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Enforce rejectionReason when rejecting a requisition.
inventoryRequisitionSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "rejected" &&
    (!this.rejectionReason || this.rejectionReason.trim() === "")
  ) {
    return next(
      new Error("A rejection reason is required when rejecting a requisition")
    );
  }
  next();
});

// Stamp reviewedAt when the store manager acts on the requisition.
inventoryRequisitionSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    ["approved", "partial", "rejected"].includes(this.status) &&
    !this.reviewedAt
  ) {
    this.reviewedAt = new Date();
  }
  next();
});

// Validate that the requesting department is linked to the requested location.
// Prevents a department from requesting from a store they are not scoped to.
inventoryRequisitionSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const location = await InventoryLocationModel.findById(this.location);

    if (!location) {
      return next(new Error("Location not found"));
    }

    const departmentAllowed = location.departments.some(
      (deptId) => deptId.toString() === this.department.toString()
    );

    if (!departmentAllowed) {
      return next(
        new Error(
          "This department is not authorized to request from the selected location"
        )
      );
    }

    next();
  } catch (err: any) {
    next(err);
  }
});

export const InventoryRequisitionModel = mongoose.model<IInventoryRequisition>(
  "inventoryrequisitions",
  inventoryRequisitionSchema
);
