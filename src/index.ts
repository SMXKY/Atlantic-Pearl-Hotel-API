import * as dotEnv from "dotenv";
import * as mongoose from "mongoose";

import { app } from "./app";
import { io } from "./socket";
import { createDefaultDocuments } from "./defaults/documents.default";
import { activateUsersCronJob } from "./cron-jobs/activateUsers.cron";
import { stockTakeSchedulerJob } from "./cron-jobs/stockTakeScheduler.cron";
import { overduePoCheckerJob } from "./cron-jobs/overduePoChecker.cron";

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
stockTakeSchedulerJob();
overduePoCheckerJob();

const port: number = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`App is up and running on port: ${port}`);
});

io.attach(server);

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection Error...❌❌");
  console.log(err);
});
