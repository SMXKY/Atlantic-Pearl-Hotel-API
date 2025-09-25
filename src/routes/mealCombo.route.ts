import express from "express";

import { mealComboControllers } from "../controllers/mealCombo.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";
import { handleFilesMiddleware } from "../middlewares/handleFiles.middleware";
import multer from "multer";

export const mealComboRouter = express.Router();
const upload = multer({ dest: "../upload" });

mealComboRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.mealCombos.create),
    upload.array("img", 1),
    handleFilesMiddleware,
    mealComboControllers.createMealCombo
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.mealCombos.readAll),
    mealComboControllers.readAllMealCombos
  );

mealComboRouter
  .route("/quick-daily-menu-toggle/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.mealCombos.update),
    mealComboControllers.quickUpdateDailyAvailability
  );

mealComboRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.mealCombos.readOne),
    mealComboControllers.readOneMealCombo
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.mealCombos.update),
    mealComboControllers.updateMealCombo
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.mealCombos.delete),
    mealComboControllers.deleteMealCombo
  );
