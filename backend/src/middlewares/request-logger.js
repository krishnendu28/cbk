import { logger } from "../utils/logger.js";

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(durationNs) / 1_000_000;
    const meta = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    if (res.statusCode >= 500) {
      logger.error("request.completed", meta);
      return;
    }
    if (res.statusCode >= 400) {
      logger.warn("request.completed", meta);
      return;
    }

    logger.info("request.completed", meta);
  });

  next();
}
