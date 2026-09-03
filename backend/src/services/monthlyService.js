import mongoose from "mongoose";
import { MonthlySubscription } from "../models/MonthlySubscription.js";
import { findMonthlyPlan } from "../data/monthlyPlans.js";
import { emitMonthlyChanged } from "../realtime/index.js";
import { logger } from "../utils/logger.js";

const memorySubscriptions = [];

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function todayAtMidnight() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

const PERIOD_BY_MEALS = { 15: 35, 30: 60, 60: 90 };
const DEFAULT_DAILY_LIMIT = 2;
const MAX_DAILY_LIMIT = 5;

function computeDays(meals) {
  const mapped = PERIOD_BY_MEALS[Number(meals)];
  if (mapped) return mapped;
  return Math.max(1, Math.ceil(Number(meals) / 2));
}

function computePeriod(meals) {
  const start = todayAtMidnight();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  const days = computeDays(meals);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23, 59, 59, 999);
  return { startDate: start, endDate: end, days };
}

function toSerializable(subscription) {
  const doc = subscription && typeof subscription.toObject === "function" ? subscription.toObject() : subscription;

  if (!doc) return null;

  return {
    _id: String(doc._id),
    name: doc.name,
    phone: doc.phone,
    address: doc.address,
    planType: doc.planType,
    planId: doc.planId || "",
    mealsTotal: Number(doc.mealsTotal),
    mealsRemaining: Number(doc.mealsRemaining),
    mealsRedeemed: Math.max(0, Number(doc.mealsTotal) - Number(doc.mealsRemaining)),
    price: Number(doc.price),
    startDate: doc.startDate instanceof Date ? doc.startDate.toISOString() : new Date(doc.startDate).toISOString(),
    endDate: doc.endDate instanceof Date ? doc.endDate.toISOString() : new Date(doc.endDate).toISOString(),
    status: doc.status,
    statusApproval: doc.statusApproval || "Pending",
    dailyLimit: Number(doc.dailyLimit) || DEFAULT_DAILY_LIMIT,
    days: Number(doc.days) || 30,
    instructions: doc.instructions || "",
    redemptionLog: Array.isArray(doc.redemptionLog)
      ? doc.redemptionLog.map((entry) => ({
          redeemedAt: entry.redeemedAt instanceof Date ? entry.redeemedAt.toISOString() : new Date(entry.redeemedAt).toISOString(),
          meal: entry.meal,
          note: entry.note || "",
          redeemedBy: entry.redeemedBy || "partner",
        }))
      : [],
    notes: doc.notes || "",
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
  };
}

function toDailyLimit(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_DAILY_LIMIT;
  return Math.min(MAX_DAILY_LIMIT, Math.max(1, Math.floor(parsed)));
}

function approvalGate(status, statusApproval) {
  if (status === "Pending" || (statusApproval || "Pending") === "Pending") {
    return { error: "PENDING_APPROVAL" };
  }
  if (status === "Rejected" || (statusApproval || "") === "Rejected") {
    return { error: "REJECTED", detail: "Subscription was not approved." };
  }
  return null;
}

function startOfTodayMS() {
  const start = todayAtMidnight();
  return start.getTime();
}

function countRedeemedToday(redemptionLog) {
  if (!Array.isArray(redemptionLog)) return 0;
  const startOfDay = startOfTodayMS();
  return redemptionLog.filter((entry) => {
    const ts = entry.redeemedAt instanceof Date ? entry.redeemedAt.getTime() : new Date(entry.redeemedAt).getTime();
    return !Number.isNaN(ts) && ts >= startOfDay;
  }).length;
}

function computeNextStatus(mealsRemaining, status) {
  if (status === "Cancelled" || status === "Rejected" || status === "Pending") return status;
  if (status === "Completed") return status;
  return Number(mealsRemaining) <= 0 ? "Completed" : "Active";
}

export async function createSubscription(input) {
  const { name, phone, address, planType, planId, meals, price } = input;

  const plan = findMonthlyPlan(planType, meals);
  const mealCount = Number(meals) || (plan ? plan.meals : 0);
  if (!mealCount) {
    const error = new Error("Invalid monthly plan. Please choose a valid meal plan.");
    error.statusCode = 400;
    throw error;
  }

  const planPrice = price !== undefined ? Number(price) : plan?.price || 0;
  const { startDate, endDate, days } = computePeriod(mealCount);
  const dailyLimit = toDailyLimit(input.dailyLimit);

  const payload = {
    name,
    phone,
    address,
    planType,
    planId: plan?.id || String(planId || ""),
    mealsTotal: mealCount,
    mealsRemaining: mealCount,
    price: planPrice,
    startDate,
    endDate,
    days,
    dailyLimit,
    instructions: input.instructions || "",
    status: "Pending",
    statusApproval: "Pending",
    redemptionLog: [],
    notes: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let created;
  if (isMongoConnected()) {
    try {
      created = await MonthlySubscription.create(payload);
      created = toSerializable(created);
    } catch (error) {
      logger.warn("monthly.mongo_create_fallback_memory", { reason: error?.message || String(error) });
      created = toMemorySubscription(payload);
    }
  } else {
    created = toMemorySubscription(payload);
  }

  emitMonthlyChanged("subscription:created", created);
  return created;
}

function toMemorySubscription(payload) {
  const subscription = {
    _id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
  };
  memorySubscriptions.unshift(subscription);
  return toSerializable(subscription);
}

export async function listSubscriptions({ phone, status } = {}) {
  const filter = {};
  if (phone) filter.phone = String(phone).trim();
  if (status) filter.status = status;

  let rows;
  if (isMongoConnected()) {
    try {
      rows = await MonthlySubscription.find(filter).sort({ createdAt: -1 });
    } catch (error) {
      logger.warn("monthly.mongo_list_fallback_memory", { reason: error?.message || String(error) });
      rows = [];
    }
    return rows.map(toSerializable);
  }

  let memoryRows = [...memorySubscriptions];
  if (filter.phone) memoryRows = memoryRows.filter((entry) => String(entry.phone).trim() === filter.phone);
  if (filter.status) memoryRows = memoryRows.filter((entry) => entry.status === filter.status);
  return memoryRows.map(toSerializable);
}

export async function getSubscriptionById(id) {
  let doc;
  if (isMongoConnected()) {
    try {
      doc = await MonthlySubscription.findById(id);
    } catch (error) {
      logger.warn("monthly.mongo_get_fallback_memory", { reason: error?.message || String(error) });
      doc = null;
    }
    return toSerializable(doc);
  }

  const memoryRow = memorySubscriptions.find((entry) => entry._id === id);
  return toSerializable(memoryRow);
}

export async function redeemMeals(id, { count = 1, meal = "Lunch", note = "", redeemedBy = "partner" }) {
  const toRedeem = Math.max(1, Math.floor(Number(count) || 1));
  const mealType = ["Lunch", "Dinner"].includes(meal) ? meal : "Lunch";

  if (isMongoConnected()) {
    try {
      const doc = await MonthlySubscription.findById(id);
      if (!doc) return { error: "NOT_FOUND" };

      const gate = approvalGate(doc.status, doc.statusApproval);
      if (gate) return gate;

      const usedToday = countRedeemedToday(doc.redemptionLog);
      const dailyLimit = toDailyLimit(doc.dailyLimit);

      if (usedToday >= dailyLimit) {
        emitMonthlyChanged("subscription:limitExceeded", toSerializable(doc));
        return { error: "DAILY_LIMIT", detail: { usedToday, dailyLimit, days: computeDays(doc.mealsTotal) } };
      }

      if (doc.status === "Cancelled" || doc.status === "Completed") {
        return { error: "CLOSED", detail: doc.status };
      }

      if (Number(doc.mealsRemaining) <= 0) {
        return { error: "NO_MEALS" };
      }

      const redeeming = Math.min(toRedeem, Number(doc.mealsRemaining));
      const entries = Array.from({ length: redeeming }, () => ({
        redeemedAt: new Date(),
        meal: mealType,
        note: String(note || ""),
        redeemedBy: String(redeemedBy || "partner"),
      }));

      doc.mealsRemaining = Math.max(0, Number(doc.mealsRemaining) - redeeming);
      doc.status = computeNextStatus(doc.mealsRemaining, doc.status);
      doc.redemptionLog.push(...entries);
      doc.updatedAt = new Date();
      await doc.save();

      const serialized = toSerializable(doc);
      emitMonthlyChanged("subscription:redeemed", serialized);
      return { subscription: serialized, redeemed: redeeming };
    } catch (error) {
      logger.warn("monthly.mongo_redeem_fallback_memory", { reason: error?.message || String(error) });
      return redeemMemory(id, toRedeem, mealType, note, redeemedBy);
    }
  }

  return redeemMemory(id, toRedeem, mealType, note, redeemedBy);
}

function redeemMemory(id, toRedeem, mealType, note, redeemedBy) {
  const index = memorySubscriptions.findIndex((entry) => entry._id === id);
  if (index < 0) return { error: "NOT_FOUND" };

  const entry = memorySubscriptions[index];
  if (entry.status === "Cancelled" || entry.status === "Completed") {
    return { error: "CLOSED", detail: entry.status };
  }
  const gate = approvalGate(entry.status, entry.statusApproval);
  if (gate) return gate;
  if (Number(entry.mealsRemaining) <= 0) {
    return { error: "NO_MEALS" };
  }

  const usedToday = countRedeemedToday(entry.redemptionLog);
  const dailyLimit = toDailyLimit(entry.dailyLimit);
  if (usedToday >= dailyLimit) {
    emitMonthlyChanged("subscription:limitExceeded", toSerializable(entry));
    return { error: "DAILY_LIMIT", detail: { usedToday, dailyLimit, days: computeDays(entry.mealsTotal) } };
  }

  const redeeming = Math.min(toRedeem, Number(entry.mealsRemaining));
  const entries = Array.from({ length: redeeming }, () => ({
    redeemedAt: new Date().toISOString(),
    meal: mealType,
    note: String(note || ""),
    redeemedBy: String(redeemedBy || "partner"),
  }));

  entry.mealsRemaining = Math.max(0, Number(entry.mealsRemaining) - redeeming);
  entry.status = computeNextStatus(entry.mealsRemaining, entry.status);
  entry.redemptionLog = [...(entry.redemptionLog || []), ...entries];
  entry.updatedAt = new Date().toISOString();

  const serialized = toSerializable(entry);
  emitMonthlyChanged("subscription:redeemed", serialized);
  return { subscription: serialized, redeemed: redeeming };
}

export async function updateSubscription(id, patch) {
  if (isMongoConnected()) {
    try {
      const doc = await MonthlySubscription.findById(id);
      if (!doc) return null;
      applyPatchToSubscription(doc, patch);
      doc.updatedAt = new Date();
      await doc.save();
      const serialized = toSerializable(doc);
      emitMonthlyChanged("subscription:updated", serialized);
      return serialized;
    } catch (error) {
      logger.warn("monthly.mongo_update_fallback_memory", { reason: error?.message || String(error) });
      return updateMemory(id, patch);
    }
  }

  return updateMemory(id, patch);
}

function applyPatchToSubscription(doc, patch) {
  if (patch.mealsTotal !== undefined && patch.mealsTotal !== null && Number(patch.mealsTotal) >= 1) {
    const nextTotal = Number(patch.mealsTotal);
    const remainingAdjustment = nextTotal - Number(doc.mealsTotal);
    doc.mealsTotal = nextTotal;
    doc.mealsRemaining = Math.max(0, Number(doc.mealsRemaining) + remainingAdjustment);
  }

  if (patch.status) {
    doc.status = patch.status;
    if (patch.status === "Active") doc.statusApproval = "Approved";
    if (patch.status === "Rejected") doc.statusApproval = "Rejected";
  }
  if (patch.statusApproval) doc.statusApproval = patch.statusApproval;
  if (patch.dailyLimit !== undefined && patch.dailyLimit !== null) doc.dailyLimit = toDailyLimit(patch.dailyLimit);
  if (patch.days !== undefined && patch.days !== null && Number(patch.days) >= 1) doc.days = Number(patch.days);
  if (patch.instructions !== undefined && patch.instructions !== null) doc.instructions = String(patch.instructions || "");
  if (patch.notes !== undefined) doc.notes = String(patch.notes || "");
  if (patch.name) doc.name = String(patch.name).trim();
  if (patch.phone) doc.phone = String(patch.phone).trim();
  if (patch.address) doc.address = String(patch.address).trim();
  if (patch.price !== undefined && Number(patch.price) >= 0) doc.price = Number(patch.price);

  doc.status = computeNextStatus(doc.mealsRemaining, doc.status);
  return doc;
}

function updateMemory(id, patch) {
  const index = memorySubscriptions.findIndex((entry) => entry._id === id);
  if (index < 0) return null;
  const entry = memorySubscriptions[index];
  applyPatchToSubscription(entry, patch);
  entry.updatedAt = new Date().toISOString();
  const serialized = toSerializable(entry);
  emitMonthlyChanged("subscription:updated", serialized);
  return serialized;
}

export async function deleteSubscription(id) {
  let removed;
  if (isMongoConnected()) {
    try {
      removed = await MonthlySubscription.findByIdAndDelete(id);
    } catch (error) {
      logger.warn("monthly.mongo_delete_fallback_memory", { reason: error?.message || String(error) });
      removed = null;
    }
  }

  if (!removed) {
    const index = memorySubscriptions.findIndex((entry) => entry._id === id);
    if (index < 0) return null;
    [removed] = memorySubscriptions.splice(index, 1);
  }

  emitMonthlyChanged("subscription:deleted", { _id: id });
  return toSerializable(removed);
}

export function getMonthlyStats(subscriptions) {
  const rows = Array.isArray(subscriptions) ? subscriptions : [];
  const active = rows.filter((row) => row.status === "Active");
  const completed = rows.filter((row) => row.status === "Completed");

  return {
    total: rows.length,
    activeCount: active.length,
    completedCount: completed.length,
    cancelledCount: rows.filter((row) => row.status === "Cancelled").length,
    activeMealsRemaining: active.reduce((sum, row) => sum + Number(row.mealsRemaining || 0), 0),
    revenue: rows.reduce((sum, row) => sum + Number(row.price || 0), 0),
    vegCount: active.filter((row) => row.planType === "Veg").length,
    nonVegCount: active.filter((row) => row.planType === "NonVeg").length,
    onlyNonVegCount: active.filter((row) => row.planType === "OnlyNonVeg").length,
  };
}