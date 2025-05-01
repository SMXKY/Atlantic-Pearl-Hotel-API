import express from "express";

import { positionControllers } from "../controllers/position.controller";

export const positionRouter = express.Router();

positionRouter
  .route("/")
  .post(positionControllers.createPosition)
  .get(positionControllers.readAllPositions);

positionRouter
  .route("/:id")
  .get(positionControllers.readOnePosition)
  .patch(positionControllers.updatePosition)
  .delete(positionControllers.deletePosition);
