import * as mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    issuedAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export const RefundModel = mongoose.model("refunds", refundSchema);
