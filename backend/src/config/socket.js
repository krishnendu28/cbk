import { Server as SocketIOServer } from "socket.io";
import { socketCorsOptions } from "./cors.js";

let ioInstance;

export function initSocket(server) {
  ioInstance = new SocketIOServer(server, {
    cors: socketCorsOptions,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  ioInstance.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Emit a connection acknowledgement
    socket.emit("connection_acknowledged", {
      message: "Connected to server",
      timestamp: new Date().toISOString(),
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO is not initialized.");
  }
  return ioInstance;
}
