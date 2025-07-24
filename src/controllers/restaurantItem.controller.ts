import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantItemModel } from "../models/RestaurantItem.model";

const CRUDRestaurantItem: CRUD = new CRUD(RestaurantItemModel);

const createRestaurantItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItem.create(req.body, res, req);
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

export const restaurantItemControllers = {
  createRestaurantItem,
  readOneRestaurantItem,
  readAllRestaurantItems,
  updateRestaurantItem,
  deleteRestaurantItem,
};
