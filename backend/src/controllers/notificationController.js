import { randomUUID } from "crypto";
import { sendBroadcastPushNotification } from "../services/pushNotificationService.js";
import { getPushSubscriptionCount, registerPushSubscription } from "../services/pushSubscriptionService.js";
import { updateOutletSettings } from "../services/settingsService.js";
import { logger } from "../utils/logger.js";

const DEFAULT_OUTLET_ID = 1;
let lastBroadcastPushResult = null;

export async function registerDeviceTokenHandler(req, res) {
  try {
    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "unknown").trim().toLowerCase();
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;

    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }

    await registerPushSubscription({ token, platform, phone });
    logger.info("push_token.registered", { platform, phone: phone ? "***" : null, tokenLength: token.length });

    return res.status(201).json({
      ok: true,
      token,
    });
  } catch (error) {
    logger.error("push_token.registration_failed", { error: error?.message || String(error) });
    return res.status(500).json({ message: "Failed to register device token." });
  }
}

export async function broadcastNotificationHandler(req, res) {
  try {
    const message = String(req.body?.message || "").trim();
    const discountRate = req.body?.discountRate !== undefined && req.body?.discountRate !== null
      ? Math.min(100, Math.max(0, Number(req.body.discountRate) || 0))
      : 0;
    const discountCode = String(req.body?.discountCode || "").trim();
    const expiresInHours = req.body?.expiresInHours !== undefined ? Math.max(1, Number(req.body.expiresInHours) || 48) : 48;

    let promoUpdated = null;
    if (discountRate > 0) {
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      promoUpdated = await updateOutletSettings(DEFAULT_OUTLET_ID, {
        promoDiscountRate: discountRate,
        promoDiscountCode: discountCode,
        promoActive: true,
        promoExpiresAt: expiresAt.toISOString(),
      });
    }

    const pushContent = discountRate > 0
      ? discountCode
        ? `Use code ${discountCode} to get ${discountRate}% OFF on your next order from Chakhna by Kilo!`
        : `Enjoy ${discountRate}% OFF on your next order from Chakhna by Kilo!`
      : message;

    const notification = {
      id: randomUUID(),
      message: discountRate > 0 ? pushContent : message,
      createdAt: new Date().toISOString(),
    };

    const pushResult = await sendBroadcastPushNotification({
      title: discountRate > 0 ? `Special Offer: ${discountRate}% OFF` : "Message From Chakhna",
      body: pushContent,
      data: {
        type: discountRate > 0 ? "discount" : "broadcast_notification",
        notificationId: notification.id,
        ...(discountRate > 0
          ? {
              discountRate,
              discountCode,
              message: pushContent,
            }
          : {}),
      },
    });

    lastBroadcastPushResult = {
      ...pushResult,
      message,
      discountRate,
      discountCode,
      promoUpdated,
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json({
      ok: true,
      notification,
      promo: promoUpdated
        ? {
            discountRate: promoUpdated.promoDiscountRate,
            discountCode: promoUpdated.promoDiscountCode,
            promoActive: promoUpdated.promoActive,
            promoExpiresAt: promoUpdated.promoExpiresAt,
          }
        : null,
      push: pushResult,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send notification." });
  }
}

export async function getPushNotificationHealthHandler(_req, res) {
  try {
    const registeredDevices = await getPushSubscriptionCount();
    logger.info("push_notification.health_check", { registeredDevices });

    return res.json({
      ok: true,
      registeredDevices,
      lastBroadcast: lastBroadcastPushResult,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch push notification health." });
  }
}
