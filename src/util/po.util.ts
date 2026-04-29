import path from "path";
const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
  },
};

const PdfPrinter = require("pdfmake");

const PRIMARY = "#1E3A8A";
const ACCENT = "#F59E0B";
const LIGHT_BLUE = "#EFF6FF";
const LIGHT_GRAY = "#F8FAFC";
const MID_GRAY = "#94A3B8";
const DARK = "#0F172A";
const TEXT = "#334155";
const WHITE = "#FFFFFF";
const SUCCESS = "#16A34A";
const WARNING_BG = "#FEF3C7";

export interface POPdfItem {
  name: string;
  sku: string;
  unit: string;
  quantityOrdered: number;
  unitCostInCFA: number;
  totalCostInCFA: number;
  notes: string | null;
}

export interface POPdfData {
  poNumber: string;
  status: string;
  supplier: {
    name: string;
    code: string;
    contactPerson: string;
    email: string;
    phoneNumber: string;
    address?: string;
    paymentTerms?: string;
    leadTimeDays?: number;
  };
  location: { name: string; code: string };
  expectedDeliveryDate: Date;
  isOverdue: boolean;
  items: POPdfItem[];
  totalAmountInCFA: number;
  approvedBy: { name: string; email: string } | null;
  approvedAt: Date | null;
  createdBy: { name: string; email: string };
  sentAt: Date | null;
  notes: string | null;
  generatedAt: Date;
  generatedBy: string;
}

const formatCFA = (amount: number) => amount.toLocaleString("fr-CM") + " CFA";

const formatDate = (date: Date | null) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (date: Date | null) => {
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
    approved: { text: "APPROVED", color: SUCCESS, bg: "#F0FDF4" },
    sent: { text: "SENT", color: "#2563EB", bg: "#EFF6FF" },
    pending: { text: "PENDING APPROVAL", color: "#D97706", bg: WARNING_BG },
    draft: { text: "DRAFT", color: MID_GRAY, bg: LIGHT_GRAY },
    received: { text: "RECEIVED", color: SUCCESS, bg: "#F0FDF4" },
    partial: { text: "PARTIAL", color: "#D97706", bg: WARNING_BG },
    rejected: { text: "REJECTED", color: "#DC2626", bg: "#FEF2F2" },
    cancelled: { text: "CANCELLED", color: "#DC2626", bg: "#FEF2F2" },
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

const itemsTable = (items: POPdfItem[]) => {
  const headers = [
    { text: "#", style: "tableHeader", alignment: "center" },
    { text: "ITEM DESCRIPTION", style: "tableHeader" },
    { text: "SKU", style: "tableHeader" },
    { text: "UNIT", style: "tableHeader" },
    { text: "QTY", style: "tableHeader", alignment: "center" },
    { text: "UNIT PRICE", style: "tableHeader", alignment: "right" },
    { text: "TOTAL", style: "tableHeader", alignment: "right" },
  ];

  const rows = items.map((item, i) => {
    const rowBg = i % 2 === 0 ? WHITE : LIGHT_GRAY;
    const cell = (content: any, extra: any = {}) => ({
      ...content,
      fillColor: rowBg,
      margin: [6, 7, 6, 7],
      border: [false, false, false, true],
      borderColor: [null, null, null, "#E2E8F0"],
      ...extra,
    });

    return [
      cell({
        text: String(i + 1),
        fontSize: 8.5,
        color: MID_GRAY,
        alignment: "center",
      }),
      cell({
        stack: [
          { text: item.name, fontSize: 9, bold: true, color: DARK },
          item.notes
            ? {
                text: item.notes,
                fontSize: 7.5,
                color: MID_GRAY,
                italics: true,
              }
            : {},
        ],
      }),
      cell({ text: item.sku, fontSize: 8, color: MID_GRAY }),
      cell({ text: item.unit, fontSize: 8, color: TEXT }),
      cell({
        text: String(item.quantityOrdered),
        fontSize: 9,
        bold: true,
        color: DARK,
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
        fontSize: 9,
        bold: true,
        color: PRIMARY,
        alignment: "right",
      }),
    ];
  });

  const totalQty = items.reduce((s, i) => s + i.quantityOrdered, 0);
  const totalValue = items.reduce((s, i) => s + i.totalCostInCFA, 0);

  const totalsRow = [
    {
      text: "",
      border: [false, false, false, false],
      fillColor: PRIMARY,
      margin: [0, 0, 0, 0],
    },
    {
      text: "",
      border: [false, false, false, false],
      fillColor: PRIMARY,
      margin: [0, 0, 0, 0],
    },
    {
      text: "",
      border: [false, false, false, false],
      fillColor: PRIMARY,
      margin: [0, 0, 0, 0],
    },
    {
      text: "",
      border: [false, false, false, false],
      fillColor: PRIMARY,
      margin: [0, 0, 0, 0],
    },
    {
      text: String(totalQty),
      fontSize: 9,
      bold: true,
      color: WHITE,
      alignment: "center",
      fillColor: PRIMARY,
      border: [false, false, false, false],
      margin: [6, 9, 6, 9],
    },
    {
      text: "TOTAL ORDER VALUE",
      fontSize: 9,
      bold: true,
      color: WHITE,
      alignment: "right",
      fillColor: PRIMARY,
      border: [false, false, false, false],
      margin: [6, 9, 6, 9],
    },
    {
      text: formatCFA(totalValue),
      fontSize: 10,
      bold: true,
      color: ACCENT,
      alignment: "right",
      fillColor: PRIMARY,
      border: [false, false, false, false],
      margin: [6, 9, 6, 9],
    },
  ];

  return {
    table: {
      headerRows: 1,
      widths: [22, "*", 60, 50, 45, 80, 90],
      body: [headers, ...rows, totalsRow],
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
    margin: [0, 0, 0, 20],
  };
};

export const generatePurchaseOrderPdf = (data: POPdfData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const detailRows = [
      ["Deliver To Location", `${data.location.name} (${data.location.code})`],
      ["Expected Delivery", formatDate(data.expectedDeliveryDate)],
      ["Prepared By", data.createdBy?.name ?? "N/A"],
      ["Approved By", data.approvedBy?.name ?? "Pending"],
      ["Approved At", formatDateTime(data.approvedAt)],
      ["Sent At", formatDateTime(data.sentAt)],
    ];

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
            text: "Atlantic Pearl Hotel & Resort — Official Purchase Order",
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
        { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 6, color: ACCENT }] },
        {
          canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 80, color: PRIMARY }],
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
                  margin: [0, 1, 0, 6],
                },
                { text: "Procurement Division", fontSize: 8, color: "#93C5FD" },
              ],
              margin: [0, -74, 0, 0],
            },
            {
              stack: [
                {
                  text: "PURCHASE ORDER",
                  fontSize: 16,
                  bold: true,
                  color: WHITE,
                  alignment: "right",
                },
                {
                  text: data.poNumber,
                  fontSize: 11,
                  color: ACCENT,
                  alignment: "right",
                  characterSpacing: 1,
                  margin: [0, 3, 0, 4],
                },
                statusBadge(data.status),
              ],
              alignment: "right",
              margin: [0, -72, 0, 0],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        data.isOverdue
          ? {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: "⚠  OVERDUE — This purchase order has not been received by the expected delivery date.",
                      fontSize: 8.5,
                      color: "#92400E",
                      fillColor: WARNING_BG,
                      border: [false, false, false, false],
                      margin: [12, 7, 12, 7],
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [0, 0, 0, 12],
            }
          : null,

        {
          columns: [
            {
              width: "50%",
              stack: [
                {
                  text: "DELIVER TO / BILL FROM",
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
                              text: "Supplier",
                              fontSize: 7,
                              color: MID_GRAY,
                              margin: [0, 0, 0, 2],
                            },
                            {
                              text: data.supplier.name,
                              fontSize: 11,
                              bold: true,
                              color: PRIMARY,
                            },
                            {
                              text: `Code: ${data.supplier.code}`,
                              fontSize: 8,
                              color: MID_GRAY,
                              margin: [0, 2, 0, 6],
                            },
                            {
                              canvas: [
                                {
                                  type: "line",
                                  x1: 0,
                                  y1: 0,
                                  x2: 200,
                                  y2: 0,
                                  lineWidth: 0.5,
                                  lineColor: "#BFDBFE",
                                },
                              ],
                            },
                            {
                              text: data.supplier.contactPerson,
                              fontSize: 8.5,
                              color: DARK,
                              margin: [0, 6, 0, 0],
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
                                  margin: [0, 2, 0, 6],
                                }
                              : {},
                            {
                              canvas: [
                                {
                                  type: "line",
                                  x1: 0,
                                  y1: 0,
                                  x2: 200,
                                  y2: 0,
                                  lineWidth: 0.5,
                                  lineColor: "#BFDBFE",
                                },
                              ],
                            },
                            {
                              text: `Payment Terms: ${
                                data.supplier.paymentTerms ?? "N/A"
                              }`,
                              fontSize: 8,
                              color: TEXT,
                              margin: [0, 6, 0, 0],
                            },
                            {
                              text: `Lead Time: ${
                                data.supplier.leadTimeDays ?? "N/A"
                              } day(s)`,
                              fontSize: 8,
                              color: TEXT,
                            },
                          ],
                          fillColor: LIGHT_BLUE,
                          border: [false, false, false, false],
                          margin: [12, 10, 12, 12],
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
                  text: "ORDER DETAILS",
                  fontSize: 7,
                  bold: true,
                  color: ACCENT,
                  characterSpacing: 1,
                  margin: [0, 0, 0, 4],
                },
                {
                  table: {
                    widths: [130, "*"],
                    body: detailRows.map(([label, value], i, arr) => [
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
                        bold: i === 2 || i === 3,
                        color: i === 3 && !data.approvedBy ? MID_GRAY : DARK,
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
          margin: [0, 0, 0, 24],
        },

        {
          columns: [
            {
              canvas: [
                { type: "rect", x: 0, y: 4, w: 4, h: 12, color: ACCENT, r: 2 },
              ],
              width: 10,
            },
            {
              text: "ORDER ITEMS",
              fontSize: 10,
              bold: true,
              color: PRIMARY,
              margin: [6, 2, 0, 0],
            },
          ],
          margin: [0, 0, 0, 10],
        },

        itemsTable(data.items),

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

        {
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    {
                      text: "TERMS & CONDITIONS",
                      fontSize: 8,
                      bold: true,
                      color: PRIMARY,
                      margin: [0, 0, 0, 4],
                    },
                    {
                      text: "This purchase order is subject to the terms agreed between Atlantic Pearl Hotel & Resort and the supplier. Delivery must be made to the specified location by the expected delivery date. All goods are subject to inspection upon receipt. Atlantic Pearl Hotel & Resort reserves the right to reject goods that do not meet the agreed specification.",
                      fontSize: 7.5,
                      color: TEXT,
                    },
                  ],
                  fillColor: LIGHT_GRAY,
                  border: [false, false, false, false],
                  margin: [12, 10, 12, 10],
                },
              ],
            ],
          },
          layout: "noBorders",
          margin: [0, 0, 0, 20],
        },

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
                  text: "Authorised Signatory",
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
                  text: "Supplier Acknowledgement",
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

        {
          canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, color: ACCENT }],
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
          margin: [6, 7, 6, 7],
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
