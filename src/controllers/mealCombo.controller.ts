import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { MealComboModel } from "../models/MealCombo.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { logUserActivity } from "../util/logUserActivity.util";
import { appResponder } from "../util/appResponder.util";
import { handleFileUploads } from "../external-apis/ftpServer";

const CRUDMealCombo: CRUD = new CRUD(MealComboModel);

const createMealCombo = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.img = "https://image.url";

    const combo = new MealComboModel(req.body);
    await combo.validate();

    const comboImageUrl = await handleFileUploads(req, 2, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    combo.img = comboImageUrl[0];

    await combo.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} created a meal combo`,
      "meal_combos",
      (combo as any)._id.toString(),
      "",
      JSON.stringify(combo)
    );
    appResponder(StatusCodes.OK, { mealCombo: combo }, res);
    // await CRUDMealCombo.create(req.body, res, req);
  }
);

const readOneMealCombo = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDMealCombo.readOne(req.params.id, res, ["items"], req);
  }
);

const readAllMealCombos = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const combos = await MealComboModel.find().populate("items").lean();

    const combosWithTotals = combos.map((combo) => {
      if (!combo.items)
        return { ...combo, priceInCFA: 0, prepTimeInMinutes: 0 };

      const priceInCFA = combo.items.reduce(
        (sum: number, item: any) => sum + (item.priceInCFA || 0),
        0
      );
      const prepTimeInMinutes = combo.items.reduce(
        (sum: number, item: any) => sum + (item.prepTimeInMinutes || 0),
        0
      );

      return { ...combo, priceInCFA, prepTimeInMinutes };
    });

    appResponder(StatusCodes.OK, combosWithTotals, res);
  }
);

const updateMealCombo = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDMealCombo.update(req.params.id, res, req);
  }
);

const deleteMealCombo = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDMealCombo.delete(req.params.id, res, req);
  }
);

const quickUpdateDailyAvailability = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return next(
        new AppError(
          "Meal combo id is required to toggle daily availability",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const item = await MealComboModel.findById(id);

    if (!item) {
      return next(
        new AppError(
          "Invalid meal combo id, or meal combo no longer exists",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const itemBefore = { ...item?.toObject() };

    item.availableToday = !item.availableToday;
    await item.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} toggle meal combo availability`,
      "meal_combos",
      (item as any)._id.toString(),
      JSON.stringify(itemBefore),
      JSON.stringify(item)
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Item: ${item.name}'s availability has been toggled successfully.`,
        data: {
          availableToday: item.availableToday,
        },
      },
      res
    );
  }
);

export const mealComboControllers = {
  createMealCombo,
  readOneMealCombo,
  readAllMealCombos,
  updateMealCombo,
  deleteMealCombo,
  quickUpdateDailyAvailability,
};
