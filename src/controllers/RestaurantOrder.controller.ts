import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantOrderModel } from "../models/RestaurantOrder.model";

const CRUDRestaurantOrder: CRUD = new CRUD(RestaurantOrderModel);

const createRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.create(req.body, res, req);
  }
);

const readOneRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.readOne(req.params.id, res, [], req);
  }
);

const readAllRestaurantOrders = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.readAll(res, req, 1, 100, []);
  }
);

const updateRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.update(req.params.id, res, req);
  }
);

const deleteRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.delete(req.params.id, res, req);
  }
);

export const RestaurantOrderControllers = {
  createRestaurantOrder,
  readOneRestaurantOrder,
  readAllRestaurantOrders,
  updateRestaurantOrder,
  deleteRestaurantOrder,
};
