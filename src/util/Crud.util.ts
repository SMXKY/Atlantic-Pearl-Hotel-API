import { StatusCodes } from "http-status-codes";

import { appResponder } from "./appResponder.util";
import { AppError } from "./AppError.util";
import { Query } from "./Query.util";
import { Request, Response } from "express";
import { logUserActivity } from "./logUserActivity.util";
import { UserModel } from "../models/User.model";

// try/catch blocks are handled within controllers
export class CRUD {
  public model: any;

  constructor(model: any) {
    this.model = model;
  }

  public async create(body: any, res: Response, req: Request) {
    const data = await this.model.create(body);

    if (!res.locals.user?._id) {
      throw new AppError(
        "Authentication error: user identity missing from session.",
        StatusCodes.UNAUTHORIZED
      );
    }

    const user = await UserModel.findById(res.locals.user._id);

    if (!user) {
      throw new AppError(
        "User not found in the database during activity logging. The account may have been deleted—check activity logs for details.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    logUserActivity(
      req,
      res.locals.user._id,
      `${user.name} created a document in collection: ${this.model.collection.collectionName}, with id: ${data._id}`,
      this.model.collection.collectionName,
      data._id,
      JSON.stringify(data.toObject()),
      JSON.stringify(data.toObject())
    );

    appResponder(StatusCodes.CREATED, data, res);
  }

  public async readOne(
    id: string,
    res: Response,
    populate: string[],
    req: Request
  ) {
    let query = this.model.findById(id);

    if (populate) {
      populate.forEach((field) => {
        query = query.populate(field);
      });
    }

    const data = await query;

    if (!data) {
      throw new AppError(
        "Invalid id: no such resource in the database.",
        StatusCodes.NOT_FOUND
      );
    }

    if (!res.locals.user?._id) {
      throw new AppError(
        "Authentication error: user identity missing from session.",
        StatusCodes.UNAUTHORIZED
      );
    }

    const user = await UserModel.findById(res.locals.user._id);

    if (!user) {
      throw new AppError(
        "User not found in the database during activity logging. The account may have been deleted—check activity logs for details.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await logUserActivity(
      req,
      res.locals.user._id,
      `${user.name} read document in ${this.model.collection.collectionName} with id: ${data._id}`,
      this.model.collection.collectionName,
      data._id,
      JSON.stringify(data.toObject()),
      JSON.stringify(data.toObject())
    );

    appResponder(StatusCodes.OK, data, res);
  }

  public async readAll(
    res: Response,
    req: Request,
    defaultPage: number,
    defaultLimit: number,
    populate: string[],
    defaultSort: string = "-createdAt"
  ): Promise<void> {
    const queryBuilder = new Query(req.query, this.model.find())
      .filter()
      .sort(defaultSort)
      .limitFields()
      .paginate(defaultPage, defaultLimit);

    let finalQuery = queryBuilder.getQuery();

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        finalQuery = finalQuery.populate(field, { strictPopulate: false });
      });
    }
    const data = await finalQuery;

    if (!res.locals.user?._id) {
      throw new AppError(
        "Authentication error: user identity missing from session.",
        StatusCodes.UNAUTHORIZED
      );
    }

    const user = await UserModel.findById(res.locals.user._id);

    if (!user) {
      throw new AppError(
        "User not found in the database during activity logging. The account may have been deleted—check activity logs for details.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await logUserActivity(
      req,
      res.locals.user._id,
      `${user.name} read all documents in ${this.model.collection.collectionName}`,
      this.model.collection.collectionName,
      "",
      "",
      ""
    );

    appResponder(StatusCodes.OK, data, res);
  }

  public async update(id: string, res: Response, req: Request) {
    const prevData = await this.model.findOne({ _id: id });
    const data = await this.model.findOneAndUpdate({ _id: id }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!data) {
      throw new AppError(
        "Invalid id: no such resource in the database.",
        StatusCodes.NOT_FOUND
      );
    }

    if (!res.locals.user?._id) {
      throw new AppError(
        "Authentication error: user identity missing from session.",
        StatusCodes.UNAUTHORIZED
      );
    }

    const user = await UserModel.findById(res.locals.user._id);

    if (!user) {
      throw new AppError(
        "User not found in the database during activity logging. The account may have been deleted—check activity logs for details.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await logUserActivity(
      req,
      res.locals.user._id,
      `${user.name} updated document in ${this.model.collection.collectionName} with id: ${data._id}`,
      this.model.collection.collectionName,
      data._id,
      JSON.stringify(prevData?.toObject()),
      JSON.stringify(data.toObject())
    );

    appResponder(StatusCodes.OK, data, res);
  }

  public async delete(id: string, res: Response, req: Request) {
    const prevData = await this.model.findOne({ _id: id });
    const data = await this.model.findByIdAndDelete(id);

    if (!data) {
      throw new AppError(
        "Invalid id: no such resource in the database.",
        StatusCodes.NOT_FOUND
      );
    }

    if (!res.locals.user?._id) {
      throw new AppError(
        "Authentication error: user identity missing from session.",
        StatusCodes.UNAUTHORIZED
      );
    }

    const user = await UserModel.findById(res.locals.user._id);

    if (!user) {
      throw new AppError(
        "User not found in the database during activity logging. The account may have been deleted—check activity logs for details.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await logUserActivity(
      req,
      res.locals.user._id,
      `${user.name} deleted document in ${this.model.collection.collectionName} with id: ${prevData?._id}`,
      this.model.collection.collectionName,
      prevData?._id,
      JSON.stringify(prevData?.toObject()),
      ""
    );

    appResponder(
      StatusCodes.OK,
      { message: "Resource deleted successfully" },
      res
    );
  }
}
