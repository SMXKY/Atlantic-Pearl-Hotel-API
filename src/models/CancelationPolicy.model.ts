import * as mongoose from "mongoose";

const cancellationPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cancellation Policy name is required"],
      trim: true,
    },
    refundableUntilInHours: {
      type: Number,
      required: [
        true,
        "Please specify how many hours before check-in the cancellation is refundable",
      ],
      min: [1, "Hours must be 1 or more"],
    },
    refundablePercentage: {
      type: Number,
      required: [true, "Please specify the refundable percentage"],
      min: [1, "Refundable percentage cannot be less than 1"],
      max: [100, "Refundable percentage cannot exceed 100"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const CancellationPolicyModel = mongoose.model(
  "cancellationpolicies",
  cancellationPolicySchema
);
