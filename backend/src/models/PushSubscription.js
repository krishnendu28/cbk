import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "unknown"],
      default: "unknown",
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
