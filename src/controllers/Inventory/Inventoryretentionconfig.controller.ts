import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { InventoryRetentionConfigModel } from "../../models/Inventory/Inventoryretentionconfig.model";

const CRUDInventroyRetentionConfig: CRUD = new CRUD(
  InventoryRetentionConfigModel
);

const createInventroyRetentionConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRetentionConfig.create(req.body, res, req);
  }
);

const readOneInventroyRetentionConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRetentionConfig.readOne(
      req.params.id,
      res,
      ["updatedBy"],
      req
    );
  }
);

const readAllInventroyRetentionConfigs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRetentionConfig.readAll(res, req, 1, 100, ["updatedBy"]);
  }
);

const updateInventroyRetentionConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRetentionConfig.update(req.params.id, res, req);
  }
);

const deleteInventroyRetentionConfig = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDInventroyRetentionConfig.delete(req.params.id, res, req);
  }
);

export const inventroyRetentionConfigControllers = {
  createInventroyRetentionConfig,
  readOneInventroyRetentionConfig,
  readAllInventroyRetentionConfigs,
  updateInventroyRetentionConfig,
  deleteInventroyRetentionConfig,
};
