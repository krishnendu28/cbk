import mongoose from "mongoose";
import { ShopSetting } from "../models/ShopSetting.js";
import { logger } from "../utils/logger.js";

const ORDERING_KEY = "ordering";

let memoryOrderingStatus = {
  isOrderingOpen: true,
  updatedAt: new Date(),
};

function formatStatus(status) {
  return {
    isOrderingOpen: Boolean(status?.isOrderingOpen),
    updatedAt: status?.updatedAt ? new Date(status.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export async function getOrderingStatus() {
  if (!isMongoConnected()) {
    return formatStatus(memoryOrderingStatus);
  }

  try {
    const doc = await ShopSetting.findOne({ key: ORDERING_KEY });
    if (!doc) {
      const created = await ShopSetting.create({ key: ORDERING_KEY, isOrderingOpen: true, updatedAt: new Date() });
      memoryOrderingStatus = { isOrderingOpen: created.isOrderingOpen, updatedAt: created.updatedAt };
      return formatStatus(created);
    }

    memoryOrderingStatus = { isOrderingOpen: doc.isOrderingOpen, updatedAt: doc.updatedAt };
    return formatStatus(doc);
  } catch (error) {
    logger.warn("shop_settings.mongo_fallback_memory", {
      reason: error?.message || String(error),
    });
    return formatStatus(memoryOrderingStatus);
  }
}

export async function setOrderingStatus(isOrderingOpen) {
  const next = {
    isOrderingOpen: Boolean(isOrderingOpen),
    updatedAt: new Date(),
  };

  memoryOrderingStatus = next;

  if (!isMongoConnected()) {
    return formatStatus(next);
  }

  try {
    const doc = await ShopSetting.findOneAndUpdate(
      { key: ORDERING_KEY },
      {
        $set: {
          isOrderingOpen: next.isOrderingOpen,
          updatedAt: next.updatedAt,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return formatStatus(doc || next);
  } catch (error) {
    logger.warn("shop_settings.mongo_update_fallback_memory", {
      reason: error?.message || String(error),
    });
    return formatStatus(next);
  }
}
