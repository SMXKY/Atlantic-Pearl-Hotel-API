import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { RestaurantOrderModel } from "../../models/Restaurant/RestaurantOrder.model";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../util/AppError.util";
import {
  IRestaurantItem,
  RestaurantItemModel,
} from "../../models/Restaurant/RestaurantItem.model";
import { RestaurantCartModel } from "../../models/Restaurant/RestaurantCart.model";
import {
  IRestaurantCartItem,
  RestaurantCartItemModel,
} from "../../models/Restaurant/RestaurantCartItem.model";
import { GuestModel } from "../../models/HR/Guest.model";
import { BillItemModel } from "../../models/Finance/BillItem.model";
import { BillModel } from "../../models/Finance/Bill.model";
import { ReservationModel } from "../../models/Reservations/Reservation.model";
import {
  IMealCombo,
  MealComboModel,
} from "../../models/Restaurant/MealCombo.model";
import { Types } from "mongoose";
import {
  IRestaurantConfig,
  RestaurantConfigModel,
} from "../../models/Restaurant/RestaurantConfig.model";
import { MealRedemptionModel } from "../../models/Restaurant/MealRedemption.modelt";
import { RoomModel } from "../../models/Properties/Room.model";
import { RateModel } from "../../models/Reservations/Rate.model";
import mongoose from "mongoose";
import { logUserActivity } from "../../util/logUserActivity.util";
import { appResponder } from "../../util/appResponder.util";
import { StationModel } from "../../models/Properties/Station.model";
import {
  transactionCodes,
  TransactionModel,
} from "../../models/Finance/Transaction.model";

const CRUDRestaurantOrder: CRUD = new CRUD(RestaurantOrderModel);

interface ICartItem {
  itemId: string;
  amount: number;
  type: "item" | "combo";
}

export const createRestaurantOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cart, reservationId, roomId } = req.body;

    const room = await RoomModel.findById(roomId);

    if (!roomId || !room) {
      return next(
        new AppError(
          "Room Id requried to create an order.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findById(reservationId);
    if (!reservationId || !reservation) {
      return next(
        new AppError(
          "Reservation Id is required to create a restaurant order.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!reservation.hasRoom(room._id)) {
      return next(
        new AppError(
          "This room Id does not be long to this reservation.",
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
      const { itemId, amount, type } = cartItem;

      if (!type) {
        return next(
          new AppError(
            "The item type must be specified (item or combo).",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!itemId) {
        return next(
          new AppError(
            "Item ID is required for each cart entry.",
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

      let priceSnapshot = 0;
      let prepTimeSnapshot = 0;
      let displayName = "";

      if (type === "item") {
        // --- Single item ---
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

          item.stock -= amount;
          await item.save();
        }

        priceSnapshot = item.priceInCFA;
        prepTimeSnapshot = item.prepTimeInMinutes;
        displayName = item.name;

        totalAmount += priceSnapshot * amount;

        await RestaurantCartItemModel.create({
          cart: orderCart._id,
          referenceId: item._id,
          name_snapshot: displayName,
          priceSnapShotInCFA: priceSnapshot,
          quantity: amount,
          prepTimeSnapshot,
          itemType: "restaurant_items",
        });
      } else if (type === "combo") {
        // --- Combo ---
        const combo = await MealComboModel.findById(itemId);
        if (!combo) {
          return next(
            new AppError(
              "Combo not found in the database.",
              StatusCodes.NOT_FOUND
            )
          );
        }

        if (!combo.isAvailable || !combo.availableToday) {
          return next(
            new AppError(
              `${combo.name} is not available at the moment.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        // Calculate totals
        const totals = await combo.calculateTotals();
        priceSnapshot = totals.totalPriceInCFA;
        prepTimeSnapshot = totals.totalPrepTimeInMinutes;
        displayName = combo.name;

        totalAmount += priceSnapshot * amount;

        // --- Stock management for items in combo ---
        for (const subItemId of combo.items as Types.ObjectId[]) {
          const subItem = await RestaurantItemModel.findById(subItemId);
          if (!subItem) {
            return next(
              new AppError(
                `Combo item with id ${subItemId} not found in the database.`,
                StatusCodes.NOT_FOUND
              )
            );
          }

          if (!subItem.isPerishable) {
            if (typeof subItem.stock !== "number") {
              return next(
                new AppError(
                  `Stock info missing for non-perishable item in combo: ${subItem.name}`,
                  StatusCodes.INTERNAL_SERVER_ERROR
                )
              );
            }

            const requiredQty = amount; // each combo consumes 1 of each subItem
            if (requiredQty > subItem.stock) {
              return next(
                new AppError(
                  `Not enough stock for ${subItem.name} in combo ${combo.name}. Requested: ${requiredQty}, Available: ${subItem.stock}`,
                  StatusCodes.BAD_REQUEST
                )
              );
            }

            subItem.stock -= requiredQty;
            await subItem.save();
          }
        }

        await RestaurantCartItemModel.create({
          cart: orderCart._id,
          referenceId: combo._id,
          itemType: "restaurant_combos",
          name_snapshot: displayName,
          priceSnapShotInCFA: priceSnapshot,
          quantity: amount,
          prepTimeSnapshot,
        });
      }
    }

    // --- Attach metadata for order ---
    req.body.cart = orderCart._id;
    req.body.totalAmountInCFA = totalAmount;
    req.body.reservation = reservation._id;
    req.body.room = room._id;

    // --- Delegate to CRUD order handler ---
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
    const { status, guestId, stationId } = req.body;
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

    if (order.isRedeemedMeal && status === "delivered") {
      const mealRedemption = await MealRedemptionModel.findOne({
        order: order._id,
      });

      if (!mealRedemption) {
        return next(
          new AppError(
            "Cannot process meal redemption for this order. Please contact the administrator.",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      if (!mealRedemption.charged) {
        mealRedemption.charged = true;
        await mealRedemption.save();
      }

      return await CRUDRestaurantOrder.update(orderId, res, req);
    }

    if (status === "delivered") {
      // if (!stationId) {
      //   return next(
      //     new AppError(
      //       "Station Id required to update resturant order to dillivered.",
      //       StatusCodes.BAD_REQUEST
      //     )
      //   );
      // }
      // const station = await StationModel.findById(stationId);

      // if (!station) {
      //   return next(
      //     new AppError(
      //       "Statioid not found in the database.",
      //       StatusCodes.NOT_FOUND
      //     )
      //   );
      // }

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

      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(
        2,
        "0"
      )}${String(today.getMonth() + 1).padStart(2, "0")}${today.getFullYear()}`;
      const formattedTime = `${String(today.getHours()).padStart(
        2,
        "0"
      )}:${String(today.getMinutes()).padStart(2, "0")}`;

      await TransactionModel.create({
        transactionType: "restuarant order",
        reason: `${reservation.guestName} was dillivered thier restaurant order of Id: ${order._id}`,
        amountInCFA: totalAmount,
        reservation: reservation._id,
        guest: reservation.guest,
        room: order.room,
        transactionDate: formattedDate,
        transactionTime: formattedTime,
        trancode: transactionCodes.foodCharge,
        referenceDoc: {
          id: order._id,
          collection: "restaurant_orders",
        },
        isCharge: true,
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

export function validateMealWindow(
  config: IRestaurantConfig,
  combo: IMealCombo
) {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  const isWithinWindow = (start: string, end: string) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const [currH, currM] = currentTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currH * 60 + currM;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  let valid = false;
  switch (combo.mealType) {
    case "breakfast":
      valid = isWithinWindow(config.breakfastStart, config.breakfastEnd);
      break;
    case "lunch":
      valid = isWithinWindow(config.lunchStart, config.lunchEnd);
      break;
    case "dinner":
      valid = isWithinWindow(config.dinnerStart, config.dinnerEnd);
      break;
  }

  if (!valid) {
    throw new AppError(
      `${
        combo.mealType.charAt(0).toUpperCase() + combo.mealType.slice(1)
      } can only be redeemed between ${
        config[`${combo.mealType}Start` as keyof IRestaurantConfig]
      } and ${config[`${combo.mealType}End` as keyof IRestaurantConfig]}.`,
      StatusCodes.BAD_REQUEST
    );
  }
}

export async function getTodaysRedemptionsCounts(
  reservationId: string,
  roomId: string
) {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  const counts = await MealRedemptionModel.aggregate([
    {
      $match: {
        reservation: new mongoose.Types.ObjectId(reservationId),
        room: new mongoose.Types.ObjectId(roomId),
        redeemedAt: { $gte: startOfDay, $lte: endOfDay },
        charged: true,
      },
    },
    { $group: { _id: "$mealType", count: { $sum: 1 } } },
  ]);

  const result: Record<string, number> & { total: number } = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    total: 0,
  };
  counts.forEach((c) => {
    result[c._id] = c.count;
    result.total += c.count;
  });
  return result;
}

const redeemMeal = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { comboId, roomId, reservationId } = req.body;

    if (!comboId)
      return next(
        new AppError("Meal combo is required.", StatusCodes.BAD_REQUEST)
      );
    if (!roomId)
      return next(
        new AppError("Room ID is required.", StatusCodes.BAD_REQUEST)
      );
    if (!reservationId)
      return next(
        new AppError("Reservation ID is required.", StatusCodes.BAD_REQUEST)
      );

    const combo = await MealComboModel.findById(comboId).populate("items");
    if (!combo)
      return next(
        new AppError(
          "Selected meal combo does not exist.",
          StatusCodes.NOT_FOUND
        )
      );

    const room = await RoomModel.findById(roomId);
    if (!room)
      return next(
        new AppError("Selected room does not exist.", StatusCodes.NOT_FOUND)
      );

    const reservation = await ReservationModel.findById(reservationId);
    if (!reservation)
      return next(
        new AppError("Reservation not found.", StatusCodes.NOT_FOUND)
      );
    if (!reservation.hasRoom(room._id))
      return next(
        new AppError(
          "Room does not belong to this reservation.",
          StatusCodes.BAD_REQUEST
        )
      );
    if (!reservation.guest || reservation.status !== "checked in")
      return next(
        new AppError(
          "Only checked-in guests can redeem meals.",
          StatusCodes.BAD_REQUEST
        )
      );

    let rateId;
    reservation.items.forEach((item) =>
      item.rooms.forEach((r) => {
        if (String(r.room._id) === String(room._id)) {
          rateId = item.rate._id;
        }
      })
    );

    console.log(rateId);

    const rate = await RateModel.findById(rateId);

    if (!rate)
      return next(
        new AppError(
          "Associated rate does not exist.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );

    const allowedMealPlans: Record<string, string[]> = {
      breakfast: ["B&B", "HB", "FB", "AI"],
      lunch: ["FB", "AI"],
      dinner: ["HB", "FB", "AI"],
    };
    if (!allowedMealPlans[combo.mealType].includes(rate.mealPlan))
      return next(
        new AppError(
          `This rate does not allow redeemable ${combo.mealType}.`,
          StatusCodes.BAD_REQUEST
        )
      );

    const config = await RestaurantConfigModel.findOne();
    if (!config)
      return next(
        new AppError(
          "Restaurant configuration not found.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );

    validateMealWindow(config, combo);

    const todaysRedemptions = await getTodaysRedemptionsCounts(
      reservation._id.toString(),
      room._id.toString()
    );

    const mealTypeMaxMap: Record<string, number> = {
      breakfast: config.maxBreakfastPerRoom,
      lunch: config.maxLunchPerRoom,
      dinner: config.maxDinnerPerRoom,
    };

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const totalForMealType =
      (todaysRedemptions[combo.mealType] || 0) +
      (await MealRedemptionModel.countDocuments({
        reservation: reservation._id,
        room: room._id,
        mealType: combo.mealType,
        charged: false,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }));

    if (
      combo.mealType !== "all" &&
      totalForMealType >= mealTypeMaxMap[combo.mealType]
    ) {
      return next(
        new AppError(
          `Maximum ${combo.mealType} redemptions for this room today reached.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (
      combo.mealType !== "all" &&
      todaysRedemptions[combo.mealType] >= mealTypeMaxMap[combo.mealType]
    )
      return next(
        new AppError(
          `Maximum ${combo.mealType} redemptions for this room today reached.`,
          StatusCodes.BAD_REQUEST
        )
      );

    if (
      combo.mealType === "all" &&
      todaysRedemptions.total >=
        config.maxBreakfastPerRoom +
          config.maxLunchPerRoom +
          config.maxDinnerPerRoom
    )
      return next(
        new AppError(
          "Maximum meal redemptions for this room today reached.",
          StatusCodes.BAD_REQUEST
        )
      );

    const cart = await RestaurantCartModel.create({
      guest: reservation.guest,
      reservation: reservation._id,
    });
    const priceInCFA =
      combo.items?.reduce(
        (sum: number, item: any) => sum + (item.priceInCFA || 0),
        0
      ) || 0;
    const prepTimeInMinutes =
      combo.items?.reduce(
        (sum: number, item: any) => sum + (item.prepTimeInMinutes || 0),
        0
      ) || 0;

    await RestaurantCartItemModel.create({
      cart: cart._id,
      referenceId: combo._id,
      itemType: "restaurant_combos",
      name_snapshot: combo.name,
      priceSnapShotInCFA: priceInCFA,
      quantity: 1,
      prepTimeSnapshot: prepTimeInMinutes,
    });

    const order = await RestaurantOrderModel.create({
      cart: cart._id,
      guest: reservation.guest,
      reservation: reservation._id,
      totalAmountInCFA: 0,
      addedToGuestBill: true,
      isRedeemedMeal: true,
    });

    const redemption = await MealRedemptionModel.create({
      reservation: reservation._id,
      combo: combo._id,
      room: room._id,
      mealType: combo.mealType,
      redeemedBy: res.locals.user._id,
      order: order._id,
    });

    logUserActivity(
      req,
      res.locals.user._id,
      `${res.locals.user.name} redeemed ${reservation.guestName} meal for ${room.number}.`,
      "meal_redemptions",
      String(redemption._id),
      "",
      JSON.stringify(redemption)
    );

    appResponder(StatusCodes.OK, redemption, res);
  }
);

const redemptionDashboard = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reservationId, roomId } = req.query;

    if (!reservationId) {
      return next(
        new AppError(
          "Reservation Id is required to get meal redemption data",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (!roomId) {
      return next(
        new AppError(
          "Room Id is required to get meal redemption data",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const room = await RoomModel.findById(roomId);
    if (!room)
      return next(
        new AppError("Selected room does not exist", StatusCodes.NOT_FOUND)
      );

    const reservation = await ReservationModel.findById(reservationId);

    if (!reservation)
      return next(new AppError("Reservation not found", StatusCodes.NOT_FOUND));

    if (!reservation.hasRoom(room._id))
      return next(
        new AppError(
          "Room does not belong to this reservation",
          StatusCodes.BAD_REQUEST
        )
      );

    if (!reservation.guest || reservation.status !== "checked in")
      return next(
        new AppError(
          "Only checked-in guests can redeem meals",
          StatusCodes.BAD_REQUEST
        )
      );

    const config = await RestaurantConfigModel.findOne();
    if (!config) {
      return next(
        new AppError(
          "Restaurant config not found, please contact administrators",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const todaysRedemptions = await getTodaysRedemptionsCounts(
      reservation._id.toString(),
      room._id.toString()
    );

    const dashboard = {
      breakfast: {
        left: Math.max(
          config.maxBreakfastPerRoom - todaysRedemptions.breakfast,
          0
        ),
        used: todaysRedemptions.breakfast,
        max: config.maxBreakfastPerRoom,
      },
      lunch: {
        left: Math.max(config.maxLunchPerRoom - todaysRedemptions.lunch, 0),
        used: todaysRedemptions.lunch,
        max: config.maxLunchPerRoom,
      },
      dinner: {
        left: Math.max(config.maxDinnerPerRoom - todaysRedemptions.dinner, 0),
        used: todaysRedemptions.dinner,
        max: config.maxDinnerPerRoom,
      },
      total: {
        left: Math.max(
          config.maxBreakfastPerRoom +
            config.maxLunchPerRoom +
            config.maxDinnerPerRoom -
            todaysRedemptions.total,
          0
        ),
        used: todaysRedemptions.total,
        max:
          config.maxBreakfastPerRoom +
          config.maxLunchPerRoom +
          config.maxDinnerPerRoom,
      },
    };

    appResponder(StatusCodes.OK, dashboard, res);
  }
);

export const RestaurantOrderControllers = {
  createRestaurantOrder,
  readOneRestaurantOrder,
  readAllRestaurantOrders,
  updateRestaurantOrder,
  deleteRestaurantOrder,
  redeemMeal,
  redemptionDashboard,
};
