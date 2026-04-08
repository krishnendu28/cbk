import mongoose from "mongoose";
import { OutletSetting } from "../models/OutletSetting.js";
import { logger } from "../utils/logger.js";

const defaultSettings = {
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
};

const memorySettings = new Map();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeSettings(settings) {
  const source = settings || {};
  return {
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
