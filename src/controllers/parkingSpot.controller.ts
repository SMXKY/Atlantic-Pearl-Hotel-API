import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ParkingSpotModel } from "../models/ParkingSpot.model";

const CRUDParkingSpot: CRUD = new CRUD(ParkingSpotModel);

const createParkingSpot = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSpot.create(req.body, res, req);
  }
);

const readOneParkingSpot = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSpot.readOne(req.params.id, res, [], req);
  }
);

const readAllParkingSpots = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSpot.readAll(res, req, 1, 100, []);
  }
);

const updateParkingSpot = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSpot.update(req.params.id, res, req);
  }
);

const deleteParkingSpot = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSpot.delete(req.params.id, res, req);
  }
);

export const parkingSpotControllers = {
  createParkingSpot,
  readOneParkingSpot,
  readAllParkingSpots,
  updateParkingSpot,
  deleteParkingSpot,
};
