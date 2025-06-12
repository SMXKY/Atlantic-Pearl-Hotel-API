import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ReservationModel } from "../models/Reservation.model";
import { RoomModel } from "../models/Room.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { InvoiceModel } from "../models/Invoice.model";
import { GuestModel } from "../models/Guest.model";
import { IUser } from "../models/User.model";
import { sendEmail } from "../util/sendEmail.util";
import { appResponder } from "../util/appResponder.util";
import {
  generateInvoiceEmailTemplateData,
  renderInvoiceHTMLFromTemplate,
} from "../util/generateInvoiceEmailTemplate.util";
import * as mongoose from "mongoose";

const CRUDReservation: CRUD = new CRUD(ReservationModel);

const createReservation = catchAsync(async (req, res, next) => {
  let email = req.body.guestEmail;

  const guest = await GuestModel.findById(req.body.guest).populate("user");

  if (!email && guest?.user && "email" in guest.user) {
    email = guest.user.email;
  }

  let reservation;
  try {
    reservation = new ReservationModel(req.body);
    await reservation.save();

    const invoice = await InvoiceModel.create({
      reservation: reservation._id,
      lineItems: reservation.items,
    });

    const emailData = await generateInvoiceEmailTemplateData(
      String(invoice._id)
    );

    const html = renderInvoiceHTMLFromTemplate(emailData);

    await sendEmail(email, "RESERVATION INVOICE", "", html);

    appResponder(
      StatusCodes.OK,
      {
        message: "Reservation and Invoice created. Email sent.",
        reservation,
        invoice,
      },
      res
    );
  } catch (err) {
    if (reservation?._id) {
      await ReservationModel.findByIdAndDelete(reservation._id);
    }
    return next(err);
  }
});

const readOneReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.readOne(req.params.id, res, [], req);
  }
);

const readAllReservations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.readAll(res, req, 1, 100, []);
  }
);

const updateReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.update(req.params.id, res, req);
  }
);

const deleteReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDReservation.delete(req.params.id, res, req);
  }
);

export const reservationControllers = {
  createReservation,
  readOneReservation,
  readAllReservations,
  updateReservation,
  deleteReservation,
};
