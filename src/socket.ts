import { Server } from "socket.io";

import { allowedIps } from "./util/allowedIps.util";

// Created without an HTTP server so models and controllers can import it
// without starting the app; index.ts attaches it to the HTTP server.
export const io = new Server({
  cors: { origin: "*" },
});

io.use((socket, next) => {
  const clientIp =
    socket.handshake.headers["x-forwarded-for"]
      ?.toString()
      .split(",")[0]
      .trim() || socket.handshake.address;

  if (!clientIp || !allowedIps.includes(clientIp)) {
    console.log(`Socket connection rejected from IP: ${clientIp}`);
    return next(new Error("Access denied: IP not allowed"));
  }

  next();
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id} (${socket.handshake.address})`);

  // Example: client sends their userId in handshake auth
  const userId = socket.handshake.auth.userId;

  if (userId) {
    socket.join(userId.toString()); // private room for this user
    console.log(`User ${userId} joined their private room`);
  }

  // Keep your existing joinRoom logic
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
