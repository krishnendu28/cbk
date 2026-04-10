import { PushSubscription } from "../models/PushSubscription.js";
import { logger } from "../utils/logger.js";

const memoryTokens = new Map();
let useMongo = false;

function normalizeToken(value) {
  return String(value || "").trim();
}

function toMemorySubscription({ token, platform = "unknown", phone = null }) {
  return {
    token,
    platform,
    phone,
    lastSeenAt: new Date(),
  };
}

async function withMongoFallback(operationName, mongoOperation, memoryOperation) {
  if (!useMongo) return memoryOperation();

  try {
    return await mongoOperation();
  } catch (error) {
    useMongo = false;
    logger.warn("push_subscription.mongo_fallback_memory", {
      operation: operationName,
      reason: error?.message || String(error),
    });
    return memoryOperation();
  }
}

export function setPushSubscriptionsMongoEnabled(enabled) {
  useMongo = Boolean(enabled);
}

export async function registerPushSubscription({ token, platform = "unknown", phone = null }) {
  const normalizedToken = normalizeToken(token);

  return withMongoFallback(
    "registerPushSubscription",
    () =>
      PushSubscription.findOneAndUpdate(
        { token: normalizedToken },
        {
          token: normalizedToken,
          platform,
          phone: phone || null,
          lastSeenAt: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      ),
    () => {
      memoryTokens.set(normalizedToken, toMemorySubscription({ token: normalizedToken, platform, phone }));
      return memoryTokens.get(normalizedToken);
    },
  );
}

export async function listPushSubscriptionTokens() {
  return withMongoFallback(
    "listPushSubscriptionTokens",
    async () => {
      const subscriptions = await PushSubscription.find({}, { token: 1, _id: 0 }).lean();
      return subscriptions.map((entry) => normalizeToken(entry.token)).filter(Boolean);
    },
    () => Array.from(memoryTokens.keys()),
  );
}

export async function getPushSubscriptionCount() {
  return withMongoFallback(
    "getPushSubscriptionCount",
    () => PushSubscription.countDocuments({}),
    () => memoryTokens.size,
  );
}

export async function removePushSubscriptionsByTokens(tokens = []) {
  const uniqueTokens = [...new Set(tokens.map(normalizeToken).filter(Boolean))];
  if (uniqueTokens.length === 0) return;

  await withMongoFallback(
    "removePushSubscriptionsByTokens",
    () => PushSubscription.deleteMany({ token: { $in: uniqueTokens } }),
    () => {
      uniqueTokens.forEach((token) => memoryTokens.delete(token));
      return null;
    },
  );
}
