import { StatusCodes } from "http-status-codes";

import { appResponder } from "./appResponder.util";
import { AppError } from "./AppError.util";
import { Query } from "./Query.util";
import { Request, Response } from "express";

//try and catch blocks are handled within controllers
export class CRUD {
  public model: any;

  constructor(model: any) {
    this.model = model;
  }

  public async create(body: any, res: Response) {
    const data = await this.model.create(body);

    appResponder(StatusCodes.OK, data, res);
  }

  public async readOne(id: string, res: Response, populate: string[]) {
    let query = this.model.findById(id);

    if (populate) {
      populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    const data = await query;

    if (!data) {
      throw new AppError(
        "Invalid id, no such resource in the database.",
        StatusCodes.NOT_FOUND
      );
    }

    appResponder(StatusCodes.OK, data, res);
  }

  public async readAll(
    res: Response,
    req: Request,
    defaultPage: number,
    defaultLimit: number,
    populate: string[]
  ) {
    let query = new Query(req.query, this.model.find())
      .filter()
      .sort()
      .limitFields()
      .paginate(defaultPage, defaultLimit)
      .getQuery();

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    const data = await query;

    appResponder(StatusCodes.OK, data, res);
  }

  public async update(id: string, res: Response, req: Request) {
    const data = await this.model.findOneAndUpdate({ _id: id }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!data) {
      throw new AppError(
        "Invalid Id, no such resource in the database",
        StatusCodes.NOT_FOUND
      );
    }

    appResponder(StatusCodes.OK, data, res);
  }

  public async delete(id: string, res: Response) {
    const data = await this.model.findByIdAndDelete(id);

    appResponder(
      StatusCodes.OK,
      { message: "Resource deleted successfully" },
      res
    );
  }
}
