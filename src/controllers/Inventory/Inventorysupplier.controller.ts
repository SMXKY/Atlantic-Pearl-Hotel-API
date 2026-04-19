import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { catchAsync } from "../../util/catchAsync";
import { AppError } from "../../util/AppError.util";
import { appResponder } from "../../util/appResponder.util";
import { logUserActivity } from "../../util/logUserActivity.util";
import { InventorySupplierModel } from "../../models/Inventory/Inventorysupplier.model";
import { InventorySupplierRatingModel } from "../../models/Inventory/Inventorysuplierrating.model";
import { CRUD } from "../../util/Crud.util";

const CRUDInventorySupplier = new CRUD(InventorySupplierModel);

const createInventorySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventorySupplier.create(req.body, res, req);
  }
);

const readOneInventorySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventorySupplier.readOne(req.params.id, res, [], req);
  }
);

const readAllInventorySuppliers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventorySupplier.readAll(res, req, 1, 100, []);
  }
);

const updateInventorySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventorySupplier.update(req.params.id, res, req);
  }
);

const deleteInventorySupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventorySupplier.delete(req.params.id, res, req);
  }
);

const blacklistSupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError(
          "A reason is required when blacklisting a supplier",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const supplier = await InventorySupplierModel.findById(id);
    if (!supplier) {
      return next(new AppError("Supplier not found", StatusCodes.NOT_FOUND));
    }

    if (supplier.isBlacklisted) {
      return next(
        new AppError(
          "This supplier is already blacklisted",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const supplierBefore = { ...supplier.toObject() };

    supplier.isBlacklisted = true;
    supplier.blacklistReason = reason.trim();
    supplier.updatedBy = res.locals.user._id;
    await supplier.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} blacklisted supplier "${supplier.name}"`,
      "inventorysuppliers",
      String(supplier._id),
      JSON.stringify(supplierBefore),
      JSON.stringify(supplier.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Supplier "${supplier.name}" has been blacklisted`,
        data: { supplier },
      },
      res
    );
  }
);

const unblacklistSupplier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const supplier = await InventorySupplierModel.findById(id);
    if (!supplier) {
      return next(new AppError("Supplier not found", StatusCodes.NOT_FOUND));
    }

    if (!supplier.isBlacklisted) {
      return next(
        new AppError(
          "This supplier is not blacklisted",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const supplierBefore = { ...supplier.toObject() };

    supplier.isBlacklisted = false;
    supplier.updatedBy = res.locals.user._id;
    await supplier.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} removed supplier "${supplier.name}" from the blacklist`,
      "inventorysuppliers",
      String(supplier._id),
      JSON.stringify(supplierBefore),
      JSON.stringify(supplier.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Supplier "${supplier.name}" has been removed from the blacklist`,
        data: { supplier },
      },
      res
    );
  }
);

const getSupplierPerformance = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const supplier = await InventorySupplierModel.findById(id);
    if (!supplier) {
      return next(new AppError("Supplier not found", StatusCodes.NOT_FOUND));
    }

    const ratingStats = await InventorySupplierRatingModel.aggregate([
      { $match: { supplier: supplier._id } },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          averageDeliveryTimeScore: { $avg: "$deliveryTimeScore" },
          averageQualityScore: { $avg: "$qualityScore" },
          averagePackagingScore: { $avg: "$packagingScore" },
          // Distribution: how many 1s, 2s, 3s, 4s, 5s
          fiveStars: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          fourStars: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          threeStars: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          twoStars: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
        },
      },
    ]);

    const recentRatings = await InventorySupplierRatingModel.find({
      supplier: supplier._id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("ratedBy", "name")
      .populate("goodsReceipt", "grnNumber deliveryDate");

    const stats = ratingStats[0] ?? {
      totalRatings: 0,
      averageRating: null,
      averageDeliveryTimeScore: null,
      averageQualityScore: null,
      averagePackagingScore: null,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    const roundAvg = (val: number | null) =>
      val !== null ? parseFloat(val.toFixed(1)) : null;

    appResponder(
      StatusCodes.OK,
      {
        message: "Supplier performance summary retrieved successfully",
        data: {
          supplier,
          performance: {
            totalDeliveries: supplier.totalDeliveries,
            onTimeDeliveries: supplier.onTimeDeliveries,
            lateDeliveries: supplier.lateDeliveries,
            qualityIssues: supplier.qualityIssues,
            onTimeRate:
              supplier.totalDeliveries > 0
                ? parseFloat(
                    (
                      (supplier.onTimeDeliveries / supplier.totalDeliveries) *
                      100
                    ).toFixed(1)
                  )
                : null,
          },
          ratings: {
            totalRatings: stats.totalRatings,
            averageRating: roundAvg(stats.averageRating),
            breakdown: {
              deliveryTime: roundAvg(stats.averageDeliveryTimeScore),
              quality: roundAvg(stats.averageQualityScore),
              packaging: roundAvg(stats.averagePackagingScore),
            },
            distribution: {
              fiveStars: stats.fiveStars,
              fourStars: stats.fourStars,
              threeStars: stats.threeStars,
              twoStars: stats.twoStars,
              oneStar: stats.oneStar,
            },
            recentRatings,
          },
        },
      },
      res
    );
  }
);

export const inventorySupplierControllers = {
  createInventorySupplier,
  readOneInventorySupplier,
  readAllInventorySuppliers,
  updateInventorySupplier,
  deleteInventorySupplier,
  blacklistSupplier,
  unblacklistSupplier,
  getSupplierPerformance,
};
