import mongoose, { Schema, Document, Model } from "mongoose";

interface ConfigSetting<T> {
  value: T;
  description: string;
}

export interface IAdminConfiguration extends Document {
  reservations: {
    minimumDepositPercentage: ConfigSetting<number>;
    expireAfter: ConfigSetting<number>;
  };
}

const adminConfigurationSchema = new Schema<IAdminConfiguration>(
  {
    reservations: {
      minimumDepositPercentage: {
        value: {
          type: Number,
          required: true,
          min: 10,
          max: 100,
        },
        description: {
          type: String,
          default:
            "The minimum deposit required (in %) to confirm a reservation.",
        },
      },
      expireAfter: {
        value: {
          type: Number,
          required: true,
          min: 15,
        },
        description: {
          type: String,
          default:
            "The number of minutes after which an unconfirmed reservation expires.",
        },
      },
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

export const AdminConfigurationModel: Model<IAdminConfiguration> =
  mongoose.model<IAdminConfiguration>(
    "admin_configuration",
    adminConfigurationSchema
  );
