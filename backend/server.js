import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import app from "./src/app.js";
import { initSocket } from "./src/config/socket.js";
import { setMongoEnabled } from "./src/services/orderService.js";

dotenv.config();

const server = http.createServer(app);
initSocket(server);

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI;
const MAX_PORT_RETRIES = 10;

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

async function startServer() {
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      setMongoEnabled(true);
      console.log("MongoDB connected");
    } catch (error) {
      setMongoEnabled(false);
      console.warn("MongoDB unavailable. Falling back to in-memory order storage.");
      console.warn(`Mongo error: ${error.message}`);
    }
  } else {
    setMongoEnabled(false);
    console.warn("MONGO_URI not set. Running with in-memory order storage.");
  }

  listenWithFallback(PORT);
}

function listenWithFallback(port, retries = 0) {
  const onError = (error) => {
    server.off("listening", onListening);

    if (error && error.code === "EADDRINUSE" && retries < MAX_PORT_RETRIES) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${nextPort}...`);
      listenWithFallback(nextPort, retries + 1);
      return;
    }

    console.error("Startup error:", error?.message || error);
    process.exit(1);
  };

  const onListening = () => {
    server.off("error", onError);
    const address = server.address();
    const boundPort = address && typeof address === "object" ? address.port : port;
    console.log(`Backend running on http://localhost:${boundPort}`);
  };

  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(port);
}

startServer();
