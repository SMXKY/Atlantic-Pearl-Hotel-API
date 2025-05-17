import cron from "node-cron";
import { UserModel } from "../models/User.model";

export const activateUsersCronJob = () => {
  cron.schedule("*/2 * * * *", async () => {
    const now = new Date();

    const result = await UserModel.updateMany(
      { isActive: false, deactivatedUntil: { $lte: now } },
      { $set: { isActive: true }, $unset: { deactivatedUntil: "" } }
    );

    console.log(`Reactivated ${result.modifiedCount} users`);
  });
};
