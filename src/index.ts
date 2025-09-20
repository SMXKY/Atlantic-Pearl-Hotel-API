import * as dotEnv from "dotenv";
import * as mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";

import { app } from "./app";
import { createDefaultDocuments } from "./defaults/documents.default";
import { activateUsersCronJob } from "./cron-jobs/activateUsers.cron";
import {
  freeRoomsCronJob,
  freeRoomsOnReserationStatus,
} from "./cron-jobs/freeRooms.cron";
import { setupSuperAdmin } from "./defaults/superAdmin.default";

dotEnv.config();

process.on("uncaughtException", (err) => {
  console.log("Uncaught Excetion Error...❌❌");
  console.log(err.name, err.message);
});

let db: string;
if (process.env.NODE_ENV === "production") {
  db = process.env.REMOTE_DB!;
} else {
  db = process.env.LOCAL_DB!;
}

mongoose
  .connect(db, { serverSelectionTimeoutMS: 20000 })
  .then(() => console.log("Successfull db connection.✅✅"))
  .catch((err) => console.log("Error connecting to database: ", err));

createDefaultDocuments().catch((err: any) =>
  console.log("Error: Creating default documents", err)
);

activateUsersCronJob();
freeRoomsCronJob();
setupSuperAdmin();
freeRoomsOnReserationStatus();

const port: number = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`App is up and running on port: ${port}`);
});

export const io = new Server(server, {
  cors: { origin: "*" },
});

const allowedIps = [
  "123.45.67.89",
  "98.76.54.32",
  "127.0.0.1",
  "31.97.113.198",
];

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

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection Error...❌❌");
  console.log(err);
});
