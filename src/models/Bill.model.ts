import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBill extends Document {
  guestId: mongoose.Types.ObjectId;
  reservationId?: mongoose.Types.ObjectId;
  status: "pending" | "paid" | "cancelled";
  issuedAt: Date;
  paidAt?: Date;
  notes?: string;
}

const billSchema = new Schema<IBill>(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "guests",
      required: true,
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          const exists = await mongoose.model("guests").exists({ _id: id });
          return exists !== null;
        },
        message: "Guest not found",
      },
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "reservations",
      required: false,
      validate: {
        validator: async (id: mongoose.Types.ObjectId) => {
          const exists = await mongoose
            .model("reservations")
            .exists({ _id: id });
          return exists !== null;
        },
        message: "Guest not found",
      },
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: Date,
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "bills",
  }
);

export const BillModel: Model<IBill> = mongoose.model<IBill>(
  "bills",
  billSchema
);
