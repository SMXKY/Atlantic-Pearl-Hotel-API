import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryRequisitionModel } from "models/Inventory/Inventoryrequisition.model";
import { logUserActivity } from "../../util/logUserActivity.util";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../util/AppError.util";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";
import { InventoryMovementModel } from "../../models/Inventory/Inventorymovement.model";
import mongoose from "mongoose";
import { allPermissions } from "../../types/Permissions.type";
import { fireInventoryAlert } from "../../util/inventoryAlert.util";
import { NotificationType } from "models/Notifications/Notification.model";
import { sendNotification } from "../../util/sendNotification.util";

const CRUDInventroyRequisition: CRUD = new CRUD(InventoryRequisitionModel);

const createInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.create(req.body, res, req);
  }
);

const readOneInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyRequisitions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.update(req.params.id, res, req);
  }
);

const deleteInventroyRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRequisition.delete(req.params.id, res, req);
  }
);

const approveRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { items: issuanceItems, notes } = req.body;

    if (!Array.isArray(issuanceItems) || issuanceItems.length === 0) {
      return next(
        new AppError(
          "items array is required with at least one entry specifying quantityIssued per item",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const requisition = await InventoryRequisitionModel.findById(id)
      .populate("items.item", "name sku unitOfMeasure")
      .populate("department", "name")
      .populate("location", "name code");

    if (!requisition) {
      return next(new AppError("Requisition not found", StatusCodes.NOT_FOUND));
    }

    if (requisition.status !== "pending") {
      return next(
        new AppError(
          `Only pending requisitions can be approved. Current status is '${requisition.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Build a lookup map from the body for quick access
    const issuanceMap: Record<string, number> = {};
    for (const entry of issuanceItems) {
      if (!entry.itemId || entry.quantityIssued === undefined) {
        return next(
          new AppError(
            "Each entry in items must include itemId and quantityIssued",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      if (entry.quantityIssued < 0) {
        return next(
          new AppError(
            "quantityIssued cannot be negative",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      issuanceMap[entry.itemId] = entry.quantityIssued;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let isPartial = false;

      for (const lineItem of requisition.items) {
        const itemId =
          (lineItem.item as any)._id?.toString() ?? lineItem.item.toString();
        const quantityIssued = issuanceMap[itemId] ?? 0;

        if (quantityIssued === 0) {
          isPartial = true;
          continue;
        }

        if (quantityIssued > lineItem.quantityRequested) {
          await session.abortTransaction();
          return next(
            new AppError(
              `Cannot issue more than requested. Item "${
                (lineItem.item as any)?.name
              }" requested ${
                lineItem.quantityRequested
              } but issuance is ${quantityIssued}`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        if (quantityIssued < lineItem.quantityRequested) {
          isPartial = true;
        }

        // Fetch the stock record for this item at the requisition's location
        const itemLocation = await InventoryItemLocationModel.findOne({
          item: lineItem.item,
          location: requisition.location,
        }).session(session);

        if (!itemLocation) {
          await session.abortTransaction();
          return next(
            new AppError(
              `No stock record found for "${
                (lineItem.item as any)?.name
              }" at this location`,
              StatusCodes.NOT_FOUND
            )
          );
        }

        if (itemLocation.isBlocked) {
          await session.abortTransaction();
          return next(
            new AppError(
              `Stock issues are blocked for "${
                (lineItem.item as any)?.name
              }" at this location: ${
                itemLocation.blockedReason ?? "No reason given"
              }`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        if (itemLocation.currentStock < quantityIssued) {
          await session.abortTransaction();
          return next(
            new AppError(
              `Insufficient stock for "${
                (lineItem.item as any)?.name
              }". Available: ${
                itemLocation.currentStock
              }, requested: ${quantityIssued}`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        const stockBefore = itemLocation.currentStock;

        // Consume FIFO cost batches
        let remainingToIssue = quantityIssued;
        let weightedCostTotal = 0;

        for (const batch of itemLocation.costBatches) {
          if (remainingToIssue <= 0) break;

          const consumeFromBatch = Math.min(
            batch.remainingQuantity,
            remainingToIssue
          );

          weightedCostTotal += consumeFromBatch * batch.unitCostInCFA;
          batch.remainingQuantity -= consumeFromBatch;
          remainingToIssue -= consumeFromBatch;
        }

        // Remove exhausted batches
        itemLocation.costBatches = itemLocation.costBatches.filter(
          (b) => b.remainingQuantity > 0
        );

        itemLocation.currentStock -= quantityIssued;
        itemLocation.updatedBy = res.locals.user._id;
        await itemLocation.save({ session });

        const unitCostInCFA = parseFloat(
          (weightedCostTotal / quantityIssued).toFixed(2)
        );
        const totalCostInCFA = parseFloat(weightedCostTotal.toFixed(2));

        // Update the requisition line item with issued quantities and cost
        lineItem.quantityIssued = quantityIssued;
        lineItem.unitCostInCFA = unitCostInCFA;
        lineItem.totalCostInCFA = totalCostInCFA;

        // Create the stock movement record
        await InventoryMovementModel.create(
          [
            {
              type: "issue",
              item: lineItem.item,
              location: requisition.location,
              quantity: quantityIssued,
              unitCostInCFA,
              totalCostInCFA,
              referenceModel: "InventoryRequisition",
              referenceId: requisition._id,
              performedBy: res.locals.user._id,
              stockBefore,
              stockAfter: itemLocation.currentStock,
              notes: `Issued to ${
                (requisition.department as any)?.name ?? "department"
              } via ${requisition.requisitionNumber}`,
            },
          ],
          { session }
        );
      }

      requisition.status = isPartial ? "partial" : "approved";
      requisition.reviewedBy = res.locals.user._id;
      if (notes) requisition.notes = notes.trim();

      // reviewedAt is stamped by the model pre-save hook
      await requisition.save({ session });

      await session.commitTransaction();

      // Notify the requester of the outcome
      await sendNotification({
        userIds: [requisition.requestedBy.toString()],
        title: isPartial
          ? `⚠️ Requisition Partially Fulfilled: ${requisition.requisitionNumber}`
          : `✅ Requisition Approved: ${requisition.requisitionNumber}`,
        message: isPartial
          ? `Your requisition ${requisition.requisitionNumber} has been partially fulfilled. Some items were unavailable. Check the requisition for details.`
          : `Your requisition ${requisition.requisitionNumber} has been fully approved and stock has been issued to your department.`,
        type: isPartial
          ? NotificationType.INVENTORY_WARNING
          : NotificationType.SUCCESS,
        entityRef: {
          model: "InventoryRequisition",
          id: String(requisition._id),
        },
        redirectUrl: `/inventory/requisitions/${requisition._id}`,
      });

      // Check alert thresholds for each issued item
      for (const lineItem of requisition.items) {
        if (!lineItem.quantityIssued || lineItem.quantityIssued === 0) continue;
        const updatedIL = await InventoryItemLocationModel.findOne({
          item: (lineItem.item as any)._id ?? lineItem.item,
          location: requisition.location,
        })
          .select("currentStock")
          .lean();
        if (updatedIL) {
          await fireInventoryAlert(
            ((lineItem.item as any)._id ?? lineItem.item).toString(),
            (requisition.location as any)._id?.toString() ??
              requisition.location.toString(),
            updatedIL.currentStock,
            String(res.locals.user._id)
          );
        }
      }

      const departmentName =
        (requisition.department as any)?.name ?? "the department";
      const locationName =
        (requisition.location as any)?.name ?? "the location";

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} ${
          isPartial ? "partially fulfilled" : "approved"
        } requisition ${
          requisition.requisitionNumber
        } for ${departmentName} at ${locationName}`,
        "inventoryrequisitions",
        String(requisition._id),
        JSON.stringify({ status: "pending" }),
        JSON.stringify({
          status: requisition.status,
          reviewedBy: res.locals.user._id,
        })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: isPartial
            ? `Requisition ${requisition.requisitionNumber} partially fulfilled. Some items were unavailable.`
            : `Requisition ${requisition.requisitionNumber} approved and stock issued to ${departmentName}`,
          data: { requisition },
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

const rejectRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError("A rejection reason is required", StatusCodes.BAD_REQUEST)
      );
    }

    const requisition = await InventoryRequisitionModel.findById(id)
      .populate("department", "name")
      .populate("location", "name code");

    if (!requisition) {
      return next(new AppError("Requisition not found", StatusCodes.NOT_FOUND));
    }

    if (requisition.status !== "pending") {
      return next(
        new AppError(
          `Only pending requisitions can be rejected. Current status is '${requisition.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { status: requisition.status };

    requisition.status = "rejected";
    requisition.rejectionReason = reason.trim();
    requisition.reviewedBy = res.locals.user._id;

    // reviewedAt is stamped by the model pre-save hook
    await requisition.save();

    // Notify the requester of the rejection
    await sendNotification({
      userIds: [requisition.requestedBy.toString()],
      title: `❌ Requisition Rejected: ${requisition.requisitionNumber}`,
      message: `Your requisition ${
        requisition.requisitionNumber
      } has been rejected. Reason: ${reason.trim()}.`,
      type: NotificationType.ERROR,
      entityRef: { model: "InventoryRequisition", id: String(requisition._id) },
      redirectUrl: `/inventory/requisitions/${requisition._id}`,
    });

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} rejected requisition ${requisition.requisitionNumber}`,
      "inventoryrequisitions",
      String(requisition._id),
      JSON.stringify(before),
      JSON.stringify({ status: "rejected", reason: reason.trim() })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Requisition ${requisition.requisitionNumber} has been rejected`,
        data: { requisition },
      },
      res
    );
  }
);

const cancelRequisition = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const requisition = await InventoryRequisitionModel.findById(id).populate(
      "department",
      "name"
    );

    if (!requisition) {
      return next(new AppError("Requisition not found", StatusCodes.NOT_FOUND));
    }

    if (requisition.status !== "pending") {
      return next(
        new AppError(
          `Only pending requisitions can be cancelled. Current status is '${requisition.status}'. If stock has already been issued, raise a return movement instead.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Only the requesting department or a store manager can cancel.
    // Department staff can only cancel their own department's requisitions.
    // Store managers and superadmins can cancel any.
    const userHasGlobalAccess = res.locals.user.permissions?.includes(
      allPermissions.inventoryRequisitions.approve
    );

    const isOwnDepartment =
      requisition.requestedBy.toString() === res.locals.user._id.toString();

    if (!userHasGlobalAccess && !isOwnDepartment) {
      return next(
        new AppError(
          "You can only cancel your own requisitions",
          StatusCodes.FORBIDDEN
        )
      );
    }

    const before = { status: requisition.status };

    requisition.status = "cancelled";
    await requisition.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} cancelled requisition ${requisition.requisitionNumber}`,
      "inventoryrequisitions",
      String(requisition._id),
      JSON.stringify(before),
      JSON.stringify({ status: "cancelled" })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Requisition ${requisition.requisitionNumber} has been cancelled`,
        data: { requisition },
      },
      res
    );
  }
);

export const inventroyRequisitionControllers = {
  createInventroyRequisition,
  readOneInventroyRequisition,
  readAllInventroyRequisitions,
  updateInventroyRequisition,
  deleteInventroyRequisition,
  approveRequisition,
  rejectRequisition,
  cancelRequisition,
};
