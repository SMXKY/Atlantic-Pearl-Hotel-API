import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { InvoiceModel } from "../models/Invoice.model";

const CRUDInvoice: CRUD = new CRUD(InvoiceModel);

const createInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.create(req.body, res, req);
  }
);

const readOneInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.readOne(req.params.id, res, [], req);
  }
);

const readAllInvoices = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.readAll(res, req, 1, 100, []);
  }
);

const updateInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.update(req.params.id, res, req);
  }
);

const deleteInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInvoice.delete(req.params.id, res, req);
  }
);

export const invoiceControllers = {
  createInvoice,
  readOneInvoice,
  readAllInvoices,
  updateInvoice,
  deleteInvoice,
};
