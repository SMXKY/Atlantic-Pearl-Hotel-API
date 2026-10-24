import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../util/catchAsync";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { allPermissions } from "../../types/Permissions.type";

import { computeDefaultDashboard } from "./userDashboards.util";
import { computeAdminDashboard } from "./defaultDashboard.content";
import { computeParkingDashboard } from "./parkingDashboard.content";
import { computeRestaurantDashboard } from "./restaurantDashboard.content";
import { computeInventoryDashboard } from "./inventoryDashboard.content";
import { computeHRDashboard } from "./hrDashboard.content";
import { computeFinanceDashboard } from "./financeDashboard.content";

export const getDashboard = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    const permissions: string[] = user.permissions ?? [];

    const has = (permission: string) => permissions.includes(permission);

    // Always computed — every user gets this regardless of role
    const result: Record<string, any> = {
      default: await computeDefaultDashboard(user._id, user.userType),
    };

    // Run all eligible dashboard computations in parallel
    const dashboardTasks: Promise<void>[] = [];

    if (has(allPermissions.dashboards.viewFrontDesk)) {
      dashboardTasks.push(
        computeAdminDashboard().then((data) => {
          result.frontDesk = data;
        })
      );
    }

    if (has(allPermissions.dashboards.viewParking)) {
      dashboardTasks.push(
        computeParkingDashboard().then((data) => {
          result.parking = data;
        })
      );
    }

    if (has(allPermissions.dashboards.viewRestaurant)) {
      dashboardTasks.push(
        computeRestaurantDashboard().then((data) => {
          result.restaurant = data;
        })
      );
    }

    if (has(allPermissions.dashboards.viewInventory)) {
      dashboardTasks.push(
        computeInventoryDashboard().then((data) => {
          result.inventory = data;
        })
      );
    }

    if (has(allPermissions.dashboards.viewHR)) {
      dashboardTasks.push(
        computeHRDashboard().then((data) => {
          result.hr = data;
        })
      );
    }

    if (has(allPermissions.dashboards.viewFinance)) {
      dashboardTasks.push(
        computeFinanceDashboard().then((data) => {
          result.finance = data;
        })
      );
    }

    await Promise.all(dashboardTasks);

    // Tell the frontend which dashboards are available and in what order
    // so it can build the switcher without guessing
    result.meta = {
      availableDashboards: [
        has(allPermissions.dashboards.viewFrontDesk) && "frontDesk",
        has(allPermissions.dashboards.viewParking) && "parking",
        has(allPermissions.dashboards.viewRestaurant) && "restaurant",
        has(allPermissions.dashboards.viewInventory) && "inventory",
        has(allPermissions.dashboards.viewHR) && "hr",
        has(allPermissions.dashboards.viewFinance) && "finance",
      ].filter(Boolean),
    };

    return appResponder(StatusCodes.OK, result, res);
  }
);
