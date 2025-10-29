import * as mongoose from "mongoose";

const iptvLogSchema = new mongoose.Schema(
  {
    isSuccess: {
      type: Boolean,
      default: true,
    },
    response: {
      type: String,
      required: [true, "JSON IPTV response is required to log it."],
    },
    identify: {
      type: String,
      required: [true, "Idnetify unique token required"],
    },
    isValidResponseToken: {
      type: Boolean,
      default: true,
    },
    serverSentRequest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const IPTVLogModel = mongoose.model("iptv_logs", iptvLogSchema);
