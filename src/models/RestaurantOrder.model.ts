import mongoose, { Schema, model, Types } from "mongoose";
import { RestaurantCartModel } from "./RestaurantCart.model";
import { GuestModel } from "./Guest.model";
import { ReservationModel } from "./Reservation.model";
import { io } from "../index";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";
import {
  getIdsFromPermissions,
  sendNotification,
} from "../util/sendNotification.util";
import { NotificationType } from "./Notification.model";
import { allPermissions } from "../types/Permissions.type";

export interface IRestaurantOrder {
  _id?: Types.ObjectId;
  cart: Types.ObjectId;
  guest: Types.ObjectId;
  reservation: Types.ObjectId;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "delivering"
    | "delivered"
    | "cancelled";
  totalAmountInCFA: number; // in cents
  addedToGuestBill: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const RestaurantOrderSchema = new Schema<IRestaurantOrder>(
  {
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant_carts",
      required: true,
      validate: {
        validator: async function (cartId: mongoose.Schema.Types.ObjectId) {
          if (!cartId) return false;
          const exists = await RestaurantCartModel.exists({ _id: cartId });
          return exists !== null;
        },
        message: "Referenced cart_id does not exist.",
      },
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "guests",
      required: false,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "reservations",
      required: true,
      validate: {
        validator: async function (resId: mongoose.Schema.Types.ObjectId) {
          if (!resId) return false;
          const exists = await ReservationModel.findById(resId);
          return exists !== null;
        },
        message: "Referenced reservation_id does not exist.",
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "delivering",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    totalAmountInCFA: {
      type: Number,
      required: true,
      min: 0,
    },
    addedToGuestBill: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

RestaurantOrderSchema.virtual("items", {
  ref: "restaurant_cart_items", // model name of cart items
  localField: "cart", // field in order pointing to cart
  foreignField: "cart", // field in cart items pointing back
});

async function populateRestaurantOrder(doc: any) {
  if (!doc) return null;

  await doc.populate([
    { path: "guest" },
    { path: "cart" },
    { path: "reservation" },
    { path: "items" },
  ]);

  return doc;
}

async function notifyRestaurantOrder(
  doc: any,
  guestMessage: string,
  staffMessage: string
) {
  // 1. Fetch guest with user
  // console.log(orderDoc);
  const orderDoc = doc.toObject();
  // console.log(orderDoc);
  const guest = await GuestModel.findById(
    orderDoc.reservation?.guest?._id
  ).populate("user");
  if (!guest?.user) {
    throw new AppError(
      "Guest or associated user not found",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // 2. Notify guest
  await sendNotification({
    userIds: [(guest.user as any)._id.toString()],
    title: "Restaurant Notification",
    message: `${(guest.user as any).name}${guestMessage}`,
    type: NotificationType.RESTAURANT,
    entityRef: { model: "restaurant_orders", id: orderDoc._id },
    redirectUrl: `/restaurant`,
    isGlobal: false,
  });

  // 3. Build frontend URL
  const frontEndUrl =
    process.env.NODE_ENV === "production"
      ? process.env.FRONT_END_URL_PROD
      : process.env.FRONT_END_URL_DEV;

  if (!frontEndUrl) {
    throw new AppError(
      "Front-end base URL is missing from env",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // 4. Get staff IDs from permissions
  const staffIds = await getIdsFromPermissions(
    allPermissions.restaurantOrders.update
  );

  console.log(staffIds);

  // 5. Notify staff
  if (staffIds.length > 0) {
    await sendNotification({
      userIds: staffIds,
      title: "Restaurant Order",
      message: `${(guest.user as any).name}${staffMessage}`,
      type: NotificationType.RESTAURANT,
      entityRef: { model: "restaurant_orders", id: orderDoc._id },
      redirectUrl: `${frontEndUrl}/restaurant`,
      isGlobal: false,
    });
  }
}

RestaurantOrderSchema.post("save", async function (doc) {
  try {
    const populatedDoc = await populateRestaurantOrder(doc);
    io.emit("restaurantOrder:new", populatedDoc);
    notifyRestaurantOrder(
      doc,
      " your restaurant order has been successfully placed. We’ll notify you as soon as it’s ready for delivery.",
      " submitted an order. Kitchen and delivery teams, please take necessary action."
    );
  } catch (err) {
    console.error("Error emitting restaurantOrder:new:", err);
  }
});

RestaurantOrderSchema.post("findOneAndUpdate", async function (doc) {
  try {
    if (!doc) return;

    const populatedDoc = await populateRestaurantOrder(doc);
    io.emit("restaurantOrder:update", populatedDoc);

    if (doc.status === "ready") {
      notifyRestaurantOrder(
        doc,
        " your restaurant order is ready and will be delivered shortly. Enjoy your meal!.",
        "'s order has been completed and is ready for delivery."
      );
    }
  } catch (err) {
    console.error("Error emitting restaurantOrder:update:", err);
    // optionally log to external service (Sentry, etc.)
  }
});

RestaurantOrderSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (!doc) return;
    const populatedDoc = await populateRestaurantOrder(doc);
    io.emit("restaurantOrder:delete", populatedDoc);
  } catch (err) {
    console.error("Error emitting restaurantOrder:delete:", err);
  }
});

export const RestaurantOrderModel = model<IRestaurantOrder>(
  "restaurant_orders",
  RestaurantOrderSchema
);
