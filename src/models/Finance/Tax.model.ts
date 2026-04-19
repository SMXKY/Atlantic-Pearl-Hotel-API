import mongoose, { Schema, Document, model } from "mongoose";

export interface ITax extends Document {
  name: string;
  percentage?: number;
  amount?: number;
  taxType: "percentage" | "amount";
  createdAt?: Date;
  updatedAt?: Date;
  protected: boolean;
  code: string;
}

const taxSchema: Schema<ITax> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tax name is required."],
      unique: true,
    },
    percentage: {
      type: Number,
    },
    amount: {
      type: Number,
    },
    taxType: {
      type: String,
      enum: {
        values: ["percentage", "amount"],
        message: "Invalid type, allowed types include: percentage or amount",
      },
      required: [true, "Tax type must be specified"],
    },
    protected: {
      type: Boolean,
      default: false,
    },
    code: {
      type: String,
      unique: true,
      index: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

//Generate code
taxSchema.pre("save", function (next) {
  if (this.name && typeof this.name === "string") {
    this.code = this.name.toLowerCase().split(" ").join(".");
  }
  next();
});

taxSchema.pre("deleteOne", { document: true, query: false }, function (next) {
  if (this.get("protected")) {
    return next(
      new Error(
        "This tax is essential for the system hence, it is protected and cannot be deleted."
      )
    );
  }
  next();
});

export const TaxModel = model<ITax>("taxes", taxSchema);
