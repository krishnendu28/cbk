import { logger } from "../utils/logger.js";
import { listPushSubscriptionTokens, removePushSubscriptionsByTokens } from "./pushSubscriptionService.js";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_PATTERN = /^(Expo|Exponent)PushToken\[[^\]]+\]$/;

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function buildExpoHeaders() {
  const headers = {
    Accept: "application/json",
    "Accept-encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };

  const accessToken = String(process.env.EXPO_ACCESS_TOKEN || "").trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export function isValidExpoPushToken(token) {
  return EXPO_TOKEN_PATTERN.test(String(token || "").trim());
}

export async function sendBroadcastPushNotification({ title, body, data = {} }) {
  const allTokens = await listPushSubscriptionTokens();
  const tokens = allTokens.filter(isValidExpoPushToken);

  if (tokens.length === 0) {
    return { sent: 0, invalidRemoved: 0 };
  }

  const chunks = chunk(tokens, 100);
  const invalidDeviceTokens = new Set();
  let sent = 0;

  for (const tokenChunk of chunks) {
    const messages = tokenChunk.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "broadcast",
    }));

    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: buildExpoHeaders(),
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const failureBody = await response.text();
        logger.warn("push.expo_http_error", {
          status: response.status,
          body: failureBody.slice(0, 500),
        });
        continue;
      }

      const payload = await response.json();
      const tickets = Array.isArray(payload?.data) ? payload.data : [];
      sent += tickets.length;

      tickets.forEach((ticket, index) => {
        if (ticket?.status !== "error") return;
        if (ticket?.details?.error === "DeviceNotRegistered") {
          invalidDeviceTokens.add(tokenChunk[index]);
        }
      });
    } catch (error) {
      logger.warn("push.expo_request_failed", {
        reason: error?.message || String(error),
      });
    }
  }

  if (invalidDeviceTokens.size > 0) {
    await removePushSubscriptionsByTokens(Array.from(invalidDeviceTokens));
  }

  return {
    sent,
    invalidRemoved: invalidDeviceTokens.size,
  };
}
