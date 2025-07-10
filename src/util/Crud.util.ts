import { StatusCodes } from "http-status-codes";

import { appResponder } from "./appResponder.util";
import { AppError } from "./AppError.util";
import { Query } from "./Query.util";
import { Request, Response } from "express";
import { logUserActivity } from "./logUserActivity.util";

//try and catch blocks are handled within controllers
export class CRUD {
  public model: any;

  constructor(model: any) {
    this.model = model;
  }

  public async create(body: any, res: Response, req: Request) {
    const data = await this.model.create(body);

    // logUserActivity(
    //   req,
    //   res.locals.user._id,
    //   `Created a document in ${this.model.collection.collectionName}`,
    //   this.model.collection.collectionName,
    //   data._id,
    //   undefined,
    //   //Bellow is so if we are createing an rray the toObject() method does not caurse and error
    //   data.toObject() ? data.toObject() : { data }
    // );

    appResponder(StatusCodes.OK, data, res);
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
        "Invalid id, no such resource in the database.",
        StatusCodes.NOT_FOUND
      );
    }

    // await logUserActivity(
    //   req,
    //   res.locals.user._id,
    //   `Read document in ${this.model.collection.collectionName}`,
    //   this.model.collection.collectionName,
    //   data._id,
    //   data.toObject(),
    //   data.toObject()
    // );

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
    // console.log("here");
    let queryBuilder = new Query(req.query, this.model.find())
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
        "Invalid Id, no such resource in the database",
        StatusCodes.NOT_FOUND
      );
    }

    await logUserActivity(
      req,
      res.locals.user._id,
      `Updated document in ${this.model.collection.collectionName}`,
      this.model.collection.collectionName,
      data._id,
      prevData.toObject(),
      data.toObject()
    );

    appResponder(StatusCodes.OK, data, res);
  }

  public async delete(id: string, res: Response, req: Request) {
    const prevData = await this.model.findOne({ _id: id });
    const data = await this.model.findByIdAndDelete(id);

    if (!data) {
      throw new AppError("No such Id in the database", StatusCodes.NOT_FOUND);
    }

    // await logUserActivity(
    //   req,
    //   res.locals.user._id,
    //   `Deleted document in ${this.model.collection.collectionName}`,
    //   this.model.collection.collectionName,
    //   prevData._id,
    //   prevData.toObject(),
    //   undefined
    // );

    appResponder(
      StatusCodes.OK,
      { message: "Resource deleted successfully" },
      res
    );
  }
}
