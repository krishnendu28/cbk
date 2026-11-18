import mongoose from "mongoose";
import app from "../src/app.js";
import {
  ensureMenuLoaded,
  ensureMenuFresh,
  flushMenuPersistence,
} from "../src/services/menuService.js";
import {
  ensureInventoryLoaded,
  flushInventoryPersistence,
} from "../src/services/inventoryService.js";
import { setMongoEnabled } from "../src/services/orderService.js";
import { setPushSubscriptionsMongoEnabled } from "../src/services/pushSubscriptionService.js";

const MONGO_URI = process.env.MONGO_URI;

async function initialize() {
  if (MONGO_URI && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(MONGO_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
      });
    } catch (error) {
      console.warn("vercel.mongo_connect_failed", error?.message || String(error));
    }
  }

  const mongoReady = mongoose.connection.readyState === 1;
  setMongoEnabled(mongoReady);
  setPushSubscriptionsMongoEnabled(mongoReady);

  await ensureMenuLoaded();
  await ensureInventoryLoaded();

  return mongoReady;
}

if (!globalThis.__cbkBackendInit) {
  globalThis.__cbkBackendInit = initialize().catch((error) => {
    console.error("vercel.initialize_failed", error?.message || String(error));
    globalThis.__cbkBackendInit = null;
    throw error;
  });
}

export default async function handler(req, res) {
  await globalThis.__cbkBackendInit;

  // Warm containers can serve stale data after an admin edit on another instance.
  try {
    await ensureMenuFresh();
  } catch (error) {
    console.warn("vercel.menu_refresh_failed", error?.message || String(error));
  }

  try {
    return await app(req, res);
  } finally {
    try {
      await flushMenuPersistence();
      await flushInventoryPersistence();
    } catch (error) {
      console.warn("vercel.flush_failed", error?.message || String(error));
    }
  }
}
