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

const createParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let {
        spotId,
        guestId,
        reservationBookingReference,
        reservedFrom,
        reservedTo,
        status,
      } = req.body;

      // Validate presence of required fields
      if (!spotId) {
        throw new AppError(
          "Missing required field: spotId",
          StatusCodes.BAD_REQUEST
        );
      }
      if (!guestId) {
        throw new AppError(
          "Missing required field: guestId",
          StatusCodes.BAD_REQUEST
        );
      }
      if (!reservationBookingReference) {
        throw new AppError(
          "Missing required field: reservationBookingReference",
          StatusCodes.BAD_REQUEST
        );
      }
      if (!reservedFrom) {
        throw new AppError(
          "Missing required field: reservedFrom",
          StatusCodes.BAD_REQUEST
        );
      }
      if (!reservedTo) {
        throw new AppError(
          "Missing required field: reservedTo",
          StatusCodes.BAD_REQUEST
        );
      }
      if (!status) {
        throw new AppError(
          "Missing required field: status",
          StatusCodes.BAD_REQUEST
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
      if (spot.status !== "available") {
        throw new AppError("Spot is not available.", StatusCodes.BAD_REQUEST);
      }

      // Fetch guest with populated user
      const guest = await GuestModel.findById(guestId).populate({
        path: "user",
        select: "name",
      });
      if (!guest) throw new AppError("Guest not found.", StatusCodes.NOT_FOUND);

      const guestName = (guest.user as any)?.name;
      if (!guestName) {
        throw new AppError(
          "Guest user.name not found.",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // Find reservation by booking reference
      const reservation = await ReservationModel.findOne({
        bookingReference: reservationBookingReference,
      });
      if (!reservation) {
        throw new AppError("Reservation not found.", StatusCodes.NOT_FOUND);
      }
      if (reservation.status !== "checked in") {
        throw new AppError(
          "Only checked-in guests can reserve parking.",
          StatusCodes.BAD_REQUEST
        );
      }

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

      //   console.log(hourlyRate, durationInHours);

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
        guest: guestId,
        reservationBookingReference,
        reservedFrom,
        reservedTo,
        status,
      });

      if (!bill) {
        return next(
          new AppError(
            "Bill or Bill id not found.",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      // Create bill item with correct enum category
      await BillItemModel.create({
        billId: bill._id,
        description: `${guestName} reserved spot ${
          spot._id
        } from ${reservedFrom.toISOString()} to ${reservedTo.toISOString()}`,
        category: "parking_reservations", // must match enum values
        linkedEntityId: parkingReservation._id,
        amount: totalAmount,
      });

      // Update spot status
      spot.status = status;
      await spot.save();

      // Send response
      appResponder(StatusCodes.CREATED, parkingReservation.toObject(), res);
    } catch (err) {
      // Attempt revert logic if partial changes happen (basic manual rollback)
      //   if (req.body.spotId) {
      //     try {
      //       // Revert spot status if needed
      //       const spot = await ParkingSpotModel.findById(req.body.spotId);
      //       if (spot && ["reserved", "occupied"].includes(req.body.status)) {
      //         spot.status = "available";
      //         await spot.save();
      //       }
      //     } catch (rollbackErr) {
      //       console.error("Rollback error:", rollbackErr);
      //     }
      //   }
      next(err);
    }
  }
);

const readOneParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.readOne(req.params.id, res, [], req);
  }
);

const readAllParkingReservations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.readAll(res, req, 1, 100, []);
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
