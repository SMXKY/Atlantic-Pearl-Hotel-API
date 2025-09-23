import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantItemModel } from "../models/RestaurantItem.model";
import { handleFileUploads } from "../external-apis/ftpServer";
import { appResponder } from "../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { appendFile } from "fs";
import { logUserActivity } from "../util/logUserActivity.util";

const CRUDRestaurantItem: CRUD = new CRUD(RestaurantItemModel);

const createRestaurantItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.imageUrl = "https://image.url";

    const restaurantItem = new RestaurantItemModel(req.body);
    await restaurantItem.validate();

    const restaurantItemImageUrl = await handleFileUploads(req, 2, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    restaurantItem.imageUrl = restaurantItemImageUrl[0];

    await restaurantItem.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.use.name} created a new restraurant Item`,
      "restaurant_items",
      restaurantItem._id.toString(),
      "",
      JSON.stringify(restaurantItem)
    );
    appResponder(StatusCodes.OK, { restaurantItem }, res);
  }
);

const readOneRestaurantItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItem.readOne(req.params.id, res, [], req);
  }
);

const readAllRestaurantItems = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItem.readAll(res, req, 1, 100, []);
  }
);

const updateRestaurantItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItem.update(req.params.id, res, req);
  }
);

const deleteRestaurantItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItem.delete(req.params.id, res, req);
  }
);

const quickUpdateDailyAvailability = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return next(
        new AppError(
          "Restaurant item id is required to toggle daily availability",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const item = await RestaurantItemModel.findById(id);

    const itemBefore = { ...item?.toObject() };

    if (!item) {
      return next(
        new AppError(
          "Invalid Restaurant item id, or restaurant item no longer exists",
          StatusCodes.NOT_FOUND
        )
      );
    }

    item.availableToday = !item.availableToday;
    await item.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.use.name} toggle restaurant item availability`,
      "restaurant_items",
      item._id.toString(),
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

export const restaurantItemControllers = {
  createRestaurantItem,
  readOneRestaurantItem,
  readAllRestaurantItems,
  updateRestaurantItem,
  deleteRestaurantItem,
  quickUpdateDailyAvailability,
};
