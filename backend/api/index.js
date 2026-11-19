import mongoose from "mongoose";
import app from "../src/app.js";
import { loadMenuStateFromDb, flushMenuPersistence } from "../src/services/menuService.js";
import {
  ensureInventoryLoaded,
  flushInventoryPersistence,
} from "../src/services/inventoryService.js";
import { setMongoEnabled } from "../src/services/orderService.js";
import { setPushSubscriptionsMongoEnabled } from "../src/services/pushSubscriptionService.js";

const MONGO_URI = process.env.MONGO_URI;

function markMongo(ok) {
  setMongoEnabled(ok);
  setPushSubscriptionsMongoEnabled(ok);
  return ok;
}

async function connectMongo() {
  if (!MONGO_URI) return false;
  if (mongoose.connection.readyState === 1) return markMongo(true);

  try {
    await mongoose.connect(MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
    });
  } catch (error) {
    console.warn("vercel.mongo_connect_failed", error?.message || String(error));
    return markMongo(false);
  }

  return markMongo(mongoose.connection.readyState === 1);
}

if (!globalThis.__cbkBackendInit) {
  globalThis.__cbkBackendInit = (async () => {
    await connectMongo();
    await ensureInventoryLoaded();
  })().catch((error) => {
    console.error("vercel.initialize_failed", error?.message || String(error));
    globalThis.__cbkBackendInit = null;
    throw error;
  });
}

export default async function handler(req, res) {
  await globalThis.__cbkBackendInit;

  // Vercel can recycle the underlying Mongo socket while keeping this module
  // warm. Reconnect and re-read from MongoDB on every request so an admin edit
  // is never shadowed by a stale in-memory cache or the bundled seed menu.
  let dbOk = await connectMongo();
  if (dbOk) {
    try {
      await loadMenuStateFromDb();
    } catch (error) {
      console.warn("vercel.menu_reload_retry", error?.message || String(error));
      dbOk = await connectMongo();
      if (dbOk) {
        try {
          await loadMenuStateFromDb();
        } catch (retryError) {
          console.warn("vercel.menu_reload_failed", retryError?.message || String(retryError));
        }
      }
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("x-cbk-db", dbOk ? "mongo" : "memory");

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
