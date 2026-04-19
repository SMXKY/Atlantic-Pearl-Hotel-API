import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { RestaurantConfigModel } from "../../models/Restaurant/RestaurantConfig.model";

const CRUDRestaurantConfig: CRUD = new CRUD(RestaurantConfigModel);

const createRestaurantConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantConfig.create(req.body, res, req);
  }
);

const readOneRestaurantConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantConfig.readOne(req.params.id, res, [], req);
  }
);

const readAllRestaurantConfigs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantConfig.readAll(
      res,
      req,
      1,
      100,
      [],
      "-createdAt",
      false
    );
  }
);

const updateRestaurantConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantConfig.update(req.params.id, res, req);
  }
);

const deleteRestaurantConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantConfig.delete(req.params.id, res, req);
  }
);

export const restaurantConfigControllers = {
  createRestaurantConfig,
  readOneRestaurantConfig,
  readAllRestaurantConfigs,
  updateRestaurantConfig,
  deleteRestaurantConfig,
};
