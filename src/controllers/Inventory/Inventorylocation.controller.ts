import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";

import { catchAsync } from "../../util/catchAsync";
import { AppError } from "../../util/AppError.util";
import { appResponder } from "../../util/appResponder.util";
import { logUserActivity } from "../../util/logUserActivity.util";
import { InventoryLocationModel } from "../../models/Inventory/Inventorylocation.model";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";
import { DepartmentModel } from "../../models/HR/Department.model";
import { CRUD } from "../../util/Crud.util";

const CRUDInventoryLocation = new CRUD(InventoryLocationModel);

const createInventoryLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryLocation.create(req.body, res, req);
  }
);

const readOneInventoryLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryLocation.readOne(
      req.params.id,
      res,
      ["departments", "createdBy", "updatedBy"],
      req
    );
  }
);

const readAllInventoryLocations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryLocation.readAll(res, req, 1, 100, [
      "departments",
      "createdBy",
      "updatedBy",
    ]);
  }
);

const updateInventoryLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryLocation.update(req.params.id, res, req);
  }
);

const deleteInventoryLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryLocation.delete(req.params.id, res, req);
  }
);

const linkDepartment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { departmentId } = req.body;

    if (!departmentId) {
      return next(
        new AppError("departmentId is required", StatusCodes.BAD_REQUEST)
      );
    }

    const department = await DepartmentModel.findById(departmentId);
    if (!department) {
      return next(
        new AppError(
          "Department not found in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const location = await InventoryLocationModel.findById(id);
    if (!location) {
      return next(
        new AppError("Inventory location not found", StatusCodes.NOT_FOUND)
      );
    }

    const alreadyLinked = location.departments.some(
      (deptId) => deptId.toString() === departmentId
    );

    if (alreadyLinked) {
      return next(
        new AppError(
          `Department "${department.name}" is already linked to this location`,
          StatusCodes.CONFLICT
        )
      );
    }

    const locationBefore = { ...location.toObject() };

    location.departments.push(new mongoose.Types.ObjectId(departmentId));
    location.updatedBy = res.locals.user._id;
    await location.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} linked department "${department.name}" to location "${location.name}"`,
      "inventorylocations",
      String(location._id),
      JSON.stringify(locationBefore),
      JSON.stringify(location.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Department "${department.name}" linked to location "${location.name}" successfully`,
        data: { location },
      },
      res
    );
  }
);

const unlinkDepartment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { departmentId } = req.body;

    if (!departmentId) {
      return next(
        new AppError("departmentId is required", StatusCodes.BAD_REQUEST)
      );
    }

    const location = await InventoryLocationModel.findById(id);
    if (!location) {
      return next(
        new AppError("Inventory location not found", StatusCodes.NOT_FOUND)
      );
    }

    const isLinked = location.departments.some(
      (deptId) => deptId.toString() === departmentId
    );

    if (!isLinked) {
      return next(
        new AppError(
          "This department is not linked to the location",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const locationBefore = { ...location.toObject() };

    location.departments = location.departments.filter(
      (deptId) => deptId.toString() !== departmentId
    ) as mongoose.Types.ObjectId[];

    location.updatedBy = res.locals.user._id;
    await location.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} unlinked a department from location "${location.name}"`,
      "inventorylocations",
      String(location._id),
      JSON.stringify(locationBefore),
      JSON.stringify(location.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Department unlinked from location "${location.name}" successfully`,
        data: { location },
      },
      res
    );
  }
);

const deactivateLocation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const location = await InventoryLocationModel.findById(id);
    if (!location) {
      return next(
        new AppError("Inventory location not found", StatusCodes.NOT_FOUND)
      );
    }

    if (!location.isActive) {
      return next(
        new AppError(
          "This location is already inactive",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Check for active stock at this location
    const activeStockCount = await InventoryItemLocationModel.countDocuments({
      location: id,
      currentStock: { $gt: 0 },
    });

    if (activeStockCount > 0) {
      return next(
        new AppError(
          `Cannot deactivate this location. It still has ${activeStockCount} item(s) with stock on hand. Transfer or deplete all stock before deactivating.`,
          StatusCodes.CONFLICT
        )
      );
    }

    const locationBefore = { ...location.toObject() };

    location.isActive = false;
    location.updatedBy = res.locals.user._id;
    await location.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} deactivated inventory location "${location.name}"`,
      "inventorylocations",
      String(location._id),
      JSON.stringify(locationBefore),
      JSON.stringify(location.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Location "${location.name}" has been deactivated successfully`,
        data: { location },
      },
      res
    );
  }
);

export const inventoryLocationControllers = {
  createInventoryLocation,
  readOneInventoryLocation,
  readAllInventoryLocations,
  updateInventoryLocation,
  deleteInventoryLocation,
  linkDepartment,
  unlinkDepartment,
  deactivateLocation,
};
