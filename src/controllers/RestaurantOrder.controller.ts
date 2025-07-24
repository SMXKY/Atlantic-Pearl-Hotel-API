import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantOrderModel } from "../models/RestaurantOrder.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { RestaurantItemModel } from "../models/RestaurantItem.model";
import { RestaurantCartModel } from "../models/RestaurantCart.model";
import { RestaurantCartItemModel } from "../models/RestaurantCartItem.model";

interface ICartItem {
  itemId: string;
  amount: number;
}

const CRUDRestaurantOrder: CRUD = new CRUD(RestaurantOrderModel);

const createRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { guestId, cart } = req.body;

    if (!guestId) {
      return next(
        new AppError(
          "Guest ID is required to create a restaurant order.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return next(
        new AppError(
          "Cart must be a non-empty array to create an order.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    let totalAmount = 0;

    const orderCart = await RestaurantCartModel.create({ guest: guestId });

    for (const cartItem of cart as ICartItem[]) {
      const { itemId, amount } = cartItem;

      if (!itemId) {
        return next(
          new AppError(
            "Item ID is required for each cart item.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!amount || amount <= 0) {
        return next(
          new AppError(
            "Amount must be a positive number.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const item = await RestaurantItemModel.findById(itemId);
      if (!item) {
        return next(
          new AppError(
            "Cart item not found in the database.",
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (!item.isAvailable || !item.availableToday) {
        return next(
          new AppError(
            `${item.name} is not available at the moment.`,
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!item.isPerishable) {
        if (typeof item.stock !== "number") {
          return next(
            new AppError(
              `Stock information missing for non-perishable item: ${item.name}`,
              StatusCodes.INTERNAL_SERVER_ERROR
            )
          );
        }

        if (amount > item.stock) {
          return next(
            new AppError(
              `Not enough stock for ${item.name}. Requested: ${amount}, Available: ${item.stock}`,
              StatusCodes.BAD_REQUEST
            )
          );
        }
      }

      totalAmount += item.priceInCFA * amount;

      await RestaurantCartItemModel.create({
        cart: orderCart._id,
        item: item._id,
        name_snapshot: item.name,
        priceSnapShotInCFA: item.priceInCFA,
        quantity: amount,
        prepTimeSnapshot: item.prepTimeInMinutes,
      });
    }

    req.body.cart = orderCart._id;
    req.body.guest = guestId;
    req.body.totalAmountInCFA = totalAmount;

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
