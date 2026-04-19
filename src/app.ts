import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { StatusCodes } from "http-status-codes";
import cookieParser from "cookie-parser";

import { departmentRouter } from "./routes/Properties/department.route";
import { employeeRouter } from "./routes/HR/employee.route";
import { guestRouter } from "./routes/HR/guest.route";
import { permissionRouter } from "./routes/Auth/permission.route";
import { permissionOverideRouter } from "./routes/Auth/permissionOveride.route";
import { positionRouter } from "./routes/HR/position.route";
import { roleRouter } from "./routes/Auth/role.route";
import { rolePermissionRouter } from "./routes/Auth/rolePermission.route";
import { userRouter } from "./routes/HR/user.route";
import { AppError } from "./util/AppError.util";
import { globalErrorController } from "./controllers/System/error.controller";
import { authRouter } from "./routes/Auth/auth.route";
import { authControllers } from "./controllers/Auth/auth.controller";
import cors, { CorsOptions } from "cors";
import { activityLogRouter } from "./routes/Logs/activityLogs.route";
import { roleOverideRouter } from "./routes/Auth/roleOveride.route";
import { reservationRouter } from "./routes/Reservations/reservation.route";
import { buildingRouter } from "./routes/Properties/building.route";
import { roomRouter } from "./routes/Properties/room.route";
import { roomTypeRouter } from "./routes/Properties/roomType.route";
import { rateRouter } from "./routes/Reservations/rate.route";
import { discountRouter } from "./routes/Finance/discount.route";
import { taxRouter } from "./routes/Finance/tax.route";
import { adminConfigurationRouter } from "./routes/Config/adminConfiguration.route";
import { amenityRouter } from "./routes/Properties/amenity.route";
import { roomTypeAmenityRouter } from "./routes/Properties/roomTypeAmenity.route";
import { bedTypeRouter } from "./routes/Properties/bedType.route";
import { roomTypeBedTypeRouter } from "./routes/Properties/roomTypeBedType.route";
import { roomTypeReviewRouter } from "./routes/Properties/roomTypeReview.route";
import docxRouter from "./util/filterExplantion.util";
import { invoiceRouter } from "./routes/Finance/invoice.routes";
import { contentRouter } from "./routes/Content/content.route";
import { billRouter } from "./routes/Finance/bill.route";
import { billItemsRouter } from "./routes/Finance/billItem.route";
import { parkingReservationRouter } from "./routes/Parking/parkingReservation.route";
import { parkingSectionRouter } from "./routes/Parking/parkingSection.route";
import { parkingSpotRouter } from "./routes/Parking/parkingSpots.route";
import { parkingSectionTypeRouter } from "./routes/Parking/parkingSectionType.route";
import { restaurantCartRouter } from "./routes/Restaurant/restaurantCart.route";
import { restaurantCartItemRouter } from "./routes/Restaurant/restaurantCartItem.route";
import { restaurantItemRouter } from "./routes/Restaurant/restaurantItem.route";
import { restaurantItemCategoryRouter } from "./routes/Restaurant/restaurantItemCategory.route";
import { restaurantOrderRouter } from "./routes/Restaurant/restaurantOrder.route";
import { notificationRouter } from "./routes/Notifications/notification.route";
import { mealComboRouter } from "./routes/Restaurant/mealCombo.route";
import { restaurantConfigRouter } from "./routes/Restaurant/restaurantConfig.route";
import { stationRouter } from "./routes/HR/stations.route";
import { iptvRouter } from "./routes/IPTV/iptv.route";
import { inventoryLocationRouter } from "./routes/Inventory/Inventorylocation.route";
import { inventoryCategoryRouter } from "./routes/Inventory/Inventorycategory.route";
import { inventorySupplierRouter } from "./routes/Inventory/Inventorysupplier.route";
import { inventoryItemRouter } from "./routes/Inventory/InventoryItem.route";
import { inventoryItemLocationRouter } from "./routes/Inventory/InventoryItemLocation.route";
import { inventoryMovementRouter } from "./routes/Inventory/InventoryMovement.route";
import { inventoryRequisitionRouter } from "./routes/Inventory/InventoryRequisition.route";
import { inventoryPurchaseOrderRouter } from "./routes/Inventory/InventoryPurchaseOrder.route";
import { inventoryGoodsReceiptRouter } from "./routes/Inventory/InventoryGoodsReceipt.route";
import { inventorySupplierPaymentRouter } from "./routes/Inventory/InventorySupplierPayment.route";
import { inventoryBudgetRouter } from "./routes/Inventory/InventoryBudget.route";
import { inventoryFinancialEventRouter } from "./routes/Inventory/InventoryFinancialEvent.route";
import { inventoryStockTakeRouter } from "./routes/Inventory/InventoryStockTake.route";
import { inventoryStockTakeScheduleRouter } from "./routes/Inventory/InventoryStockTakeSchedule.route";
import { inventoryAlertConfigRouter } from "./routes/Inventory/Inventoryalertconfig.route";
import { inventorySupplierRatingRouter } from "./routes/Inventory/InventorySupplierRating.route";

export const app = express();

/**
 * @openapi
 * /:
 *   get:
 *     summary: Test to if the Server is Running
 *     responses:
 *       200:
 *         description: Testing if the server is online.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void
  ) => {
    if (!origin) return callback(null, true);
    callback(null, origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};

// app.use(cookieParser());
app.use(cors(corsOptions));
app.set("trust proxy", true);

app.get("/", (req: Request, res: Response) => {
  // console.log("lajfdlasflsajflsajflsajflsajlfjsalfjlsadjflasdjfkdaj");
  res.send("Hello from the Atlantic Pearl Hotel and Resort API...");
});

app.use(
  express.json({
    strict: false,
    verify: (req, res, buf) => {
      if (!buf.length) return;
    },
  })
);

// Whitelist middleware
const allowedIps = [
  "123.45.67.89",
  "98.76.54.32",
  "127.0.0.1",
  "31.97.113.198",
]; // Replace with your allowed IPs

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

  // Normalize IP if it comes in IPv6 format with prefix ::ffff:
  const ip = (clientIp as string).replace("::ffff:", "");

  if (allowedIps.includes(ip)) {
    next(); // Allowed
  } else {
    res.status(403).json({
      status: "fail",
      message: `Your IP (${ip}) is not allowed to access this server.`,
    });
  }
});

app.get("/api/v1/verify-email/:token", authControllers.verifyEmail);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/guests", guestRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/permission-overides", permissionOverideRouter);
app.use("/api/v1/positions", positionRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/role-permissions", rolePermissionRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/activity-logs", activityLogRouter);
app.use("/api/v1/role-overides", roleOverideRouter);
app.use("/api/v1/reservations", reservationRouter);
app.use("/api/v1/buildings", buildingRouter);
app.use("/api/v1/rooms", roomRouter);
app.use("/api/v1/room-types", roomTypeRouter);
app.use("/api/v1/rates", rateRouter);
app.use("/api/v1/discounts", discountRouter);
app.use("/api/v1/taxes", taxRouter);
app.use("/api/v1/admin-configurations", adminConfigurationRouter);
app.use("/api/v1/amenities", amenityRouter);
app.use("/api/v1/room-type-amenities", roomTypeAmenityRouter);
app.use("/api/v1/bed-types", bedTypeRouter);
app.use("/api/v1/room-type-bed-types", roomTypeBedTypeRouter);
app.use("/api/v1/room-type-reveiws", roomTypeReviewRouter);
app.use("/api/v1/custom-docs", docxRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/content", contentRouter);
app.use("/api/v1/bills", billRouter);
app.use("/api/v1/bill-items", billItemsRouter);
app.use("/api/v1/parking-reservations", parkingReservationRouter);
app.use("/api/v1/parking-sections", parkingSectionRouter);
app.use("/api/v1/parking-section-types", parkingSectionTypeRouter);
app.use("/api/v1/parking-spots", parkingSpotRouter);
app.use("/api/v1/restaurant-carts", restaurantCartRouter);
app.use("/api/v1/restaurant-cart-items", restaurantCartItemRouter);
app.use("/api/v1/restaurant-items", restaurantItemRouter);
app.use("/api/v1/restaurant-item-categories", restaurantItemCategoryRouter);
app.use("/api/v1/restaurant-orders", restaurantOrderRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/meal-combos", mealComboRouter);
app.use("/api/v1/restaurant-config", restaurantConfigRouter);
app.use("/api/v1/stations", stationRouter);
app.use("/iptv2", iptvRouter);
app.use("/api/v1/inventory/locations", inventoryLocationRouter);
app.use("/api/v1/inventory/categories", inventoryCategoryRouter);
app.use("/api/v1/inventory/suppliers", inventorySupplierRouter);
app.use("/api/v1/inventory/items", inventoryItemRouter);
app.use("/api/v1/inventory/item-locations", inventoryItemLocationRouter);
app.use("/api/v1/inventory/movements", inventoryMovementRouter);
app.use("/api/v1/inventory/requisitions", inventoryRequisitionRouter);
app.use("/api/v1/inventory/purchase-orders", inventoryPurchaseOrderRouter);
app.use("/api/v1/inventory/goods-receipts", inventoryGoodsReceiptRouter);
app.use("/api/v1/inventory/supplier-payments", inventorySupplierPaymentRouter);
app.use("/api/v1/inventory/budgets", inventoryBudgetRouter);
app.use("/api/v1/inventory/financial-events", inventoryFinancialEventRouter);
app.use("/api/v1/inventory/stock-takes", inventoryStockTakeRouter);
app.use(
  "/api/v1/inventory/stock-take-schedules",
  inventoryStockTakeScheduleRouter
);
app.use("/api/v1/inventory/alert-configs", inventoryAlertConfigRouter);
app.use("/api/v1/inventory/retention-config", inventoryAlertConfigRouter);
app.use("/api/v1/inventory/supplier-ratings", inventorySupplierRatingRouter);

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Atlantic Pearl Hotel and Resort API",
      version: "1.0.0",
    },
  },
  apis: ["./src/**/*.ts"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Invalid route accessed: ${req.originalUrl}`);
  next(
    new AppError(
      `${req.originalUrl} does not exist for ${req.method} requests`,
      StatusCodes.NOT_FOUND
    )
  );
});

// import * as bcrypt from "bcrypt";
// import { generateIdentifyToken } from "./util/generateUUID.util";

// const func = async () => {
//   const token = `atlantic-pearl-api-token_${await generateIdentifyToken()}`;
//   const tokenHash = await bcrypt.hash(token, 12);
//   console.log("Token plain:", token);
//   console.log("Token hash:", tokenHash);
// };

// func();

app.use(globalErrorController);
