import mongoose, { Schema, model, Types } from "mongoose";
import { io } from "../../socket";

export interface IRestaurantItemCategory {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantItemCategorySchema = new Schema<IRestaurantItemCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// --- Socket emissions ---
RestaurantItemCategorySchema.post("save", async function (doc) {
  io.emit("restaurantCategory:new", doc);
});

RestaurantItemCategorySchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const updatedDoc = await RestaurantItemCategoryModel.findById(doc._id);
  if (updatedDoc) {
    io.emit("restaurantCategory:update", updatedDoc.toObject());
  }
});

RestaurantItemCategorySchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  io.emit("restaurantCategory:deleted", { id: doc._id, ...doc.toObject() });
});

export const RestaurantItemCategoryModel = model<IRestaurantItemCategory>(
  "restaurant_item_categories",
  RestaurantItemCategorySchema
);
