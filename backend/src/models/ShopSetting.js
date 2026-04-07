import mongoose from "mongoose";

const shopSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isOrderingOpen: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

export const ShopSetting = mongoose.model("ShopSetting", shopSettingSchema);
