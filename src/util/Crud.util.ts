import { StatusCodes } from "http-status-codes";

import { appResponder } from "./appResponder.util";
import { AppError } from "./AppError.util";
import { Query } from "./Query.util";
import { Request, Response } from "express";
import { logUserActivity } from "./logUserActivity.util";
import { UserModel } from "../models/HR/User.model";

// try/catch blocks are handled within controllers
export class CRUD {
  public model: any;

  constructor(model: any) {
    this.model = model;
  }

  public async create(
    body: any,
    res: Response,
    req: Request,
    log: boolean = true
  ) {
    const data = await this.model.create(body);

    if (log) {
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
    }

    appResponder(StatusCodes.CREATED, data, res);
  }

  public async readOne(
    id: string,
    res: Response,
    populate: string[],
    req: Request,
    log: boolean = true
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

    appResponder(StatusCodes.OK, data, res);
  }

  public async readAll(
    res: Response,
    req: Request,
    defaultPage: number,
    defaultLimit: number,
    populate: string[],
    defaultSort: string = "-createdAt",
    log: boolean = true
  ): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || defaultPage);
    const limit = Math.max(
      1,
      Math.min(Number(req.query.limit) || defaultLimit, 200)
    );
    const skip = (page - 1) * limit;

    // Build filter query (search handled inside Query class)
    const queryBuilder = new Query(req.query, this.model.find())
      .filter()
      .search()
      .sort(defaultSort)
      .limitFields();

    const baseFilter = queryBuilder.getQuery().getFilter();

    // Run count and data fetch in parallel
    const [total, data] = await Promise.all([
      this.model.countDocuments(baseFilter),
      (() => {
        let q = this.model
          .find(baseFilter)
          .sort(defaultSort)
          .skip(skip)
          .limit(limit);
        if (populate && Array.isArray(populate)) {
          populate.forEach((field) => {
            q = q.populate(field, { strictPopulate: false } as any);
          });
        }
        return q;
      })(),
    ]);

    const totalPages = Math.ceil(total / limit);

    appResponder(StatusCodes.OK, data, res, {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  }

  public async update(
    id: string,
    res: Response,
    req: Request,
    log: boolean = true
  ) {
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

    if (log) {
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
    }

    appResponder(StatusCodes.OK, data, res);
  }

  public async delete(
    id: string,
    res: Response,
    req: Request,
    log: boolean = true
  ) {
    const prevData = await this.model.findOne({ _id: id });
    const data = await this.model.findByIdAndDelete(id);

    if (!data) {
      throw new AppError(
        "Invalid id: no such resource in the database.",
        StatusCodes.NOT_FOUND
      );
    }
    if (log) {
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
    }

    appResponder(
      StatusCodes.OK,
      { message: "Resource deleted successfully" },
      res
    );
  }
}
