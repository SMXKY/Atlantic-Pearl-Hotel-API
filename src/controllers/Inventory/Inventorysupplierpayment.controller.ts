import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventorySupplierPaymentModel } from "models/Inventory/Inventorysupplierpayment.model";
import { logUserActivity } from "../../util/logUserActivity.util";
import { AppError } from "../../util/AppError.util";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { InventoryFinancialEventModel } from "../../models/Inventory/Inventoryfinancialevent.model";
import { InventoryGoodsReceiptModel } from "../../models/Inventory/Inventorygoodsreceipt.model";
import { InventoryBudgetModel } from "../../models/Inventory/Inventorybudget.model";
import { fireBudgetAlert } from "../../util/inventoryAlert.util";
import mongoose from "mongoose";

const CRUDInventroySupplierPayment: CRUD = new CRUD(
  InventorySupplierPaymentModel
);

const createInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.create(req.body, res, req);
  }
);

const readOneInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroySupplierPayments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.readAll(res, req, 1, 100, []);
  }
);

const updateInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.update(req.params.id, res, req);
  }
);

const deleteInventroySupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroySupplierPayment.delete(req.params.id, res, req);
  }
);

const confirmSupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const payment = await InventorySupplierPaymentModel.findById(id)
      .populate("supplier", "name code")
      .populate({
        path: "goodsReceipt",
        select: "grnNumber totalAmountInCFA location",
        populate: { path: "location", select: "name code" },
      });

    if (!payment) {
      return next(
        new AppError("Supplier payment not found", StatusCodes.NOT_FOUND)
      );
    }

    if (payment.status !== "pending") {
      return next(
        new AppError(
          `Only pending payments can be confirmed. Current status is '${payment.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const before = { status: payment.status };

      payment.status = "confirmed";
      payment.confirmedBy = res.locals.user._id;

      // confirmedAt is stamped by the model pre-save hook
      await payment.save({ session });

      const grn = payment.goodsReceipt as any;
      const supplier = payment.supplier as any;

      // Write payment_made financial event to the ledger
      await InventoryFinancialEventModel.create(
        [
          {
            type: "payment_made",
            amountInCFA: payment.amountInCFA,
            direction: "debit",
            supplier: payment.supplier,
            referenceModel: "InventorySupplierPayment",
            referenceId: payment._id,
            referenceNumber: payment.paymentNumber,
            location: grn?.location?._id ?? undefined,
            description: `Payment ${
              payment.paymentNumber
            } confirmed -- ${payment.amountInCFA.toLocaleString()} CFA paid to ${
              supplier?.name ?? "supplier"
            } via ${payment.paymentMethod} for GRN ${grn?.grnNumber ?? "N/A"}`,
            performedBy: res.locals.user._id,
            eventDate: payment.paymentDate,
          },
        ],
        { session }
      );

      // Update budget actualSpendInCFA if a budget exists for this
      // location's category in the payment's month and year.
      // We use the GRN location to find associated item categories --
      // budget is updated at the category level, not the payment level directly.
      // This is a best-effort update: if no budget exists we skip silently.
      if (grn?.location?._id) {
        const paymentMonth = payment.paymentDate.getMonth() + 1;
        const paymentYear = payment.paymentDate.getFullYear();

        // Find all unique categories of items in this GRN
        const grnFull = await InventoryGoodsReceiptModel.findById(
          payment.goodsReceipt
        )
          .populate({
            path: "items.item",
            select: "category",
            populate: { path: "category", select: "_id" },
          })
          .session(session)
          .lean();

        if (grnFull) {
          const categoryIds = [
            ...new Set(
              grnFull.items
                .map((i: any) => i.item?.category?._id?.toString())
                .filter(Boolean)
            ),
          ];

          // Distribute payment proportionally across categories
          // based on the number of categories -- simple equal split.
          // This is a reasonable approximation for budget tracking.
          const splitAmount =
            categoryIds.length > 0
              ? parseFloat(
                  (payment.amountInCFA / categoryIds.length).toFixed(2)
                )
              : 0;

          for (const categoryId of categoryIds) {
            await InventoryBudgetModel.findOneAndUpdate(
              {
                category: categoryId,
                month: paymentMonth,
                year: paymentYear,
              },
              { $inc: { actualSpendInCFA: splitAmount } },
              { session }
            );
          }

          // Fire budget alerts for affected categories
          if (grnFull) {
            const paymentMonth = payment.paymentDate.getMonth() + 1;
            const paymentYear = payment.paymentDate.getFullYear();
            for (const categoryId of categoryIds) {
              await fireBudgetAlert(
                String(categoryId),
                paymentMonth,
                paymentYear
              );
            }
          }
        }
      }

      await session.commitTransaction();

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} confirmed payment ${
          payment.paymentNumber
        } of ${payment.amountInCFA.toLocaleString()} CFA to ${
          supplier?.name ?? "supplier"
        }`,
        "inventorysupplierpayments",
        String(payment._id),
        JSON.stringify(before),
        JSON.stringify({
          status: "confirmed",
          confirmedBy: res.locals.user._id,
        })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: `Payment ${
            payment.paymentNumber
          } of ${payment.amountInCFA.toLocaleString()} CFA confirmed successfully`,
          data: { payment },
        },
        res
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
);

const reverseSupplierPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError("A reversal reason is required", StatusCodes.BAD_REQUEST)
      );
    }

    const payment = await InventorySupplierPaymentModel.findById(id)
      .populate("supplier", "name code")
      .populate({
        path: "goodsReceipt",
        select: "grnNumber location",
        populate: { path: "location", select: "name code" },
      });

    if (!payment) {
      return next(
        new AppError("Supplier payment not found", StatusCodes.NOT_FOUND)
      );
    }

    if (payment.status !== "confirmed") {
      return next(
        new AppError(
          `Only confirmed payments can be reversed. Current status is '${payment.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const before = { status: payment.status };

      payment.status = "reversed";
      payment.reversalReason = reason.trim();
      payment.reversedBy = res.locals.user._id;

      // reversedAt is stamped by the model pre-save hook
      await payment.save({ session });

      const grn = payment.goodsReceipt as any;
      const supplier = payment.supplier as any;

      // Write payment_reversed financial event -- credit direction
      // to cancel out the original payment_made debit in the ledger
      await InventoryFinancialEventModel.create(
        [
          {
            type: "payment_reversed",
            amountInCFA: payment.amountInCFA,
            direction: "credit",
            supplier: payment.supplier,
            referenceModel: "InventorySupplierPayment",
            referenceId: payment._id,
            referenceNumber: payment.paymentNumber,
            location: grn?.location?._id ?? undefined,
            description: `Payment ${
              payment.paymentNumber
            } reversed -- ${payment.amountInCFA.toLocaleString()} CFA credit issued for ${
              supplier?.name ?? "supplier"
            }. Reason: ${reason.trim()}`,
            performedBy: res.locals.user._id,
            eventDate: new Date(),
          },
        ],
        { session }
      );

      // Undo the budget impact of the original confirmed payment
      if (grn?.location?._id) {
        const paymentMonth = payment.paymentDate.getMonth() + 1;
        const paymentYear = payment.paymentDate.getFullYear();

        const grnFull = await InventoryGoodsReceiptModel.findById(
          payment.goodsReceipt
        )
          .populate({
            path: "items.item",
            select: "category",
            populate: { path: "category", select: "_id" },
          })
          .session(session)
          .lean();

        if (grnFull) {
          const categoryIds = [
            ...new Set(
              grnFull.items
                .map((i: any) => i.item?.category?._id?.toString())
                .filter(Boolean)
            ),
          ];

          const splitAmount =
            categoryIds.length > 0
              ? parseFloat(
                  (payment.amountInCFA / categoryIds.length).toFixed(2)
                )
              : 0;

          for (const categoryId of categoryIds) {
            await InventoryBudgetModel.findOneAndUpdate(
              {
                category: categoryId,
                month: paymentMonth,
                year: paymentYear,
              },
              // Decrement -- but never allow actualSpendInCFA to go below 0
              [
                {
                  $set: {
                    actualSpendInCFA: {
                      $max: [
                        0,
                        { $subtract: ["$actualSpendInCFA", splitAmount] },
                      ],
                    },
                  },
                },
              ],
              { session }
            );
          }
        }
      }

      await session.commitTransaction();

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} reversed payment ${
          payment.paymentNumber
        } of ${payment.amountInCFA.toLocaleString()} CFA`,
        "inventorysupplierpayments",
        String(payment._id),
        JSON.stringify(before),
        JSON.stringify({
          status: "reversed",
          reversedBy: res.locals.user._id,
          reason: reason.trim(),
        })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: `Payment ${
            payment.paymentNumber
          } has been reversed. A credit of ${payment.amountInCFA.toLocaleString()} CFA has been recorded in the financial ledger.`,
          data: { payment },
        },
        res
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
);

export const inventroySupplierPaymentControllers = {
  createInventroySupplierPayment,
  readOneInventroySupplierPayment,
  readAllInventroySupplierPayments,
  updateInventroySupplierPayment,
  deleteInventroySupplierPayment,
  confirmSupplierPayment,
  reverseSupplierPayment,
};
