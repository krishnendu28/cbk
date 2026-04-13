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
    return {
      targeted: 0,
      sent: 0,
      failed: 0,
      invalidRemoved: 0,
      accessTokenConfigured: Boolean(String(process.env.EXPO_ACCESS_TOKEN || "").trim()),
      errors: [{ source: "server", code: "NO_VALID_TOKENS", message: "No valid Expo tokens found." }],
    };
  }

  const chunks = chunk(tokens, 100);
  const invalidDeviceTokens = new Set();
  let sent = 0;
  let failed = 0;
  const errors = [];

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
        failed += tokenChunk.length;
        errors.push({
          source: "expo_http",
          code: `HTTP_${response.status}`,
          message: failureBody.slice(0, 300),
        });
        logger.warn("push.expo_http_error", {
          status: response.status,
          body: failureBody.slice(0, 500),
        });
        continue;
      }

      const payload = await response.json();
      const tickets = Array.isArray(payload?.data) ? payload.data : [];

      tickets.forEach((ticket, index) => {
        if (ticket?.status === "ok") {
          sent += 1;
          return;
        }

        failed += 1;
        const errorCode = String(ticket?.details?.error || ticket?.message || "UNKNOWN");
        const errorMessage = String(ticket?.message || "Expo push ticket returned an error");
        errors.push({ source: "expo_ticket", code: errorCode, message: errorMessage });

        if (ticket?.details?.error === "DeviceNotRegistered") {
          invalidDeviceTokens.add(tokenChunk[index]);
        }
      });
    } catch (error) {
      failed += tokenChunk.length;
      errors.push({
        source: "expo_request",
        code: "REQUEST_FAILED",
        message: error?.message || String(error),
      });
      logger.warn("push.expo_request_failed", {
        reason: error?.message || String(error),
      });
    }
  }

  if (invalidDeviceTokens.size > 0) {
    await removePushSubscriptionsByTokens(Array.from(invalidDeviceTokens));
  }

  return {
    targeted: tokens.length,
    sent,
    failed,
    invalidRemoved: invalidDeviceTokens.size,
    accessTokenConfigured: Boolean(String(process.env.EXPO_ACCESS_TOKEN || "").trim()),
    errors: errors.slice(0, 10),
  };
}
