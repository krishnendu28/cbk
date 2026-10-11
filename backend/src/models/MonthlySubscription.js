import mongoose from "mongoose";

const redemptionEntrySchema = new mongoose.Schema(
  {
    redeemedAt: { type: Date, default: Date.now },
    date: { type: String, default: "", trim: true },
    meal: { type: String, enum: ["Lunch", "Dinner"], required: true },
    note: { type: String, default: "", trim: true },
    redeemedBy: { type: String, default: "partner", trim: true },
  },
  { _id: false },
);

const mealSelectionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    meal: { type: String, enum: ["Lunch", "Dinner"], required: true },
    wanted: { type: Boolean, default: false },
    served: { type: Boolean, default: false },
    servedAt: { type: Date },
    source: { type: String, default: "user", trim: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const monthlySubscriptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    planType: { type: String, enum: ["Veg", "NonVeg", "OnlyNonVeg"], required: true },
    planId: { type: String, trim: true },
    mealsTotal: { type: Number, required: true, min: 1 },
    mealsRemaining: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Active", "Completed", "Cancelled", "Rejected"],
      default: "Pending",
    },
    statusApproval: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    dailyLimit: { type: Number, default: 2 },
    days: { type: Number, default: 30 },
    instructions: { type: String, default: "", trim: true },
    redemptionLog: { type: [redemptionEntrySchema], default: [] },
    mealSelections: { type: [mealSelectionSchema], default: [] },
    notes: { type: String, default: "", trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

monthlySubscriptionSchema.index({ phone: 1, status: 1 });
monthlySubscriptionSchema.index({ status: 1, createdAt: -1 });

export const MonthlySubscription = mongoose.model("MonthlySubscription", monthlySubscriptionSchema);