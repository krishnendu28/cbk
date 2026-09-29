import mongoose from "mongoose";
import { MonthlyBroadcast } from "../models/MonthlyBroadcast.js";
import { logger } from "../utils/logger.js";

let memoryBroadcast = null;

function serialize(doc) {
  if (!doc) return null;
  return {
    message: doc.message,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
  };
}

export async function getBroadcast() {
  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await MonthlyBroadcast.findOne({ key: "main" });
      return serialize(doc) || null;
    } catch (error) {
      logger.warn("broadcast.mongo_read_fallback_memory", { reason: error?.message || String(error) });
      return memoryBroadcast;
    }
  }
  return memoryBroadcast;
}

export async function setBroadcast(message) {
  const text = String(message || "").trim().slice(0, 1000);
  const updatedAt = new Date();

  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await MonthlyBroadcast.findOneAndUpdate(
        { key: "main" },
        { key: "main", message: text, updatedAt },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return serialize(doc);
    } catch (error) {
      logger.warn("broadcast.mongo_write_fallback_memory", { reason: error?.message || String(error) });
    }
  }

  memoryBroadcast = { message: text, updatedAt: updatedAt.toISOString() };
  return memoryBroadcast;
}

export async function clearBroadcast() {
  if (mongoose.connection.readyState === 1) {
    try {
      await MonthlyBroadcast.deleteOne({ key: "main" });
    } catch (error) {
      logger.warn("broadcast.mongo_clear", { reason: error?.message || String(error) });
    }
  }
  memoryBroadcast = null;
  return { ok: true };
}