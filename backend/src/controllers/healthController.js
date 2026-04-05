import { isMongoEnabled } from "../services/orderService.js";

export function getHealth(_req, res) {
  res.json({
    ok: true,
    service: "chakhna-backend",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: isMongoEnabled() ? "mongo" : "memory",
  });
}
