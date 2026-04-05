import { logger } from "../utils/logger.js";

export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    requestId: req.requestId,
  });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err?.statusCode || err?.status || 500;

  if (statusCode >= 500) {
    logger.error("request.error", {
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
      statusCode,
      error: err?.stack || err?.message || "Unknown error",
    });
  }

  res.status(statusCode).json({
    message: statusCode >= 500 ? "Internal server error" : err.message,
    requestId: req.requestId,
  });
}
