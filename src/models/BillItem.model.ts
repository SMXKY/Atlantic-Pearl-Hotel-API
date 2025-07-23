import mongoose, { Schema, Document, Model } from "mongoose";

const allowedCategories = {
  room_reservation: "ReservationModel",
  parking_reservations: "parking_reservations",
  food: "FoodOrderModel",
  amenity: "AmenityUsageModel",
} as const;

type AllowedCategory = keyof typeof allowedCategories;

export interface IBillItem extends Document {
  billId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  category: AllowedCategory;
  linkedEntityId?: mongoose.Types.ObjectId;
}

const billItemSchema = new Schema<IBillItem>(
  {
    billId: {
      type: Schema.Types.ObjectId,
      ref: "bills",
      required: true,
      validator: async (id: mongoose.Types.ObjectId) => {
        const exists = await mongoose.model("bills").exists({ _id: id });
        return exists !== null;
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: Object.keys(allowedCategories),
      required: true,
    },
    linkedEntityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "bill_items",
  }
);

billItemSchema.pre("save", async function (next) {
  if (!this.linkedEntityId) return next();

  const ModelName = allowedCategories[this.category as AllowedCategory];
  if (!ModelName) {
    return next(new Error(`Invalid category '${this.category}'`));
  }

  try {
    const Model = mongoose.model(ModelName);
    const exists = await Model.exists({ _id: this.linkedEntityId });
    if (!exists) {
      return next(
        new Error(`Linked entity not found for category ${this.category}`)
      );
    }
    next();
  } catch (err: any) {
    next(err);
  }
});

billItemSchema.virtual("linkedEntity", {
  ref: function () {
    return allowedCategories[this.category as AllowedCategory];
  },
  localField: "linkedEntityId",
  foreignField: "_id",
  justOne: true,
});

function autoPopulateLinkedEntity(this: IBillItem) {
  this.populate("linkedEntity");
}

billItemSchema.pre("find", autoPopulateLinkedEntity);
billItemSchema.pre("findOne", autoPopulateLinkedEntity);
billItemSchema.pre("findOneAndUpdate", autoPopulateLinkedEntity);

export const BillItemModel: Model<IBillItem> = mongoose.model<IBillItem>(
  "bill_items",
  billItemSchema
);

// billItemSchema.pre("findById", autoPopulateLinkedEntity);
