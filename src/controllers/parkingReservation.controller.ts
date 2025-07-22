import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ParkingReservationModel } from "../models/ParkingReservation.model";

const CRUDParkingReservation: CRUD = new CRUD(ParkingReservationModel);

const createParkingReservation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingReservation.create(req.body, res, req);
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
