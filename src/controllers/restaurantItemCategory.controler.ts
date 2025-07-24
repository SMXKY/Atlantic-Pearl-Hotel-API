import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantItemCategoryModel } from "../models/RestaurantItemCategory.model";

const CRUDRestaurantItemCategory: CRUD = new CRUD(RestaurantItemCategoryModel);

const createRestaurantItemCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItemCategory.create(req.body, res, req);
  }
);

const readOneRestaurantItemCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItemCategory.readOne(req.params.id, res, [], req);
  }
);

const readAllRestaurantItemCategorys = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItemCategory.readAll(res, req, 1, 100, []);
  }
);

const updateRestaurantItemCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItemCategory.update(req.params.id, res, req);
  }
);

const deleteRestaurantItemCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantItemCategory.delete(req.params.id, res, req);
  }
);

export const restaurantItemCategoryControllers = {
  createRestaurantItemCategory,
  readOneRestaurantItemCategory,
  readAllRestaurantItemCategorys,
  updateRestaurantItemCategory,
  deleteRestaurantItemCategory,
};
