import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { BuildingModel } from "../models/Building.model";

const CRUDBuilding: CRUD = new CRUD(BuildingModel);

const createBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.create(req.body, res, req);
  }
);

const readOneBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.readOne(req.params.id, res, [], req);
  }
);

const readAllBuildings = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.readAll(res, req, 1, 100, []);
  }
);

const updateBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.update(req.params.id, res, req);
  }
);

const deleteBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.delete(req.params.id, res, req);
  }
);

export const buildingControllers = {
  createBuilding,
  readOneBuilding,
  readAllBuildings,
  updateBuilding,
  deleteBuilding,
};
