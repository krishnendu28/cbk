import mongoose from "mongoose";

const outletSettingSchema = new mongoose.Schema(
  {
    outletId: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    gstEnabled: { type: Boolean, required: true, default: true },
    gstRate: { type: Number, required: true, default: 5, min: 0, max: 100 },
    serviceChargeEnabled: { type: Boolean, required: true, default: false },
    serviceChargeRate: { type: Number, required: true, default: 0, min: 0, max: 100 },
    loyaltyPointsPerRupee: { type: Number, required: true, default: 1, min: 0 },
    loyaltyRedemptionRate: { type: Number, required: true, default: 1, min: 0 },
    currencySymbol: { type: String, required: true, default: "Rs", trim: true, maxlength: 8 },
    receiptFooter: { type: String, required: true, default: "Thank you for visiting Chakhna by Kilo", trim: true, maxlength: 220 },
    printKotAutomatically: { type: Boolean, required: true, default: true },
    zomatoEnabled: { type: Boolean, required: true, default: false },
    swiggyEnabled: { type: Boolean, required: true, default: false },
    zomatoApiKey: { type: String, default: null, trim: true },
    swiggyApiKey: { type: String, default: null, trim: true },
    carbonTrackingEnabled: { type: Boolean, required: true, default: false },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

export const OutletSetting = mongoose.model("OutletSetting", outletSettingSchema);
