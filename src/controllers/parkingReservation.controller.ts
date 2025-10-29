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
import { logUserActivity } from "../util/logUserActivity.util";
import { RoomModel } from "../models/Room.model";
import {
  transactionCodes,
  TransactionModel,
} from "../models/Transaction.model";
import { StationModel } from "../models/Station.model";

const CRUDParkingReservation: CRUD = new CRUD(ParkingReservationModel);

export const createParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let {
        spotId,
        reservedFrom,
        reservedTo,
        status,
        reservationId,
        roomId,
        stationId,
      } = req.body;

      // Validate presence of required fields
      const requiredFields = [
        "spotId",
        "reservationId",
        "reservedFrom",
        "reservedTo",
        "status",
        "roomId",
        "stationId",
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
      const room = await RoomModel.findById(roomId);
      const station = await StationModel.findById(stationId);
      if (!reservation) {
        return next(
          new AppError(
            "Reservation Id does not exist in the database",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      if (!room) {
        return next(
          new AppError(
            "Room Id does not exist in the database",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      // if (!station) {
      //   return next(
      //     new AppError(
      //       "Station Id does not exist in the database",
      //       StatusCodes.BAD_REQUEST
      //     )
      //   );
      // }

      if (!reservation.hasRoom(room._id)) {
        return next(
          new AppError(
            "This room Id does not be long to this reservation.",
            StatusCodes.BAD_REQUEST
          )
        );
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

      const overlappingReservation = await ParkingReservationModel.findOne({
        spot: spotId,
        status: { $in: ["reserved", "active"] }, // only consider active/reserved spots
        $or: [
          {
            reservedFrom: { $lt: reservedTo },
            reservedTo: { $gt: reservedFrom },
          },
        ],
      });

      if (overlappingReservation) {
        throw new AppError(
          "This parking spot is already reserved for the selected time period.",
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
        room: room._id,
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
      // spot.status = status;
      // await spot.save();

      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(
        2,
        "0"
      )}${String(today.getMonth() + 1).padStart(2, "0")}${today.getFullYear()}`;
      const formattedTime = `${String(today.getHours()).padStart(
        2,
        "0"
      )}:${String(today.getMinutes()).padStart(2, "0")}:${String(
        today.getSeconds()
      ).padStart(2, "0")}`;

      await TransactionModel.create({
        transactionType: "parking reservation",
        reason: `${reservation.guestName} make a parking reservation Id: ${parkingReservation._id}`,
        amountInCFA: totalAmount,
        reservation: reservation._id,
        guest: reservation.guest,
        room: parkingReservation.room,
        transactionDate: formattedDate,
        transactionTime: formattedTime,
        trancode: transactionCodes.foodCharge,
        referenceDoc: {
          id: parkingReservation._id,
          collection: "parking_reservations",
        },
        isCharge: true,
      });

      logUserActivity(
        req,
        String(res.locals.user._id),
        `${res.locals.user.name} created a parking reservation.`,
        "parking_reservations",
        String(parkingReservation._id),
        "",
        JSON.stringify(parkingReservation)
      );
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
