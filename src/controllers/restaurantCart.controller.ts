import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantCartModel } from "../models/RestaurantCart.model";

const CRUDRestaurantCart: CRUD = new CRUD(RestaurantCartModel);

const createRestaurantCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCart.create(req.body, res, req);
  }
);

const readOneRestaurantCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCart.readOne(req.params.id, res, [], req);
  }
);

const readAllRestaurantCarts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCart.readAll(res, req, 1, 100, []);
  }
);

const updateRestaurantCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCart.update(req.params.id, res, req);
  }
);

const deleteRestaurantCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantCart.delete(req.params.id, res, req);
  }
);

export const restaurantCartControllers = {
  createRestaurantCart,
  readOneRestaurantCart,
  readAllRestaurantCarts,
  updateRestaurantCart,
  deleteRestaurantCart,
};
