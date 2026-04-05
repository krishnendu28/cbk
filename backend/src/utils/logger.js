function sanitizeMeta(meta = {}) {
  const next = { ...meta };

  if (next.authorization) {
    next.authorization = "[REDACTED]";
  }

  if (next.mongoose) {
    next.mongoose = "[REDACTED]";
  }

  return next;
}

function emit(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeMeta(meta),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (message, meta) => emit("info", message, meta),
  warn: (message, meta) => emit("warn", message, meta),
  error: (message, meta) => emit("error", message, meta),
};
