import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantCartItemModel } from "../models/RestaurantCartItem.model";

const CRUDRestaurantCartItem: CRUD = new CRUD(RestaurantCartItemModel);

const createRestaurantCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCartItem.create(req.body, res, req);
  }
);

const readOneRestaurantCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCartItem.readOne(req.params.id, res, [], req);
  }
);

const readAllRestaurantCartItems = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCartItem.readAll(res, req, 1, 100, []);
  }
);

const updateRestaurantCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCartItem.update(req.params.id, res, req);
  }
);

const deleteRestaurantCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCartItem.delete(req.params.id, res, req);
  }
);

export const restaurantCartItemControllers = {
  createRestaurantCartItem,
  readOneRestaurantCartItem,
  readAllRestaurantCartItems,
  updateRestaurantCartItem,
  deleteRestaurantCartItem,
};
