import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { AmenityModel } from "../models/Amenity.model";

const CRUDAmenity: CRUD = new CRUD(AmenityModel);

const createAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAmenity.create(req.body, res, req);
  }
);

const readOneAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAmenity.readOne(req.params.id, res, [], req);
  }
);

const readAllAmenitys = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAmenity.readAll(res, req, 1, 100, []);
  }
);

const updateAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAmenity.update(req.params.id, res, req);
  }
);

const deleteAmenity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAmenity.delete(req.params.id, res, req);
  }
);

export const amenityControllers = {
  createAmenity,
  readOneAmenity,
  readAllAmenitys,
  updateAmenity,
  deleteAmenity,
};
