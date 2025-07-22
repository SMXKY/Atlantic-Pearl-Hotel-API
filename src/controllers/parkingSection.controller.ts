import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { ParkingSectionModel } from "../models/ParkingSection.model";

const CRUDParkingSection: CRUD = new CRUD(ParkingSectionModel);

const createParkingSection = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSection.create(req.body, res, req);
  }
);

const readOneParkingSection = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSection.readOne(req.params.id, res, ["parkingSpots"], req);
  }
);

const readAllParkingSections = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSection.readAll(res, req, 1, 100, ["parkingSpots"]);
  }
);

const updateParkingSection = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSection.update(req.params.id, res, req);
  }
);

const deleteParkingSection = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDParkingSection.delete(req.params.id, res, req);
  }
);

export const parkingSectionControllers = {
  createParkingSection,
  readOneParkingSection,
  readAllParkingSections,
  updateParkingSection,
  deleteParkingSection,
};
