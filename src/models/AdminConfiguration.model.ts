import mongoose, { Schema, Document, Model } from "mongoose";

interface ConfigSetting<T> {
  value: T;
  description: string;
}

interface ICancelationPolicy {
  isRefundable: boolean;
  refundableUntilInHours: number;
  refundablePercentage: number;
}

interface IHotelPolicies {
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partyingAllowed: boolean;
  checkInTime: string; // e.g., "14:00"
  checkOutTime: string; // e.g., "11:00"
  description?: string;
}

export interface IAdminConfiguration extends Document {
  reservations: {
    minimumDepositPercentage: ConfigSetting<number>;
    expireAfter: ConfigSetting<number>;
    cancelationPolicy: ICancelationPolicy;
  };
  hotel: {
    policies: IHotelPolicies;
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
      cancelationPolicy: {
        isRefundable: {
          type: Boolean,
          default: false,
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
      },
    },
    hotel: {
      policies: {
        smokingAllowed: {
          type: Boolean,
          default: false,
        },
        petsAllowed: {
          type: Boolean,
          default: false,
        },
        partyingAllowed: {
          type: Boolean,
          default: false,
        },
        checkInTime: {
          type: String,
          default: "14:00",
        },
        checkOutTime: {
          type: String,
          default: "11:00",
        },
        description: {
          type: String,
          default: "General hotel policies for guest conduct and expectations.",
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
