import * as mongoose from "mongoose";

export function autoFilterInactive(
  this: mongoose.Query<any, any>,
  next: () => void
) {
  this.where({ isActive: true });
  next();
}
