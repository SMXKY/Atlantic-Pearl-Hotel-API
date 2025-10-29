import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { StationModel } from "../models/Station.model";

const CRUDStation: CRUD = new CRUD(StationModel);

const createStation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDStation.create(req.body, res, req);
  }
);

const readOneStation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDStation.readOne(req.params.id, res, [], req);
  }
);

const readAllStations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDStation.readAll(res, req, 1, 100, []);
  }
);

const updateStation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDStation.update(req.params.id, res, req);
  }
);

const deleteStation = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDStation.delete(req.params.id, res, req);
  }
);

export const stationControllers = {
  createStation,
  readOneStation,
  readAllStations,
  updateStation,
  deleteStation,
};
