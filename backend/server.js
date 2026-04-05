import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import app from "./src/app.js";
import { initSocket } from "./src/config/socket.js";
import { setMongoEnabled } from "./src/services/orderService.js";
import { logger } from "./src/utils/logger.js";

dotenv.config();

const server = http.createServer(app);
initSocket(server);

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI;
const MAX_PORT_RETRIES = 10;
let shuttingDown = false;

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

async function startServer() {
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      setMongoEnabled(true);
      logger.info("database.connected", { provider: "mongo" });
    } catch (error) {
      setMongoEnabled(false);
      logger.warn("database.fallback_memory", { reason: error.message });
    }
  } else {
    setMongoEnabled(false);
    logger.warn("database.memory_mode", { reason: "MONGO_URI not set" });
  }

  listenWithFallback(PORT);
}

function listenWithFallback(port, retries = 0) {
  const onError = (error) => {
    server.off("listening", onListening);

    if (error && error.code === "EADDRINUSE" && retries < MAX_PORT_RETRIES) {
      const nextPort = port + 1;
      logger.warn("server.port_busy_retry", { port, nextPort });
      listenWithFallback(nextPort, retries + 1);
      return;
    }

    logger.error("server.startup_error", { error: error?.message || String(error) });
    process.exit(1);
  };

  const onListening = () => {
    server.off("error", onError);
    const address = server.address();
    const boundPort = address && typeof address === "object" ? address.port : port;
    logger.info("server.started", { port: boundPort });
  };

  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(port);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server.shutdown_requested", { signal });

  server.close(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("server.shutdown_timeout", { timeoutMs: 10000 });
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error("process.unhandled_rejection", { reason: String(reason) });
});

process.on("uncaughtException", (error) => {
  logger.error("process.uncaught_exception", { error: error?.stack || error?.message || String(error) });
  process.exit(1);
});

startServer();
