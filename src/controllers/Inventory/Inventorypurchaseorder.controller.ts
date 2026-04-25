import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryPurchaseOrderModel } from "models/Inventory/Inventorypurchaseorder.model";
import { AppError } from "../../util/AppError.util";
import { appResponder } from "../../util/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { logUserActivity } from "../../util/logUserActivity.util";
import { InventoryFinancialEventModel } from "../../models/Inventory/Inventoryfinancialevent.model";
import { generatePurchaseOrderPdf } from "../../util/po.util";
import mongoose from "mongoose";

const CRUDInventroyPurchaseOrder: CRUD = new CRUD(InventoryPurchaseOrderModel);

const createInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.create(req.body, res, req);
  }
);

const readOneInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.readOne(req.params.id, res, [], req);
  }
);

const readAllInventroyPurchaseOrders = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.readAll(res, req, 1, 100, []);
  }
);

const updateInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.update(req.params.id, res, req);
  }
);

const deleteInventroyPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyPurchaseOrder.delete(req.params.id, res, req);
  }
);

const submitPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const po = await InventoryPurchaseOrderModel.findById(id)
      .populate("supplier", "name code")
      .populate("location", "name code");

    if (!po) {
      return next(
        new AppError("Purchase order not found", StatusCodes.NOT_FOUND)
      );
    }

    if (po.status !== "draft") {
      return next(
        new AppError(
          `Only draft purchase orders can be submitted. Current status is '${po.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    if (po.items.length === 0) {
      return next(
        new AppError(
          "Cannot submit a purchase order with no line items",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { status: po.status };

    po.status = "pending";
    po.updatedBy = res.locals.user._id;
    await po.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} submitted purchase order ${po.poNumber} for approval`,
      "inventorypurchaseorders",
      String(po._id),
      JSON.stringify(before),
      JSON.stringify({ status: "pending" })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Purchase order ${po.poNumber} submitted for hotel manager approval`,
        data: { po },
      },
      res
    );
  }
);

const approvePurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const po = await InventoryPurchaseOrderModel.findById(id)
      .populate("supplier", "name code")
      .populate("location", "name code");

    if (!po) {
      return next(
        new AppError("Purchase order not found", StatusCodes.NOT_FOUND)
      );
    }

    if (po.status !== "pending") {
      return next(
        new AppError(
          `Only pending purchase orders can be approved. Current status is '${po.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const before = { status: po.status };

      po.status = "approved";
      po.approvedBy = res.locals.user._id;
      po.updatedBy = res.locals.user._id;
      await po.save({ session });

      // Write financial event -- po_approved creates a commitment in the ledger
      await InventoryFinancialEventModel.create(
        [
          {
            type: "po_approved",
            amountInCFA: po.totalAmountInCFA,
            direction: "debit",
            supplier: po.supplier,
            referenceModel: "InventoryPurchaseOrder",
            referenceId: po._id,
            referenceNumber: po.poNumber,
            location: po.location,
            description: `PO ${
              po.poNumber
            } approved -- commitment of ${po.totalAmountInCFA.toLocaleString()} CFA to ${
              (po.supplier as any)?.name ?? "supplier"
            }`,
            performedBy: res.locals.user._id,
            eventDate: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} approved purchase order ${po.poNumber}`,
        "inventorypurchaseorders",
        String(po._id),
        JSON.stringify(before),
        JSON.stringify({ status: "approved", approvedBy: res.locals.user._id })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: `Purchase order ${po.poNumber} approved successfully`,
          data: { po },
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

const rejectPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError("A rejection reason is required", StatusCodes.BAD_REQUEST)
      );
    }

    const po = await InventoryPurchaseOrderModel.findById(id).populate(
      "supplier",
      "name code"
    );

    if (!po) {
      return next(
        new AppError("Purchase order not found", StatusCodes.NOT_FOUND)
      );
    }

    if (po.status !== "pending") {
      return next(
        new AppError(
          `Only pending purchase orders can be rejected. Current status is '${po.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { status: po.status };

    po.status = "rejected";
    po.rejectionReason = reason.trim();
    po.rejectedBy = res.locals.user._id;
    po.updatedBy = res.locals.user._id;

    // rejectedAt is stamped by the model pre-save hook
    await po.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} rejected purchase order ${po.poNumber}`,
      "inventorypurchaseorders",
      String(po._id),
      JSON.stringify(before),
      JSON.stringify({ status: "rejected", reason: reason.trim() })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Purchase order ${po.poNumber} has been rejected`,
        data: { po },
      },
      res
    );
  }
);

const markPurchaseOrderSent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const po = await InventoryPurchaseOrderModel.findById(id).populate(
      "supplier",
      "name code contactPerson email phoneNumber"
    );

    if (!po) {
      return next(
        new AppError("Purchase order not found", StatusCodes.NOT_FOUND)
      );
    }

    if (po.status !== "approved") {
      return next(
        new AppError(
          `Only approved purchase orders can be marked as sent. Current status is '${po.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const before = { status: po.status };

    po.status = "sent";
    po.updatedBy = res.locals.user._id;

    // sentAt is stamped by the model pre-save hook
    await po.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} marked purchase order ${po.poNumber} as sent to supplier`,
      "inventorypurchaseorders",
      String(po._id),
      JSON.stringify(before),
      JSON.stringify({ status: "sent", sentAt: po.sentAt })
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Purchase order ${po.poNumber} marked as sent to ${
          (po.supplier as any)?.name ?? "supplier"
        }. Expected delivery: ${po.expectedDeliveryDate.toLocaleDateString(
          "en-GB"
        )}.`,
        data: { po },
      },
      res
    );
  }
);

const cancelPurchaseOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError(
          "A cancellation reason is required",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const po = await InventoryPurchaseOrderModel.findById(id).populate(
      "supplier",
      "name code"
    );

    if (!po) {
      return next(
        new AppError("Purchase order not found", StatusCodes.NOT_FOUND)
      );
    }

    const cancellableStatuses = ["draft", "pending", "approved", "sent"];
    if (!cancellableStatuses.includes(po.status)) {
      return next(
        new AppError(
          `Purchase order cannot be cancelled. Current status is '${po.status}'. Only draft, pending, approved, or sent orders can be cancelled.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // If the PO was approved or sent, the commitment exists in the ledger
    // and must be reversed with a credit event
    const hadCommitment = ["approved", "sent"].includes(po.status);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const before = { status: po.status };

      po.status = "cancelled";
      po.updatedBy = res.locals.user._id;

      // Append cancellation reason to notes to preserve history
      po.notes = po.notes
        ? `${po.notes} | CANCELLED: ${reason.trim()}`
        : `CANCELLED: ${reason.trim()}`;

      await po.save({ session });

      if (hadCommitment) {
        await InventoryFinancialEventModel.create(
          [
            {
              type: "po_cancelled",
              amountInCFA: po.totalAmountInCFA,
              direction: "credit",
              supplier: po.supplier,
              referenceModel: "InventoryPurchaseOrder",
              referenceId: po._id,
              referenceNumber: po.poNumber,
              location: po.location,
              description: `PO ${
                po.poNumber
              } cancelled -- commitment of ${po.totalAmountInCFA.toLocaleString()} CFA reversed. Reason: ${reason.trim()}`,
              performedBy: res.locals.user._id,
              eventDate: new Date(),
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} cancelled purchase order ${po.poNumber}`,
        "inventorypurchaseorders",
        String(po._id),
        JSON.stringify(before),
        JSON.stringify({
          status: "cancelled",
          reason: reason.trim(),
          hadCommitment,
        })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: `Purchase order ${po.poNumber} has been cancelled${
            hadCommitment
              ? ". Financial commitment reversed in the ledger."
              : "."
          }`,
          data: { po },
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

const downloadPurchaseOrderPdf = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const po = await InventoryPurchaseOrderModel.findById(id)
      .populate(
        "supplier",
        "name code contactPerson email phoneNumber address paymentTerms leadTimeDays"
      )
      .populate("location", "name code")
      .populate("approvedBy", "name email")
      .populate("createdBy", "name email")
      .populate("items.item", "name sku unitOfMeasure");

    if (!po) {
      return next(
        new AppError("Purchase order not found", StatusCodes.NOT_FOUND)
      );
    }

    const pdfData = {
      poNumber: po.poNumber,
      status: po.status,
      supplier: po.supplier as any,
      location: po.location as any,
      expectedDeliveryDate: po.expectedDeliveryDate,
      isOverdue: po.isOverdue,
      items: po.items.map((item: any) => ({
        name: item.item?.name ?? "Unknown",
        sku: item.item?.sku ?? "N/A",
        unit: item.item?.unitOfMeasure ?? "N/A",
        quantityOrdered: item.quantityOrdered,
        unitCostInCFA: item.unitCostInCFA,
        totalCostInCFA: item.totalCostInCFA,
        notes: item.notes ?? null,
      })),
      totalAmountInCFA: po.totalAmountInCFA,
      approvedBy: po.approvedBy as any,
      approvedAt: po.approvedAt ?? null,
      createdBy: po.createdBy as any,
      sentAt: po.sentAt ?? null,
      notes: po.notes ?? null,
      generatedAt: new Date(),
      generatedBy: res.locals.user.name,
    };

    const pdfBuffer = await generatePurchaseOrderPdf(pdfData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${po.poNumber}.pdf"`
    );
    res.send(pdfBuffer);
  }
);

export const inventroyPurchaseOrderControllers = {
  createInventroyPurchaseOrder,
  readOneInventroyPurchaseOrder,
  readAllInventroyPurchaseOrders,
  updateInventroyPurchaseOrder,
  deleteInventroyPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  markPurchaseOrderSent,
  cancelPurchaseOrder,
  downloadPurchaseOrderPdf,
};
