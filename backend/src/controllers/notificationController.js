import { randomUUID } from "crypto";
import { getIO } from "../config/socket.js";
import { sendBroadcastPushNotification } from "../services/pushNotificationService.js";
import { getPushSubscriptionCount, registerPushSubscription } from "../services/pushSubscriptionService.js";

let lastBroadcastPushResult = null;

export async function registerDeviceTokenHandler(req, res) {
  try {
    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "unknown").trim().toLowerCase();
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;

    await registerPushSubscription({ token, platform, phone });

    return res.status(201).json({
      ok: true,
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to register device token." });
  }
}

export async function broadcastNotificationHandler(req, res) {
  try {
    const message = String(req.body?.message || "").trim();

    const notification = {
      id: randomUUID(),
      message,
      createdAt: new Date().toISOString(),
    };

    getIO().emit("broadcast_notification", notification);
    const pushResult = await sendBroadcastPushNotification({
      title: "Message From Chakhna",
      body: message,
      data: {
        type: "broadcast_notification",
        notificationId: notification.id,
      },
    });

    lastBroadcastPushResult = {
      ...pushResult,
      message,
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json({
      ok: true,
      notification,
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
