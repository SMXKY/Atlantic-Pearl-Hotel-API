import * as mongoose from "mongoose";

const bedTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Bed Type name required."],
    },
    description: {
      type: String,
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

export const BedTypeModel = mongoose.model("bed_types", bedTypeSchema);
