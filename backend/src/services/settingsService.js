import mongoose from "mongoose";
import { OutletSetting } from "../models/OutletSetting.js";
import { logger } from "../utils/logger.js";

const defaultSettings = {
  discountEnabled: false,
  discountRate: 0,
  gstEnabled: true,
  gstRate: 5,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  loyaltyPointsPerRupee: 1,
  loyaltyRedemptionRate: 1,
  currencySymbol: "Rs",
  receiptFooter: "Thank you for visiting Chakhna by Kilo",
  printKotAutomatically: true,
  zomatoEnabled: false,
  swiggyEnabled: false,
  zomatoApiKey: null,
  swiggyApiKey: null,
  carbonTrackingEnabled: false,
  deliveryCharge: 10,
  etaMinutes: 45,
  orderWindows: [
    { name: "Lunch", start: "12:30", end: "17:30" },
    { name: "Dinner", start: "18:30", end: "23:30" },
  ],
  firstOrderDiscountEnabled: true,
  firstOrderDiscountRate: 15,
  promoDiscountRate: 0,
  promoDiscountCode: "",
  promoActive: false,
  promoExpiresAt: null,
};

const memorySettings = new Map();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeOrderWindows(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultSettings.orderWindows;
  }

  const windows = value
    .filter((entry) => entry && String(entry.start || "").match(/^\d{2}:\d{2}$/) && String(entry.end || "").match(/^\d{2}:\d{2}$/))
    .map((entry) => ({
      name: String(entry.name || "").trim() || "Slot",
      start: String(entry.start).trim(),
      end: String(entry.end).trim(),
    }));

  return windows.length > 0 ? windows : defaultSettings.orderWindows;
}

function normalizePromoExpiry(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSettings(settings) {
  const source = settings || {};
  return {
    discountEnabled: Boolean(source.discountEnabled),
    discountRate: Number(source.discountRate ?? 0),
    gstEnabled: Boolean(source.gstEnabled),
    gstRate: Number(source.gstRate ?? 0),
    serviceChargeEnabled: Boolean(source.serviceChargeEnabled),
    serviceChargeRate: Number(source.serviceChargeRate ?? 0),
    loyaltyPointsPerRupee: Number(source.loyaltyPointsPerRupee ?? 0),
    loyaltyRedemptionRate: Number(source.loyaltyRedemptionRate ?? 0),
    currencySymbol: String(source.currencySymbol ?? defaultSettings.currencySymbol),
    receiptFooter: String(source.receiptFooter ?? defaultSettings.receiptFooter),
    printKotAutomatically: Boolean(source.printKotAutomatically),
    zomatoEnabled: Boolean(source.zomatoEnabled),
    swiggyEnabled: Boolean(source.swiggyEnabled),
    zomatoApiKey: source.zomatoApiKey ? String(source.zomatoApiKey) : null,
    swiggyApiKey: source.swiggyApiKey ? String(source.swiggyApiKey) : null,
    carbonTrackingEnabled: Boolean(source.carbonTrackingEnabled),
    deliveryCharge: Number(source.deliveryCharge ?? defaultSettings.deliveryCharge),
    etaMinutes: Number(source.etaMinutes ?? defaultSettings.etaMinutes),
    orderWindows: normalizeOrderWindows(source.orderWindows),
    firstOrderDiscountEnabled: Boolean(source.firstOrderDiscountEnabled),
    firstOrderDiscountRate: Number(source.firstOrderDiscountRate ?? defaultSettings.firstOrderDiscountRate),
    promoDiscountRate: Number(source.promoDiscountRate ?? 0),
    promoDiscountCode: String(source.promoDiscountCode || "").trim(),
    promoActive: Boolean(source.promoActive),
    promoExpiresAt: normalizePromoExpiry(source.promoExpiresAt),
  };
}

function fromMemory(outletId) {
  return normalizeSettings(memorySettings.get(outletId) || defaultSettings);
}

export async function getOutletSettings(outletId) {
  if (!isMongoConnected()) {
    return fromMemory(outletId);
  }

  try {
    const doc = await OutletSetting.findOne({ outletId }).lean();
    if (!doc) {
      const created = await OutletSetting.create({ outletId, ...defaultSettings });
      const normalized = normalizeSettings(created.toObject());
      memorySettings.set(outletId, normalized);
      return normalized;
    }

    const normalized = normalizeSettings(doc);
    memorySettings.set(outletId, normalized);
    return normalized;
  } catch (error) {
    logger.warn("outlet_settings.mongo_fallback_memory", {
      reason: error?.message || String(error),
      outletId,
    });
    return fromMemory(outletId);
  }
}

export async function updateOutletSettings(outletId, patch) {
  const next = normalizeSettings({ ...fromMemory(outletId), ...patch });
  memorySettings.set(outletId, next);

  if (!isMongoConnected()) {
    return next;
  }

  try {
    const doc = await OutletSetting.findOneAndUpdate(
      { outletId },
      {
        $set: {
          ...next,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    const normalized = normalizeSettings(doc || next);
    memorySettings.set(outletId, normalized);
    return normalized;
  } catch (error) {
    logger.warn("outlet_settings.mongo_update_fallback_memory", {
      reason: error?.message || String(error),
      outletId,
    });
    return next;
  }
}
