import { EventEmitter } from "events";
import { logger } from "../utils/logger.js";

const REAL_TIME_EVENTS = Object.freeze({
  MONTHLY_CHANGED: "monthly:changed",
});

/**
 * In-process event bus used by services to notify listeners about state
 * changes (e.g. a monthly subscription was created, a meal was redeemed).
 * Works in every deployment mode (long-running Node server, serverless,
 * local) because it only fans out to the current process.
 *
 * Socket.IO wire-up is optional and only meaningful when the backend runs
 * as a long-lived Node server:
 *
 *   import { attachSocketIO } from "./src/realtime/index.js";
 *   const io = attachSocketIO(httpServer);
 *
 * Built-in transports fall back to long-polling and CORS is aligned to the
 * REST CORS policy, so `socket.io-client` can connect from the admin app.
 */
export const realTimeHub = new EventEmitter();
realTimeHub.setMaxListeners(0);

export { REAL_TIME_EVENTS };

export function emitMonthlyChanged(reason, payload) {
  realTimeHub.emit(REAL_TIME_EVENTS.MONTHLY_CHANGED, {
    reason,
    at: new Date().toISOString(),
    payload,
  });
}

let ioInstance = null;

export async function attachSocketIO(server) {
  if (ioInstance) return ioInstance;

  try {
    const { Server } = await import("socket.io");
    const io = new Server(server, {
      path: "/socket",
      cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
      socket.on("monthly:subscribe", (channel) => {
        socket.join(typeof channel === "string" ? channel : "monthly");
      });
      socket.on("monthly:unsubscribe", (channel) => {
        socket.leave(typeof channel === "string" ? channel : "monthly");
      });
    });

    realTimeHub.on(REAL_TIME_EVENTS.MONTHLY_CHANGED, (event) => {
      io.to("monthly").emit(REAL_TIME_EVENTS.MONTHLY_CHANGED, event);
    });

    ioInstance = io;
    logger.info("realtime.socket_attached", { path: "/socket" });
  } catch (error) {
    logger.warn("realtime.socket_attach_failed", { reason: error?.message || String(error) });
  }

  return ioInstance;
}

export function getSocketIO() {
  return ioInstance;
}