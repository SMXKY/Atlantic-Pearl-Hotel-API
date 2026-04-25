import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryGoodsReceiptModel } from "models/Inventory/Inventorygoodsreceipt.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { InventoryPurchaseOrderModel } from "../../models/Inventory/Inventorypurchaseorder.model";
import { InventoryItemLocationModel } from "../../models/Inventory/Inventoryitemlocation.model";
import { InventoryMovementModel } from "../../models/Inventory/Inventorymovement.model";
import { InventorySupplierModel } from "../../models/Inventory/Inventorysupplier.model";
import { InventoryFinancialEventModel } from "../../models/Inventory/Inventoryfinancialevent.model";
import { appResponder } from "../../util/appResponder.util";
import { logUserActivity } from "../../util/logUserActivity.util";
import { fireInventoryAlert } from "../../util/inventoryAlert.util";

import PdfPrinter from "pdfmake/src/printer";
import vfsFonts from "pdfmake/build/vfs_fonts";

const CRUDInventoryGoodsReceipt: CRUD = new CRUD(InventoryGoodsReceiptModel);

const createInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.create(req.body, res, req);
  }
);

const readOneInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.readOne(req.params.id, res, [], req);
  }
);

const readAllInventoryGoodsReceipts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.readAll(res, req, 1, 100, []);
  }
);

const updateInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.update(req.params.id, res, req);
  }
);

const deleteInventoryGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventoryGoodsReceipt.delete(req.params.id, res, req);
  }
);

const postGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const grn = await InventoryGoodsReceiptModel.findById(id);

    if (!grn) {
      return next(
        new AppError("Goods receipt not found", StatusCodes.NOT_FOUND)
      );
    }

    if (grn.status !== "draft") {
      return next(
        new AppError(
          `This goods receipt cannot be posted. Current status is '${grn.status}'. Only draft receipts can be posted.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const po = await InventoryPurchaseOrderModel.findById(grn.purchaseOrder);

    if (!po) {
      return next(
        new AppError(
          "Referenced purchase order not found",
          StatusCodes.NOT_FOUND
        )
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const lineItem of grn.items) {
        if (lineItem.isDamaged) continue;

        let itemLocation = await InventoryItemLocationModel.findOne({
          item: lineItem.item,
          location: grn.location,
        }).session(session);

        if (!itemLocation) {
          return next(
            new AppError(
              `Item ${lineItem.item} has not been set up at location ${grn.location}. Create an InventoryItemLocation record first.`,
              StatusCodes.BAD_REQUEST
            )
          );
        }

        const stockBefore = itemLocation.currentStock;

        itemLocation.costBatches.push({
          receivedAt: grn.deliveryDate,
          unitCostInCFA: lineItem.unitCostInCFA,
          remainingQuantity: lineItem.quantityReceived,
          expiryDate: lineItem.expiryDate,
        });

        itemLocation.currentStock += lineItem.quantityReceived;
        itemLocation.updatedBy = res.locals.user._id;
        await itemLocation.save({ session });

        await InventoryMovementModel.create(
          [
            {
              type: "receive",
              item: lineItem.item,
              location: grn.location,
              quantity: lineItem.quantityReceived,
              unitCostInCFA: lineItem.unitCostInCFA,
              totalCostInCFA: lineItem.totalCostInCFA,
              referenceModel: "InventoryGoodsReceipt",
              referenceId: grn._id,
              performedBy: res.locals.user._id,
              stockBefore,
              stockAfter: itemLocation.currentStock,
              notes: `Received via GRN ${grn.grnNumber}`,
            },
          ],
          { session }
        );
      }

      const allGRNsForPO = await InventoryGoodsReceiptModel.find({
        purchaseOrder: po._id,
        status: "posted",
      }).session(session);

      const receivedTotals: Record<string, number> = {};
      for (const postedGRN of [...allGRNsForPO]) {
        for (const item of postedGRN.items) {
          if (!item.isDamaged) {
            const key = item.item.toString();
            receivedTotals[key] =
              (receivedTotals[key] ?? 0) + item.quantityReceived;
          }
        }
      }

      for (const item of grn.items) {
        if (!item.isDamaged) {
          const key = item.item.toString();
          receivedTotals[key] =
            (receivedTotals[key] ?? 0) + item.quantityReceived;
        }
      }

      const fullyReceived = po.items.every(
        (poItem) =>
          (receivedTotals[poItem.item.toString()] ?? 0) >=
          poItem.quantityOrdered
      );

      po.status = fullyReceived ? "received" : "partial";
      await po.save({ session });

      const supplier = await InventorySupplierModel.findById(
        grn.supplier
      ).session(session);

      if (supplier) {
        supplier.totalDeliveries += 1;

        if (grn.isLateDelivery) {
          supplier.lateDeliveries += 1;
        } else {
          supplier.onTimeDeliveries += 1;
        }

        if (grn.hasQualityIssues) {
          supplier.qualityIssues += 1;
        }

        await supplier.save({ session });
      }

      await InventoryFinancialEventModel.create(
        [
          {
            type: "goods_received",
            amountInCFA: grn.totalAmountInCFA,
            direction: "debit",
            supplier: grn.supplier,
            referenceModel: "InventoryGoodsReceipt",
            referenceId: grn._id,
            referenceNumber: grn.grnNumber,
            location: grn.location,
            description: `GRN ${
              grn.grnNumber
            } posted -- ${grn.totalAmountInCFA.toLocaleString()} CFA payable to supplier`,
            performedBy: res.locals.user._id,
            eventDate: new Date(),
          },
        ],
        { session }
      );

      grn.status = "posted";
      await grn.save({ session });

      await session.commitTransaction();

      // After receipt, check if any item is still below threshold despite the delivery
      for (const lineItem of grn.items) {
        if (lineItem.isDamaged) continue;
        const updatedIL = await InventoryItemLocationModel.findOne({
          item: lineItem.item,
          location: grn.location,
        })
          .select("currentStock")
          .lean();
        if (updatedIL) {
          await fireInventoryAlert(
            lineItem.item.toString(),
            grn.location.toString(),
            updatedIL.currentStock,
            String(res.locals.user._id)
          );
        }
      }

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} posted goods receipt ${grn.grnNumber}`,
        "inventorygoodsreceipts",
        String(grn._id),
        JSON.stringify({ status: "draft" }),
        JSON.stringify({
          status: "posted",
          totalAmountInCFA: grn.totalAmountInCFA,
        })
      );

      appResponder(
        StatusCodes.OK,
        {
          message: `Goods receipt ${grn.grnNumber} posted successfully. Stock levels updated.`,
          data: { grn },
        },
        res
      );
    } catch (err: any) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
);

const disputeGoodsReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return next(
        new AppError(
          "A reason is required when disputing a goods receipt",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const grn = await InventoryGoodsReceiptModel.findById(id);

    if (!grn) {
      return next(
        new AppError("Goods receipt not found", StatusCodes.NOT_FOUND)
      );
    }

    if (grn.status !== "posted") {
      return next(
        new AppError(
          `Only posted goods receipts can be disputed. Current status is '${grn.status}'.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const grnBefore = { ...grn.toObject() };

    grn.status = "disputed";
    grn.notes = grn.notes
      ? `${grn.notes} | DISPUTE: ${reason.trim()}`
      : `DISPUTE: ${reason.trim()}`;

    await grn.save();

    logUserActivity(
      req,
      String(res.locals.user._id),
      `${res.locals.user.name} disputed goods receipt ${grn.grnNumber}`,
      "inventorygoodsreceipts",
      String(grn._id),
      JSON.stringify(grnBefore),
      JSON.stringify(grn.toObject())
    );

    appResponder(
      StatusCodes.OK,
      {
        message: `Goods receipt ${grn.grnNumber} has been marked as disputed`,
        data: { grn },
      },
      res
    );
  }
);

const PRIMARY = "#1E3A8A";
const ACCENT = "#F59E0B";
const LIGHT_BLUE = "#EFF6FF";
const LIGHT_GRAY = "#F8FAFC";
const MID_GRAY = "#94A3B8";
const DARK = "#0F172A";
const TEXT = "#334155";
const WHITE = "#FFFFFF";
const DANGER = "#DC2626";
const SUCCESS = "#16A34A";
const WARNING_BG = "#FEF3C7";

const fonts = {
  Roboto: {
    normal: Buffer.from(vfsFonts.pdfMake.vfs["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(vfsFonts.pdfMake.vfs["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(vfsFonts.pdfMake.vfs["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(
      vfsFonts.pdfMake.vfs["Roboto-MediumItalic.ttf"],
      "base64"
    ),
  },
};

export interface GRNPdfItem {
  name: string;
  sku: string;
  unit: string;
  quantityExpected: number;
  quantityReceived: number;
  unitCostInCFA: number;
  totalCostInCFA: number;
  isDamaged: boolean;
  damageNotes: string | null;
}

export interface GRNPdfData {
  grnNumber: string;
  status: "posted" | "disputed" | "draft";
  supplier: {
    name: string;
    code: string;
    contactPerson: string;
    email: string;
    phoneNumber: string;
    address?: string;
  };
  purchaseOrderNumber: string;
  location: { name: string; code: string };
  deliveryDate: Date;
  deliveryNoteNumber: string;
  isLateDelivery: boolean;
  hasQualityIssues: boolean;
  items: GRNPdfItem[];
  totalAmountInCFA: number;
  receivedBy: { name: string; email: string };
  postedAt: Date | null;
  notes: string | null;
  generatedAt: Date;
  generatedBy: string;
}

const formatCFA = (amount: number): string =>
  amount.toLocaleString("fr-CM") + " CFA";

const formatDate = (date: Date | null): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (date: Date | null): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadge = (status: string) => {
  const map: Record<string, { text: string; color: string; bg: string }> = {
    posted: { text: "POSTED", color: SUCCESS, bg: "#F0FDF4" },
    disputed: { text: "DISPUTED", color: DANGER, bg: "#FEF2F2" },
    draft: { text: "DRAFT", color: MID_GRAY, bg: LIGHT_GRAY },
  };
  const s = map[status] ?? map.draft;
  return {
    table: {
      body: [
        [
          {
            text: s.text,
            fontSize: 8,
            bold: true,
            color: s.color,
            fillColor: s.bg,
            border: [false, false, false, false],
            margin: [8, 3, 8, 3],
            alignment: "center",
          },
        ],
      ],
    },
    layout: { defaultBorder: false, hLineWidth: () => 0, vLineWidth: () => 0 },
  };
};

const alertBanner = (text: string, bgColor: string, textColor: string) => ({
  table: {
    widths: ["*"],
    body: [
      [
        {
          text,
          fontSize: 8.5,
          color: textColor,
          fillColor: bgColor,
          border: [false, false, false, false],
          margin: [12, 7, 12, 7],
        },
      ],
    ],
  },
  layout: "noBorders",
  margin: [0, 0, 0, 8],
});

const itemsTable = (items: GRNPdfItem[]) => {
  const headers = [
    { text: "ITEM", style: "tableHeader" },
    { text: "SKU", style: "tableHeader" },
    { text: "UNIT", style: "tableHeader" },
    { text: "EXPECTED", style: "tableHeader", alignment: "center" },
    { text: "RECEIVED", style: "tableHeader", alignment: "center" },
    { text: "UNIT COST", style: "tableHeader", alignment: "right" },
    { text: "TOTAL", style: "tableHeader", alignment: "right" },
    { text: "STATUS", style: "tableHeader", alignment: "center" },
  ];

  const rows = items.map((item, i) => {
    const rowBg = item.isDamaged ? "#FEF2F2" : i % 2 === 0 ? WHITE : LIGHT_GRAY;
    const variance = item.quantityReceived - item.quantityExpected;
    const cell = (content: any, extra: any = {}) => ({
      ...content,
      fillColor: rowBg,
      margin: [4, 5, 4, 5],
      border: [false, false, false, true],
      borderColor: [null, null, null, "#E2E8F0"],
      ...extra,
    });

    return [
      cell({
        stack: [
          { text: item.name, fontSize: 9, bold: true, color: DARK },
          item.isDamaged && item.damageNotes
            ? {
                text: item.damageNotes,
                fontSize: 7,
                color: DANGER,
                italics: true,
              }
            : {},
        ],
      }),
      cell({ text: item.sku, fontSize: 8, color: MID_GRAY }),
      cell({ text: item.unit, fontSize: 8, color: TEXT }),
      cell({
        text: String(item.quantityExpected),
        fontSize: 9,
        color: TEXT,
        alignment: "center",
      }),
      cell({
        stack: [
          {
            text: String(item.quantityReceived),
            fontSize: 9,
            bold: true,
            color: item.isDamaged ? DANGER : DARK,
          },
          variance !== 0
            ? {
                text: `${variance > 0 ? "+" : ""}${variance}`,
                fontSize: 7,
                color: variance < 0 ? DANGER : SUCCESS,
              }
            : {},
        ],
        alignment: "center",
      }),
      cell({
        text: formatCFA(item.unitCostInCFA),
        fontSize: 8.5,
        color: TEXT,
        alignment: "right",
      }),
      cell({
        text: formatCFA(item.totalCostInCFA),
        fontSize: 8.5,
        bold: true,
        color: DARK,
        alignment: "right",
      }),
      cell(
        item.isDamaged
          ? {
              text: "DAMAGED",
              fontSize: 7,
              bold: true,
              color: DANGER,
              alignment: "center",
            }
          : {
              text: "OK",
              fontSize: 7,
              bold: true,
              color: SUCCESS,
              alignment: "center",
            }
      ),
    ];
  });

  return {
    table: {
      headerRows: 1,
      widths: ["*", 60, 45, 55, 55, 70, 75, 50],
      body: [headers, ...rows],
    },
    layout: {
      defaultBorder: false,
      hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => "#E2E8F0",
      fillColor: () => null,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 16],
  };
};

const totalsSummary = (items: GRNPdfItem[], totalAmountInCFA: number) => {
  const damagedCount = items.filter((i) => i.isDamaged).length;

  return {
    columns: [
      { width: "*", text: "" },
      {
        width: 280,
        table: {
          widths: ["*", 120],
          body: [
            ...(damagedCount > 0
              ? [
                  [
                    {
                      text: "Damaged Items",
                      fontSize: 9,
                      color: DANGER,
                      border: [false, false, false, true],
                      borderColor: [null, null, null, "#E2E8F0"],
                      margin: [0, 6, 0, 6],
                    },
                    {
                      text: String(damagedCount),
                      fontSize: 9,
                      bold: true,
                      color: DANGER,
                      alignment: "right",
                      border: [false, false, false, true],
                      borderColor: [null, null, null, "#E2E8F0"],
                      margin: [0, 6, 0, 6],
                    },
                  ],
                ]
              : []),
            [
              {
                text: "Line Items",
                fontSize: 9,
                color: TEXT,
                border: [false, false, false, true],
                borderColor: [null, null, null, "#E2E8F0"],
                margin: [0, 6, 0, 6],
              },
              {
                text: String(items.length),
                fontSize: 9,
                bold: true,
                color: DARK,
                alignment: "right",
                border: [false, false, false, true],
                borderColor: [null, null, null, "#E2E8F0"],
                margin: [0, 6, 0, 6],
              },
            ],
            [
              {
                text: "TOTAL PAYABLE",
                fontSize: 11,
                bold: true,
                color: WHITE,
                fillColor: PRIMARY,
                border: [false, false, false, false],
                margin: [10, 9, 0, 9],
              },
              {
                text: formatCFA(totalAmountInCFA),
                fontSize: 11,
                bold: true,
                color: ACCENT,
                fillColor: PRIMARY,
                alignment: "right",
                border: [false, false, false, false],
                margin: [0, 9, 10, 9],
              },
            ],
          ],
        },
        layout: {
          defaultBorder: false,
          hLineWidth: (i: number, node: any) =>
            i === node.table.body.length ? 0 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#E2E8F0",
        },
      },
    ],
    margin: [0, 0, 0, 24],
  };
};

export const generateGoodsReceiptPdf = (data: GRNPdfData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 60],
      defaultStyle: {
        font: "Roboto",
        fontSize: 9,
        color: TEXT,
        lineHeight: 1.3,
      },

      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: "Atlantic Pearl Hotel & Resort — Confidential Document",
            fontSize: 7.5,
            color: MID_GRAY,
            margin: [40, 0, 0, 0],
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 7.5,
            color: MID_GRAY,
            alignment: "right",
            margin: [0, 0, 40, 0],
          },
        ],
        margin: [0, 12, 0, 0],
      }),

      content: [
        // ── Accent top bar ──────────────────────────────────────────────────
        {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 515, h: 6, color: ACCENT, r: 0 },
          ],
        },
        // ── Primary header bar ──────────────────────────────────────────────
        {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 515, h: 70, color: PRIMARY, r: 0 },
          ],
        },
        {
          columns: [
            {
              stack: [
                {
                  text: "ATLANTIC PEARL",
                  fontSize: 18,
                  bold: true,
                  color: WHITE,
                  characterSpacing: 2,
                },
                {
                  text: "HOTEL & RESORT",
                  fontSize: 8,
                  color: ACCENT,
                  characterSpacing: 4,
                  margin: [0, 1, 0, 0],
                },
              ],
              margin: [0, -64, 0, 0],
            },
            {
              stack: [
                {
                  text: "GOODS RECEIVED NOTE",
                  fontSize: 14,
                  bold: true,
                  color: WHITE,
                  alignment: "right",
                },
                {
                  text: data.grnNumber,
                  fontSize: 10,
                  color: ACCENT,
                  alignment: "right",
                  characterSpacing: 1,
                  margin: [0, 3, 0, 0],
                },
                statusBadge(data.status),
              ],
              alignment: "right",
              margin: [0, -62, 0, 0],
            },
          ],
          margin: [0, 0, 0, 16],
        },

        // ── Alert banners ───────────────────────────────────────────────────
        data.isLateDelivery
          ? alertBanner(
              "⚠  Late Delivery — This goods receipt was received after the purchase order expected delivery date.",
              WARNING_BG,
              "#92400E"
            )
          : null,
        data.hasQualityIssues
          ? alertBanner(
              "⚠  Quality Issues Flagged — One or more items in this delivery were received with damage or defects. See item details below.",
              "#FEF2F2",
              DANGER
            )
          : null,

        // ── Supplier + receipt details grid ─────────────────────────────────
        {
          columns: [
            {
              width: "50%",
              stack: [
                {
                  text: "SUPPLIER",
                  fontSize: 7,
                  bold: true,
                  color: ACCENT,
                  characterSpacing: 1,
                  margin: [0, 0, 0, 4],
                },
                {
                  table: {
                    widths: ["*"],
                    body: [
                      [
                        {
                          stack: [
                            {
                              text: data.supplier.name,
                              fontSize: 10,
                              bold: true,
                              color: PRIMARY,
                            },
                            {
                              text: `Code: ${data.supplier.code}`,
                              fontSize: 8,
                              color: MID_GRAY,
                              margin: [0, 2, 0, 0],
                            },
                            {
                              text: data.supplier.contactPerson,
                              fontSize: 8.5,
                              color: TEXT,
                              margin: [0, 4, 0, 0],
                            },
                            {
                              text: data.supplier.email,
                              fontSize: 8,
                              color: TEXT,
                            },
                            {
                              text: data.supplier.phoneNumber,
                              fontSize: 8,
                              color: TEXT,
                            },
                            data.supplier.address
                              ? {
                                  text: data.supplier.address,
                                  fontSize: 8,
                                  color: MID_GRAY,
                                  margin: [0, 2, 0, 0],
                                }
                              : {},
                          ],
                          fillColor: LIGHT_BLUE,
                          border: [false, false, false, false],
                          margin: [12, 10, 12, 10],
                        },
                      ],
                    ],
                  },
                  layout: "noBorders",
                },
              ],
              margin: [0, 0, 8, 0],
            },
            {
              width: "50%",
              stack: [
                {
                  text: "RECEIPT DETAILS",
                  fontSize: 7,
                  bold: true,
                  color: ACCENT,
                  characterSpacing: 1,
                  margin: [0, 0, 0, 4],
                },
                {
                  table: {
                    widths: [120, "*"],
                    body: [
                      ["Purchase Order", data.purchaseOrderNumber],
                      [
                        "Location",
                        `${data.location.name} (${data.location.code})`,
                      ],
                      ["Delivery Date", formatDate(data.deliveryDate)],
                      ["Delivery Note No.", data.deliveryNoteNumber],
                      ["Received By", data.receivedBy.name],
                      ["Posted At", formatDateTime(data.postedAt)],
                    ].map(([label, value], i, arr) => [
                      {
                        text: label,
                        fontSize: 8,
                        color: MID_GRAY,
                        border: [false, false, false, i < arr.length - 1],
                        borderColor: [null, null, null, "#E2E8F0"],
                        margin: [0, 5, 0, 5],
                      },
                      {
                        text: value,
                        fontSize: 8.5,
                        bold: i === 4,
                        color: i === 1 ? PRIMARY : DARK,
                        border: [false, false, false, i < arr.length - 1],
                        borderColor: [null, null, null, "#E2E8F0"],
                        margin: [0, 5, 0, 5],
                      },
                    ]),
                  },
                  layout: {
                    defaultBorder: false,
                    hLineWidth: (i: number, node: any) =>
                      i === node.table.body.length ? 0 : 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => "#E2E8F0",
                  },
                },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // ── Section divider ─────────────────────────────────────────────────
        {
          columns: [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 4,
                  w: 4,
                  h: 12,
                  color: ACCENT,
                  r: 2,
                },
              ],
              width: 10,
            },
            {
              text: "ITEMS RECEIVED",
              fontSize: 10,
              bold: true,
              color: PRIMARY,
              margin: [6, 2, 0, 0],
            },
          ],
          margin: [0, 0, 0, 10],
        },

        // ── Items table ─────────────────────────────────────────────────────
        itemsTable(data.items),

        // ── Totals ──────────────────────────────────────────────────────────
        totalsSummary(data.items, data.totalAmountInCFA),

        // ── Notes ───────────────────────────────────────────────────────────
        data.notes
          ? {
              stack: [
                {
                  text: "NOTES",
                  fontSize: 7,
                  bold: true,
                  color: ACCENT,
                  characterSpacing: 1,
                  margin: [0, 0, 0, 4],
                },
                {
                  table: {
                    widths: ["*"],
                    body: [
                      [
                        {
                          text: data.notes,
                          fontSize: 8.5,
                          color: TEXT,
                          fillColor: LIGHT_GRAY,
                          border: [false, false, false, false],
                          margin: [12, 8, 12, 8],
                        },
                      ],
                    ],
                  },
                  layout: "noBorders",
                  margin: [0, 0, 0, 20],
                },
              ],
            }
          : null,

        // ── Signature block ─────────────────────────────────────────────────
        {
          columns: [
            {
              width: "45%",
              stack: [
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: 180,
                      y2: 0,
                      lineWidth: 1,
                      lineColor: "#CBD5E1",
                    },
                  ],
                },
                {
                  text: "Store Manager Signature",
                  fontSize: 8,
                  color: MID_GRAY,
                  margin: [0, 4, 0, 0],
                },
                {
                  text: "Name: ___________________________",
                  fontSize: 8,
                  color: MID_GRAY,
                  margin: [0, 2, 0, 0],
                },
                {
                  text: "Date: ____________________________",
                  fontSize: 8,
                  color: MID_GRAY,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            { width: "10%", text: "" },
            {
              width: "45%",
              stack: [
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: 180,
                      y2: 0,
                      lineWidth: 1,
                      lineColor: "#CBD5E1",
                    },
                  ],
                },
                {
                  text: "Authorised By",
                  fontSize: 8,
                  color: MID_GRAY,
                  margin: [0, 4, 0, 0],
                },
                {
                  text: "Name: ___________________________",
                  fontSize: 8,
                  color: MID_GRAY,
                  margin: [0, 2, 0, 0],
                },
                {
                  text: "Date: ____________________________",
                  fontSize: 8,
                  color: MID_GRAY,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
          ],
          margin: [0, 0, 0, 16],
        },

        // ── Bottom accent bar ────────────────────────────────────────────────
        {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 515, h: 4, color: ACCENT, r: 0 },
          ],
          margin: [0, 8, 0, 0],
        },
        {
          text: `Generated by ${data.generatedBy} on ${formatDateTime(
            data.generatedAt
          )} — Atlantic Pearl Hotel & Resort`,
          fontSize: 7,
          color: MID_GRAY,
          alignment: "center",
          margin: [0, 6, 0, 0],
        },
      ].filter(Boolean),

      styles: {
        tableHeader: {
          fontSize: 7.5,
          bold: true,
          color: WHITE,
          fillColor: PRIMARY,
          margin: [4, 6, 4, 6],
          border: [false, false, false, false],
        },
      },
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
};

const downloadGoodsReceiptPdf = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const grn = await InventoryGoodsReceiptModel.findById(id)
      .populate("supplier", "name code contactPerson email phoneNumber address")
      .populate("purchaseOrder", "poNumber")
      .populate("location", "name code")
      .populate("receivedBy", "name email")
      .populate("items.item", "name sku unitOfMeasure");

    if (!grn) {
      return next(
        new AppError("Goods receipt not found", StatusCodes.NOT_FOUND)
      );
    }

    const pdfData: GRNPdfData = {
      grnNumber: grn.grnNumber,
      status: grn.status,
      supplier: grn.supplier as any,
      purchaseOrderNumber: (grn.purchaseOrder as any)?.poNumber ?? "N/A",
      location: grn.location as any,
      deliveryDate: grn.deliveryDate,
      deliveryNoteNumber: grn.deliveryNoteNumber ?? "N/A",
      isLateDelivery: grn.isLateDelivery,
      hasQualityIssues: grn.hasQualityIssues,
      items: grn.items.map((item: any) => ({
        name: item.item?.name ?? "Unknown",
        sku: item.item?.sku ?? "N/A",
        unit: item.item?.unitOfMeasure ?? "N/A",
        quantityExpected: item.quantityExpected,
        quantityReceived: item.quantityReceived,
        unitCostInCFA: item.unitCostInCFA,
        totalCostInCFA: item.totalCostInCFA,
        isDamaged: item.isDamaged,
        damageNotes: item.damageNotes ?? null,
      })),
      totalAmountInCFA: grn.totalAmountInCFA,
      receivedBy: grn.receivedBy as any,
      postedAt: grn.postedAt ?? null,
      notes: grn.notes ?? null,
      generatedAt: new Date(),
      generatedBy: res.locals.user.name,
    };

    const pdfBuffer = await generateGoodsReceiptPdf(pdfData);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${grn.grnNumber}.pdf"`
    );
    res.send(pdfBuffer);
  }
);

const getTransferSuggestions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const grn = await InventoryGoodsReceiptModel.findById(id)
      .populate("items.item", "name sku")
      .lean();

    if (!grn) {
      return next(
        new AppError("Goods receipt not found", StatusCodes.NOT_FOUND)
      );
    }

    if (grn.status !== "posted") {
      return appResponder(
        StatusCodes.OK,
        {
          message: "No transfer suggestions available for non-posted receipts",
          data: {
            suggestions: [],
            hasSuggestions: false,
          },
        },
        res
      );
    }

    const suggestions = [];

    for (const lineItem of grn.items) {
      const thisItemLocation = await InventoryItemLocationModel.findOne({
        item: (lineItem.item as any)._id ?? lineItem.item,
        location: grn.location,
      })
        .populate("location", "name code")
        .lean();

      if (!thisItemLocation) continue;

      const now = new Date();
      const activeSeason = thisItemLocation.seasonalParLevels?.find(
        (s: any) => new Date(s.validFrom) <= now && now <= new Date(s.validTo)
      );
      const effectiveReorderPoint = activeSeason
        ? activeSeason.reorderPoint
        : thisItemLocation.reorderPoint;

      if (thisItemLocation.currentStock > effectiveReorderPoint) continue;

      const otherItemLocations = await InventoryItemLocationModel.find({
        item: (lineItem.item as any)._id ?? lineItem.item,
        location: { $ne: grn.location },
        isBlocked: false,
      })
        .populate("location", "name code")
        .lean();

      for (const other of otherItemLocations) {
        const otherActiveSeason = other.seasonalParLevels?.find(
          (s: any) => new Date(s.validFrom) <= now && now <= new Date(s.validTo)
        );
        const otherEffectiveReorderPoint = otherActiveSeason
          ? otherActiveSeason.reorderPoint
          : other.reorderPoint;

        const transferableQuantity =
          other.currentStock - otherEffectiveReorderPoint;

        if (transferableQuantity <= 0) continue;

        const itemName = (lineItem.item as any)?.name ?? "Unknown Item";
        const itemSku = (lineItem.item as any)?.sku ?? "N/A";
        const thisLocationName =
          (thisItemLocation.location as any)?.name ?? "This Location";
        const otherLocationName =
          (other.location as any)?.name ?? "Other Location";

        suggestions.push({
          item: {
            _id: (lineItem.item as any)._id ?? lineItem.item,
            name: itemName,
            sku: itemSku,
          },
          thisLocation: {
            _id: grn.location,
            name: thisLocationName,
            code: (thisItemLocation.location as any)?.code ?? "",
            currentStock: thisItemLocation.currentStock,
            reorderPoint: effectiveReorderPoint,
          },
          surplusLocation: {
            _id: other.location,
            name: otherLocationName,
            code: (other.location as any)?.code ?? "",
            currentStock: other.currentStock,
            reorderPoint: otherEffectiveReorderPoint,
            transferableQuantity,
          },
          message: `${itemName} is below reorder point at ${thisLocationName} (${thisItemLocation.currentStock} units, reorder at ${effectiveReorderPoint}). ${otherLocationName} has ${other.currentStock} units on hand and can transfer up to ${transferableQuantity} units without going below its own par level.`,
        });

        break;
      }
    }

    appResponder(
      StatusCodes.OK,
      {
        message:
          suggestions.length > 0
            ? `${suggestions.length} transfer suggestion(s) found`
            : "No transfer suggestions for this receipt",
        data: {
          suggestions,
          hasSuggestions: suggestions.length > 0,
        },
      },
      res
    );
  }
);

export const InventoryGoodsReceiptControllers = {
  createInventoryGoodsReceipt,
  readOneInventoryGoodsReceipt,
  readAllInventoryGoodsReceipts,
  updateInventoryGoodsReceipt,
  deleteInventoryGoodsReceipt,
  postGoodsReceipt,
  disputeGoodsReceipt,
  downloadGoodsReceiptPdf,
  getTransferSuggestions,
};
