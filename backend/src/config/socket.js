import { Server as SocketIOServer } from "socket.io";
import { socketCorsOptions } from "./cors.js";

let ioInstance;

export function initSocket(server) {
  ioInstance = new SocketIOServer(server, {
    cors: socketCorsOptions,
  });

  ioInstance.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
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
