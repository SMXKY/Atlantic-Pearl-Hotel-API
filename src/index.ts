import * as dotEnv from "dotenv";
import * as mongoose from "mongoose";

import { app } from "./app";
import { createDefaultDocuments } from "./defaults/documents.default";
import { activateUsersCronJob } from "./cron-jobs/activateUsers.cron";
import { freeRoomsCronJob } from "./cron-jobs/freeRooms.cron";

dotEnv.config();

//handling synchronous errors that might have slipped debugging testing
process.on("uncaughtException", (err) => {
  console.log("Uncaught Excetion Error...❌❌");
  console.log(err.name, err.message);
});

let db: string;

if (process.env.NODE_ENV === "production") {
  db = process.env.REMOTE_DB!;
} else {
  db = process.env.LOCAL_DB!;
  // db = process.env.REMOTE_DB!;
}

//Connecting our app to the database

mongoose
  .connect(db, {
    serverSelectionTimeoutMS: 20000,
  })
  .then(() => {
    console.log("Successfull db connection.✅✅");
  })
  .catch((err) => {
    console.log("Error connecting to database: ", err);
  });

createDefaultDocuments().catch((err: any) => {
  console.log("Error: Creating default documents", err);
});

activateUsersCronJob();
freeRoomsCronJob();

const port: number = Number(process.env.PORT) || 3000;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`App is up and running on port: ${port}`);
});

//handling asynchronous errors that might have slipped debuging and testing
process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection Error...❌❌");
  console.log(err);
});
