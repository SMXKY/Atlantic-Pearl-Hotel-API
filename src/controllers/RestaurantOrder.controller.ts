import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RestaurantOrderModel } from "../models/RestaurantOrder.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import { RestaurantItemModel } from "../models/RestaurantItem.model";
import { RestaurantCartModel } from "../models/RestaurantCart.model";
import {
  IRestaurantCartItem,
  RestaurantCartItemModel,
} from "../models/RestaurantCartItem.model";
import { GuestModel } from "../models/Guest.model";
import { BillItemModel } from "../models/BillItem.model";
import { BillModel } from "../models/Bill.model";
import { ReservationModel } from "../models/Reservation.model";

interface ICartItem {
  itemId: string;
  amount: number;
}

const CRUDRestaurantOrder: CRUD = new CRUD(RestaurantOrderModel);

const createRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { guestId, cart, reservationId } = req.body;

    const reservation = await ReservationModel.findById(reservationId);

    if (!reservationId || !reservation) {
      return next(
        new AppError(
          "Reservation Id is required to create a restaurant order.",
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

    const orderCart = await RestaurantCartModel.create({
      reservation: String(reservation._id),
    });

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
    req.body.totalAmountInCFA = totalAmount;
    req.body.reservation = reservation._id;

    await CRUDRestaurantOrder.create(req.body, res, req);
  }
);

const readOneRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.readOne(
      req.params.id,
      res,
      ["guest", "cart"],
      req
    );
  }
);

const readAllRestaurantOrders = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRestaurantOrder.readAll(res, req, 1, 100, [
      "guest",
      "cart",
      "reservation",
      "items",
    ]);
  }
);

const updateRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, guestId } = req.body;
    const { id: orderId } = req.params;

    const order = await RestaurantOrderModel.findById(orderId);
    const reservationId = order?.reservation;

    if (!order) {
      return next(
        new AppError(
          "No such restaurant order with the provided ID.",
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (status === "delivered") {
      if (!reservationId) {
        return next(
          new AppError(
            "You must provide the reservationId to charge the guest for the delivered restaurant order.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const [reservation] = await Promise.all([
        ReservationModel.findById(reservationId),
      ]);

      if (!reservation) {
        return next(
          new AppError(
            "Reservation not found. Unable to charge guest for restaurant order.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Fetch or create the bill
      let bill = await BillModel.findOne({ reservationId });

      if (!bill) {
        const [created] = await BillModel.create([
          {
            reservationId: reservation._id,
          },
        ]);
        bill = created;
      }

      // Fetch the cart and calculate total
      const cart = await RestaurantCartModel.findById(order.cart).populate(
        "cartItems"
      );

      if (!cart || !cart.cartItems) {
        return next(
          new AppError(
            "Unable to load cart or its items associated with this order.",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const totalAmount = cart.cartItems.reduce(
        (sum: any, item: IRestaurantCartItem) => {
          const quantity = item.quantity || 1;
          return sum + item.priceSnapShotInCFA * quantity;
        },
        0
      );

      if (isNaN(totalAmount) || totalAmount < 0) {
        return next(
          new AppError(
            "Calculated total amount is invalid.",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      // Create a bill item for the restaurant order
      await BillItemModel.create({
        billId: bill._id,
        description: `${reservation.bookingReference} ordered restaurant items`,
        category: "restaurant_orders", // enum value
        linkedEntityId: order._id,
        amount: totalAmount,
      });
    }

    // Proceed with the update
    await CRUDRestaurantOrder.update(orderId, res, req);
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
