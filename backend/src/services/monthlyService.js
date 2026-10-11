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
          date: entry.date || "",
          meal: entry.meal,
          note: entry.note || "",
          redeemedBy: entry.redeemedBy || "partner",
        }))
      : [],
    mealSelections: Array.isArray(doc.mealSelections)
      ? doc.mealSelections.map((selection) => ({
          date: selection.date,
          meal: selection.meal,
          wanted: Boolean(selection.wanted),
          served: Boolean(selection.served),
          servedAt: selection.servedAt
            ? selection.servedAt instanceof Date
              ? selection.servedAt.toISOString()
              : new Date(selection.servedAt).toISOString()
            : null,
          source: selection.source || "user",
          updatedAt: selection.updatedAt
            ? selection.updatedAt instanceof Date
              ? selection.updatedAt.toISOString()
              : new Date(selection.updatedAt).toISOString()
            : null,
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function lastTenDigits(value) {
  return digitsOnly(value).slice(-10);
}

function isExpired(value) {
  const ts = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return !Number.isNaN(ts) && ts < Date.now();
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
  const { name, phone, address, planType, planId, meals } = input;

  const plan = findMonthlyPlan(planType, meals);
  const mealCount = Number(meals) || (plan ? plan.meals : 0);
  if (!mealCount) {
    const error = new Error("Invalid monthly plan. Please choose a valid meal plan.");
    error.statusCode = 400;
    throw error;
  }

  const planPrice = plan?.price || 0;
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
  const phoneSuffix = phone ? lastTenDigits(String(phone)) : "";
  const filter = {};
  if (phoneSuffix) filter.phone = new RegExp(`${escapeRegExp(phoneSuffix)}$`);
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
  if (phoneSuffix) memoryRows = memoryRows.filter((entry) => lastTenDigits(entry.phone) === phoneSuffix);
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

      if (isExpired(doc.endDate)) {
        doc.status = "Completed";
        doc.updatedAt = new Date();
        await doc.save();
        emitMonthlyChanged("subscription:expired", toSerializable(doc));
        return { error: "EXPIRED_PLAN", detail: { endDate: doc.endDate } };
      }

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
  if (isExpired(entry.endDate)) {
    entry.status = "Completed";
    entry.updatedAt = new Date().toISOString();
    emitMonthlyChanged("subscription:expired", toSerializable(entry));
    return { error: "EXPIRED_PLAN", detail: { endDate: entry.endDate } };
  }
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
    const redeemed = Array.isArray(doc.redemptionLog) ? doc.redemptionLog.length : 0;
    const nextTotal = Math.max(Number(patch.mealsTotal), redeemed);
    const remainingAdjustment = nextTotal - Number(doc.mealsTotal);
    doc.mealsTotal = nextTotal;
    doc.mealsRemaining = Math.max(0, Number(doc.mealsRemaining) + remainingAdjustment);
  }

  if (patch.mealsDelta !== undefined && patch.mealsDelta !== null) {
    const change = Math.trunc(Number(patch.mealsDelta) || 0);
    if (change !== 0) {
      doc.mealsRemaining = Math.max(0, Number(doc.mealsRemaining) + change);
      if (Number(doc.mealsRemaining) > Number(doc.mealsTotal)) doc.mealsTotal = Number(doc.mealsRemaining);
    }
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

// --- Daily meal demand (user Yes/No) + admin serving --------------------------

// The kitchen runs in India, so "today" is resolved in IST regardless of where
// the serverless container runs or which device calls the API.
export function serviceDateString(value = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value instanceof Date ? value : new Date(value));
  } catch {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

function normalizeServiceDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : serviceDateString();
}

function normalizeMeal(value) {
  return ["Lunch", "Dinner"].includes(value) ? value : "Lunch";
}

async function loadRecord(id) {
  if (isMongoConnected()) {
    try {
      const doc = await MonthlySubscription.findById(id);
      if (doc) return { kind: "mongo", doc };
    } catch (error) {
      logger.warn("monthly.mongo_load_fallback_memory", { reason: error?.message || String(error) });
    }
    const memory = memorySubscriptions.find((row) => row._id === id);
    if (memory) return { kind: "memory", entry: memory };
    return null;
  }
  const memory = memorySubscriptions.find((row) => row._id === id);
  return memory ? { kind: "memory", entry: memory } : null;
}

async function saveRecord(record, event) {
  let serialized;
  if (record.kind === "mongo") {
    record.doc.updatedAt = new Date();
    await record.doc.save();
    serialized = toSerializable(record.doc);
  } else {
    record.entry.updatedAt = new Date().toISOString();
    serialized = toSerializable(record.entry);
  }
  if (event) emitMonthlyChanged(event, serialized);
  return serialized;
}

function pushRedemption(rec, { serviceDate, meal, source, note = "" }) {
  const entry = {
    redeemedAt: new Date(),
    date: serviceDate,
    meal,
    note: String(note || ""),
    redeemedBy: source || "user",
  };
  if (Array.isArray(rec.redemptionLog)) rec.redemptionLog.push(entry);
  else rec.redemptionLog = [entry];
}

function removeRedemption(rec, { serviceDate, meal, source }) {
  const log = rec.redemptionLog;
  if (!Array.isArray(log)) return;
  let index = log.findIndex(
    (entry) => entry.date === serviceDate && entry.meal === meal && (entry.redeemedBy || "") === (source || "user"),
  );
  if (index < 0) index = log.findIndex((entry) => entry.date === serviceDate && entry.meal === meal && (entry.redeemedBy || "") !== "admin");
  if (index >= 0) log.splice(index, 1);
}

function findSelection(rec, serviceDate, meal) {
  if (!Array.isArray(rec.mealSelections)) rec.mealSelections = [];
  return rec.mealSelections.find((selection) => selection.date === serviceDate && selection.meal === meal) || null;
}

function upsertSelection(rec, serviceDate, meal, wanted, source, served) {
  let selection = findSelection(rec, serviceDate, meal);
  const now = new Date();
  if (!selection) {
    selection = {
      date: serviceDate,
      meal,
      wanted: Boolean(wanted),
      served: Boolean(served),
      servedAt: served ? now : null,
      source: source || "user",
      updatedAt: now,
    };
    rec.mealSelections.push(selection);
  } else {
    selection.wanted = Boolean(wanted);
    selection.source = source || "user";
    if (served === undefined) {
      selection.served = false;
      selection.servedAt = null;
    } else {
      selection.served = Boolean(served);
      selection.servedAt = served ? now : null;
    }
    selection.updatedAt = now;
  }
  return selection;
}

/**
 * Record what a subscriber wants for a given meal/day (the app Yes/No).
 * Yes  -> the meal is reserved and one meal is taken from mealsRemaining.
 * No   -> reverses a previous Yes (before it was served), returning the meal.
 * The admin can still see the demand and mark it served.
 */
export async function setMealSelection(id, { date, meal, wanted, source = "user", note = "" } = {}) {
  const record = await loadRecord(id);
  if (!record) return { error: "NOT_FOUND" };

  const rec = record.kind === "mongo" ? record.doc : record.entry;
  const serviceDate = normalizeServiceDate(date);
  const mealType = normalizeMeal(meal);
  const nextWanted = Boolean(wanted);

  const gate = approvalGate(rec.status, rec.statusApproval);
  if (gate) return gate;
  if (rec.status === "Cancelled" || rec.status === "Rejected" || rec.status === "Completed") {
    return { error: "CLOSED", detail: rec.status };
  }
  if (isExpired(rec.endDate)) {
    rec.status = "Completed";
    const serialized = await saveRecord(record, "subscription:expired");
    return { error: "EXPIRED_PLAN", detail: { endDate: rec.endDate }, subscription: serialized };
  }

  const selection = findSelection(rec, serviceDate, mealType);
  const currentlyWanted = Boolean(selection && selection.wanted);
  if (currentlyWanted === nextWanted) {
    return { subscription: toSerializable(rec), changed: false, wanted: nextWanted, date: serviceDate, meal: mealType };
  }

  if (nextWanted) {
    if (Number(rec.mealsRemaining) <= 0) return { error: "NO_MEALS" };
    rec.mealsRemaining = Math.max(0, Number(rec.mealsRemaining) - 1);
    pushRedemption(rec, { serviceDate, meal: mealType, source, note });
  } else if (currentlyWanted) {
    rec.mealsRemaining = Math.min(Number(rec.mealsTotal) || Number(rec.mealsRemaining) + 1, Number(rec.mealsRemaining) + 1);
    removeRedemption(rec, { serviceDate, meal: mealType, source });
  }

  upsertSelection(rec, serviceDate, mealType, nextWanted, source, false);
  rec.status = computeNextStatus(rec.mealsRemaining, rec.status);

  const serialized = await saveRecord(record, "subscription:mealSelection");
  return { subscription: serialized, changed: true, wanted: nextWanted, date: serviceDate, meal: mealType };
}

/**
 * Admin/kitchen marks a meal as served for a subscriber. If the subscriber
 * already confirmed Yes for that meal/day it only flips the "served" flag
 * (no double count); otherwise it reserves and counts the meal.
 */
export async function serveMeal(id, { date, meal, note = "", source = "admin" } = {}) {
  const record = await loadRecord(id);
  if (!record) return { error: "NOT_FOUND" };

  const rec = record.kind === "mongo" ? record.doc : record.entry;
  const serviceDate = normalizeServiceDate(date);
  const mealType = normalizeMeal(meal);

  const gate = approvalGate(rec.status, rec.statusApproval);
  if (gate) return gate;
  if (rec.status === "Cancelled" || rec.status === "Rejected" || rec.status === "Completed") {
    return { error: "CLOSED", detail: rec.status };
  }
  if (isExpired(rec.endDate)) {
    rec.status = "Completed";
    const serialized = await saveRecord(record, "subscription:expired");
    return { error: "EXPIRED_PLAN", detail: { endDate: rec.endDate }, subscription: serialized };
  }

  const selection = findSelection(rec, serviceDate, mealType);
  if (selection && selection.wanted) {
    upsertSelection(rec, serviceDate, mealType, true, selection.source || source, true);
    const serialized = await saveRecord(record, "subscription:served");
    return { subscription: serialized, served: true, countedNow: false, date: serviceDate, meal: mealType };
  }

  if (Number(rec.mealsRemaining) <= 0) return { error: "NO_MEALS" };
  rec.mealsRemaining = Math.max(0, Number(rec.mealsRemaining) - 1);
  pushRedemption(rec, { serviceDate, meal: mealType, source, note });
  upsertSelection(rec, serviceDate, mealType, true, source, true);
  rec.status = computeNextStatus(rec.mealsRemaining, rec.status);

  const serialized = await saveRecord(record, "subscription:served");
  return { subscription: serialized, served: true, countedNow: true, date: serviceDate, meal: mealType };
}

/**
 * Admin increases/decreases the meals available for a subscriber without
 * touching the redemption history. Increasing also grows mealsTotal so the
 * "remaining <= total" invariant holds.
 */
export async function adjustMealsRemaining(id, delta) {
  const change = Math.trunc(Number(delta) || 0);
  if (!change) return { error: "INVALID_DELTA" };

  const record = await loadRecord(id);
  if (!record) return { error: "NOT_FOUND" };
  const rec = record.kind === "mongo" ? record.doc : record.entry;

  const nextRemaining = Math.max(0, Number(rec.mealsRemaining) + change);
  rec.mealsRemaining = nextRemaining;
  if (nextRemaining > Number(rec.mealsTotal)) rec.mealsTotal = nextRemaining;
  rec.status = computeNextStatus(rec.mealsRemaining, rec.status);

  const serialized = await saveRecord(record, "subscription:updated");
  return { subscription: serialized, changed: change };
}

/**
 * Daily demand snapshot for the admin kitchen: who wants Lunch/Dinner today,
 * how many meals to cook, and each subscriber's remaining balance.
 */
export async function getDailyDemand(date) {
  const serviceDate = normalizeServiceDate(date);
  const subscriptions = await listSubscriptions({});
  const active = subscriptions.filter((row) => row.status === "Active");

  const subscribers = active.map((row) => {
    const selections = Array.isArray(row.mealSelections) ? row.mealSelections : [];
    const pick = (meal) => selections.find((selection) => selection.date === serviceDate && selection.meal === meal) || null;
    const toView = (selection) =>
      selection
        ? { wanted: Boolean(selection.wanted), served: Boolean(selection.served) }
        : { wanted: false, served: false };
    return {
      _id: row._id,
      name: row.name,
      phone: row.phone,
      planType: row.planType,
      address: row.address,
      mealsRemaining: row.mealsRemaining,
      mealsTotal: row.mealsTotal,
      lunch: toView(pick("Lunch")),
      dinner: toView(pick("Dinner")),
    };
  });

  const summarize = (meal) => {
    const list = subscribers.filter((row) => row[meal].wanted);
    return {
      wanted: list.length,
      served: list.filter((row) => row[meal].served).length,
      pending: list.filter((row) => !row[meal].served).length,
      names: list.map((row) => row.name),
    };
  };

  return {
    date: serviceDate,
    lunch: summarize("lunch"),
    dinner: summarize("dinner"),
    subscribers,
  };
}