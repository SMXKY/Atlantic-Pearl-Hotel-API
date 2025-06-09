import * as mongoose from "mongoose";
import { RoomTypeModel } from "./RoomType.model";
import { AppError } from "util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { CancellationPolicyModel } from "./CancelationPolicy.model";

export interface IRate extends mongoose.Document {
  code: string;
  name: string;
  description: string;
  totalPriceInCFA: number;
  taxIncluded: boolean;
  mealPlan: "RO" | "B&B" | "HB" | "FB" | "AI";
  occupancy: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  roomType: mongoose.Types.ObjectId;
  cancelationPolicy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const rateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Rate code is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Rate name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Rate description is required"],
      trim: true,
    },
    totalPriceInCFA: {
      type: Number,
      required: [true, "Rate price is required."],
      min: 100,
    },
    taxIncluded: {
      type: Boolean,
      default: false,
      required: [
        true,
        "Please specify if tax is included in rate price or not",
      ],
    },
    mealPlan: {
      type: String,
      enum: {
        values: ["RO", "B&B", "HB", "FB", "AI"],
        message: `Invalid meal plan. Accepted values:
            - RO: Room Only
            - B&B: Bed and Breakfast
            - HB: Half Board (Breakfast + Dinner)
            - FB: Full Board (Breakfast, Lunch, Dinner)
            - AI: All Inclusive (All meals + selected drinks)`,
      },
      required: [
        true,
        `Meal plan is required. Accepted values:
          - RO: Room Only
          - B&B: Bed and Breakfast
          - HB: Half Board (Breakfast + Dinner)
          - FB: Full Board (Breakfast, Lunch, Dinner)
          - AI: All Inclusive (All meals + selected drinks)`,
      ],
    },
    occupancy: {
      type: Number,
      default: 2,
      min: [1, "Occupancy must be at least 1 person"],
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
    },
    validTo: {
      type: Date,
      required: [true, "Valid to date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    roomType: {
      type: mongoose.Types.ObjectId,
      ref: "roomtypes",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await RoomTypeModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid room type Id.",
      },
    },
    cancelationPolicy: {
      type: mongoose.Types.ObjectId,
      ref: "cancellationpolicies",
      required: true,
      validate: {
        validator: async function (id: mongoose.Types.ObjectId) {
          const exists = await CancellationPolicyModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Invalid Cancelation Policy Id.",
      },
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// Compound unique index to enforce unique roomType + mealPlan combinations
rateSchema.index({ roomType: 1, mealPlan: 1 }, { unique: true });

// Pre-save hook to check roomType existence and price validation
rateSchema.pre("save", async function (next) {
  const roomType = await RoomTypeModel.findById(this.roomType);

  if (!roomType) {
    return next(new AppError("Invalid room type Id.", StatusCodes.BAD_REQUEST));
  }

  if (this.totalPriceInCFA < roomType.minimumPriceInCFA) {
    return next(
      new AppError(
        "Rate total price cannot be less than the room type minimum price",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  // Validate validTo > validFrom
  if (this.validTo <= this.validFrom) {
    return next(
      new AppError(
        "'Valid To' date must be greater than 'Valid From' date.",
        StatusCodes.BAD_REQUEST
      )
    );
  }

  next();
});

export const RateModel = mongoose.model<IRate>("rates", rateSchema);
