import * as mongoose from "mongoose";
import { Document, Types } from "mongoose";
import { InventorySupplierModel } from "./Inventorysupplier.model";
import { InventoryGoodsReceiptModel } from "./Inventorygoodsreceipt.model";

export interface IInventorySupplierRating extends Document {
  supplier: Types.ObjectId;
  goodsReceipt: Types.ObjectId;
  // Overall delivery rating 1-5
  rating: number;
  // Breakdown scores -- each 1-5, optional but encouraged
  deliveryTimeScore?: number;
  qualityScore?: number;
  packagingScore?: number;
  comment?: string;
  ratedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySupplierRatingSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "inventorysuppliers",
      required: [true, "Supplier reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const exists = await InventorySupplierModel.exists({ _id: id });
          return exists !== null;
        },
        message: "Supplier Id not found in the database",
      },
    },

    // One rating per goods receipt -- enforced by unique index below
    goodsReceipt: {
      type: mongoose.Types.ObjectId,
      ref: "inventorygoodsreceipts",
      required: [true, "Goods receipt reference is required"],
      validate: {
        validator: async function (id: Types.ObjectId) {
          const grn = await InventoryGoodsReceiptModel.findById(id);
          if (!grn) return false;
          // Can only rate a posted GRN -- rating a draft makes no sense
          if (grn.status !== "posted") return false;
          return true;
        },
        message:
          "Goods receipt not found or has not been posted. Ratings can only be given for posted receipts.",
      },
    },

    // Overall delivery rating from 1 (poor) to 5 (excellent)
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
    },

    // Optional breakdown scores for more granular supplier performance insight
    deliveryTimeScore: {
      type: Number,
      min: [1, "Delivery time score must be between 1 and 5"],
      max: [5, "Delivery time score must be between 1 and 5"],
    },

    qualityScore: {
      type: Number,
      min: [1, "Quality score must be between 1 and 5"],
      max: [5, "Quality score must be between 1 and 5"],
    },

    packagingScore: {
      type: Number,
      min: [1, "Packaging score must be between 1 and 5"],
      max: [5, "Packaging score must be between 1 and 5"],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },

    ratedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Rated by user is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One rating per goods receipt -- prevents double-rating a delivery
inventorySupplierRatingSchema.index({ goodsReceipt: 1 }, { unique: true });

inventorySupplierRatingSchema.index({ supplier: 1, createdAt: -1 });

// Ratings are immutable once submitted.
// If a rating was made in error, the store manager must contact
// an admin to have it removed and re-rated.
inventorySupplierRatingSchema.pre("findOneAndUpdate", function (next) {
  return next(
    new Error(
      "Supplier ratings cannot be edited after submission. Delete and re-rate if a correction is needed."
    )
  );
});

inventorySupplierRatingSchema.pre("updateOne", function (next) {
  return next(
    new Error(
      "Supplier ratings cannot be edited after submission. Delete and re-rate if a correction is needed."
    )
  );
});

// After a rating is saved, update the supplier's average rating.
// We compute a simple rolling average by fetching all ratings for
// this supplier and updating averageRating on the supplier document.
// This keeps the supplier list view fast without aggregation queries.
inventorySupplierRatingSchema.post("save", async function (doc) {
  try {
    const allRatings = await InventorySupplierRatingModel.find({
      supplier: doc.supplier,
    });

    const average =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await InventorySupplierModel.findByIdAndUpdate(doc.supplier, {
      averageRating: parseFloat(average.toFixed(1)),
    });
  } catch {
    // Non-critical -- average will be recomputed on next rating
  }
});

export const InventorySupplierRatingModel =
  mongoose.model<IInventorySupplierRating>(
    "inventorysupplierratings",
    inventorySupplierRatingSchema
  );
