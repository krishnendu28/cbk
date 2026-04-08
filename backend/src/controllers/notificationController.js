import { randomUUID } from "crypto";
import { getIO } from "../config/socket.js";

export async function broadcastNotificationHandler(req, res) {
  try {
    const message = String(req.body?.message || "").trim();

    const notification = {
      id: randomUUID(),
      message,
      createdAt: new Date().toISOString(),
    };

    getIO().emit("broadcast_notification", notification);

    return res.status(201).json({
      ok: true,
      notification,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send notification." });
  }
}
