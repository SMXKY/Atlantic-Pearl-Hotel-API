import { NextFunction, Request, response, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ParkingReservationModel } from "../models/ParkingReservation.model";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ParkingSpotModel } from "../models/ParkingSpot.model";
import { GuestModel } from "../models/Guest.model";
import { ReservationModel } from "../models/Reservation.model";
import { BillItemModel } from "../models/BillItem.model";
import { BillModel } from "../models/Bill.model";
import { ParkingSectionModel } from "../models/ParkingSection.model";
import { appResponder } from "../util/appResponder.util";
import mongoose from "mongoose";

const CRUDParkingReservation: CRUD = new CRUD(ParkingReservationModel);

export const createParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { spotId, reservedFrom, reservedTo, status, reservationId } =
        req.body;

      // Validate presence of required fields
      const requiredFields = [
        "spotId",
        "reservationId",
        "reservedFrom",
        "reservedTo",
        "status",
      ];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          throw new AppError(
            `Missing required field: ${field}`,
            StatusCodes.BAD_REQUEST
          );
        }
      }

      // Fetch reservation by ID
      const reservation = await ReservationModel.findById(reservationId);
      if (!reservation) {
        return next("Reservation Id does not exist in the database");
      }

      if (reservation.status !== "checked in") {
        return next(
          new AppError(
            "Only checked-in guest reservations can be used to create a parking reservation",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // Fetch guest tied to reservation
      const guest = await GuestModel.findById(reservation.guest).populate({
        path: "user",
        select: "name",
      });

      if (!guest || !reservation.guest) {
        return next(
          new AppError(
            "No guest account tied to this reservation",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      reservedFrom = new Date(reservedFrom);
      reservedTo = new Date(reservedTo);

      if (isNaN(reservedFrom.getTime()) || isNaN(reservedTo.getTime())) {
        throw new AppError("Invalid date format.", StatusCodes.BAD_REQUEST);
      }

      if (reservedFrom.getTime() < Date.now()) {
        throw new AppError(
          "Reservation must be for a future date.",
          StatusCodes.BAD_REQUEST
        );
      }

      if (reservedTo <= reservedFrom) {
        throw new AppError(
          "'reservedTo' must be later than 'reservedFrom'.",
          StatusCodes.BAD_REQUEST
        );
      }

      if (!["reserved", "occupied"].includes(status)) {
        throw new AppError(
          "Invalid reservation status.",
          StatusCodes.BAD_REQUEST
        );
      }

      // Fetch parking spot
      const spot = await ParkingSpotModel.findById(spotId);
      if (!spot)
        throw new AppError("Parking spot not found.", StatusCodes.NOT_FOUND);
      if (spot.status !== "available")
        throw new AppError("Spot is not available.", StatusCodes.BAD_REQUEST);

      // Fetch reservation by booking reference (avoid duplicate variable)

      // Fetch or create bill
      let bill = await BillModel.findOne({
        guestId: guest._id,
        reservationId: reservation._id,
      });
      if (!bill) {
        bill = await BillModel.create([
          { guestId: guest._id, reservationId: reservation._id },
        ]).then(([created]) => created);
      }

      if (!bill) {
        return next(
          new AppError(
            "Falied to create and/or find existing bill.",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      // Get parking section + rate
      const parkingSection = await ParkingSectionModel.findById(
        spot.section
      ).populate("type");
      if (!parkingSection || !parkingSection.type) {
        throw new AppError(
          "Parking section or type not found.",
          StatusCodes.NOT_FOUND
        );
      }

      const hourlyRate = (parkingSection.type as any).hourlyRateInCFA;
      const durationInHours =
        (reservedTo.getTime() - reservedFrom.getTime()) / 3_600_000;

      if (isNaN(hourlyRate) || isNaN(durationInHours)) {
        throw new AppError(
          "Invalid hourly rate or duration for billing.",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const totalAmount = Math.ceil(durationInHours * hourlyRate);
      if (isNaN(totalAmount)) {
        throw new AppError(
          "Calculated total amount is invalid.",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // Create parking reservation
      const parkingReservation = await ParkingReservationModel.create({
        spot: spotId,
        guest: reservation.guest,
        reservationBookingReference: reservation.bookingReference,
        reservedFrom,
        reservedTo,
        status,
        reservation: reservationId,
      });

      // Create bill item with correct enum category
      await BillItemModel.create({
        billId: bill._id,
        description: `${(guest.user as any).name} reserved spot ${
          spot._id
        } from ${reservedFrom.toISOString()} to ${reservedTo.toISOString()}`,
        category: "parking_reservations",
        linkedEntityId: parkingReservation._id,
        amount: totalAmount,
      });

      // Update spot status
      spot.status = status;
      await spot.save();

      // Send response
      appResponder(StatusCodes.CREATED, parkingReservation.toObject(), res);
    } catch (err) {
      next(err);
    }
  }
);

const readOneParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.readOne(
      req.params.id,
      res,
      ["guest", "spot"],
      req
    );
  }
);

const readAllParkingReservations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.readAll(res, req, 1, 100, [
      "guest",
      "spot",
      "reservation",
    ]);
  }
);

const updateParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.update(req.params.id, res, req);
  }
);

const deleteParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.delete(req.params.id, res, req);
  }
);

export const parkingReservationControllers = {
  createParkingReservation,
  readOneParkingReservation,
  readAllParkingReservations,
  updateParkingReservation,
  deleteParkingReservation,
};
