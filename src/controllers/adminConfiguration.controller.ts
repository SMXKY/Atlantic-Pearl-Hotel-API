import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";

const CRUDAdminConfiguration: CRUD = new CRUD(AdminConfigurationModel);

const createAdminConfiguration = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAdminConfiguration.create(req.body, res, req);
  }
);

const readOneAdminConfiguration = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAdminConfiguration.readOne(req.params.id, res, [], req);
  }
);

const readAllAdminConfigurations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAdminConfiguration.readAll(res, req, 1, 100, []);
  }
);

const updateAdminConfiguration = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAdminConfiguration.update(req.params.id, res, req);
  }
);

const deleteAdminConfiguration = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDAdminConfiguration.delete(req.params.id, res, req);
  }
);

export const adminConfigurationControllers = {
  createAdminConfiguration,
  readOneAdminConfiguration,
  readAllAdminConfigurations,
  updateAdminConfiguration,
  deleteAdminConfiguration,
};
