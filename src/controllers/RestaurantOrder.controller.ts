import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantOrderModel } from "../models/RestaurantOrder.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";

interface ICartItem {
  itemId: string;
  amount: string;
}

const CRUDRestaurantOrder: CRUD = new CRUD(RestaurantOrderModel);

const createRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { guestId, cart } = req.body;

    if (!guestId) {
      return next(
        new AppError(
          "Guest id is requried to create restaurant order",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!cart) {
      return next(
        new AppError(
          "Cart is required to create and order.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    let totalAmount = 0;

    for (const cartItem of cart as ICartItem[]) {
      if (!cartItem.itemId) {
        return next(
          new AppError(
            "Cart Item is, item id is required to create a cart or an order.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!cartItem.itemId) {
        return next(
          new AppError(
            "Cart Item is, item id is required to create a cart or an order.",
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

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
