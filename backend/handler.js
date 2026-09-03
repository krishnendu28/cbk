import serverless from "serverless-http";
import mongoose from "mongoose";
import app from "./src/app.js";
import { ensureMenuLoaded, flushMenuPersistence } from "./src/services/menuService.js";
import { ensureInventoryLoaded, flushInventoryPersistence } from "./src/services/inventoryService.js";
import { setMongoEnabled } from "./src/services/orderService.js";
import { setPushSubscriptionsMongoEnabled } from "./src/services/pushSubscriptionService.js";
import { logger } from "./src/utils/logger.js";

const MONGO_URI = process.env.MONGO_URI;

let connectionPromise = null;
let initializationPromise = null;

async function ensureDatabase() {
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    if (MONGO_URI && mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(MONGO_URI, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5000,
        });
        setMongoEnabled(true);
        setPushSubscriptionsMongoEnabled(true);
        logger.info("database.connected", { provider: "mongo" });
      } catch (error) {
        setMongoEnabled(false);
        setPushSubscriptionsMongoEnabled(false);
        logger.warn("database.fallback_memory", { reason: error?.message || String(error) });
      }
    } else if (mongoose.connection.readyState === 1) {
      setMongoEnabled(true);
      setPushSubscriptionsMongoEnabled(true);
    } else {
      setMongoEnabled(false);
      setPushSubscriptionsMongoEnabled(false);
    }
  })();

  try {
    await connectionPromise;
  } catch {
    // consumed below
  }
  return connectionPromise;
}

async function initialize() {
  await ensureDatabase();
  await ensureMenuLoaded();
  await ensureInventoryLoaded();
}

const handler = serverless(app, {
  request: async (req) => {
    if (!initializationPromise) {
      initializationPromise = initialize().catch((error) => {
        logger.error("lambda.initialize_failed", { reason: error?.message || String(error) });
        initializationPromise = null;
      });
    }
    await initializationPromise;
    return req;
  },
  response: async (res) => {
    try {
      await flushMenuPersistence();
      await flushInventoryPersistence();
    } catch (error) {
      logger.warn("lambda.flush_failed", { reason: error?.message || String(error) });
    }
    return res;
  },
});

export { handler };
