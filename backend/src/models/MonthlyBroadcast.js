import mongoose from "mongoose";

const monthlyBroadcastSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const MonthlyBroadcast = mongoose.model("MonthlyBroadcast", monthlyBroadcastSchema);