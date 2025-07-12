import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { RoomTypeModel } from "../models/RoomType.model";
import { handleFileUploads } from "../external-apis/ftpServer";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { RoomMedia } from "../models/RoomImages.model";
import { appResponder } from "../util/appResponder.util";
import { AdminConfigurationModel } from "../models/AdminConfiguration.model";
import { RoomModel } from "../models/Room.model";
import { RoomTypeAmenitiesModel } from "../models/RoomTypeAmenity.model";
import { RoomTypeReviewModel } from "../models/RoomTypeReview.model";

const CRUDRoomType: CRUD = new CRUD(RoomTypeModel);

const createRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // console.log(req.body);
    const roomType = new RoomTypeModel(req.body);
    await roomType.validate();
    await roomType.save();

    const roomTypeFileUrls = await handleFileUploads(req, 8, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    if (!roomTypeFileUrls || roomTypeFileUrls.length === 0) {
      return next(
        new AppError(
          "Room type images are required, to create a room type",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const mediaPromises = roomTypeFileUrls.map((url) => {
      const fileType = String(url).split(".").pop();

      if (!fileType) {
        return Promise.reject(
          new AppError(
            "Invalid url creation for this media",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      return RoomMedia.create({
        url,
        roomType: roomType._id,
        mediaType: "Image",
      });
    });

    try {
      await Promise.all(mediaPromises);
    } catch (err) {
      return next(err); // Pass error to global error handler
    }

    appResponder(StatusCodes.OK, roomType, res);
  }
);

const readOneRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    const roomType = await RoomTypeModel.findById(id).populate("rates");
    if (!roomType) {
      return next(
        new AppError("No such room type with this id", StatusCodes.BAD_REQUEST)
      );
    }

    const roomTypeImages = await RoomMedia.find({ roomType: roomType._id });
    const config = await AdminConfigurationModel.findOne();
    const policies = config?.hotel ?? {};
    const rooms = await RoomModel.find({ type: roomType._id });

    const amenities = await RoomTypeAmenitiesModel.find({
      roomType: id,
    }).populate("amenity");

    const reviews = await RoomTypeReviewModel.find({ roomType: roomType._id });

    const averageRatings = {
      cleanliness: 0,
      amenities: 0,
      location: 0,
      comfort: 0,
      wifiConnection: 0,
    };

    reviews.forEach((review) => {
      averageRatings.amenities += review.amenities;
      averageRatings.cleanliness += review.cleanliness;
      averageRatings.location += review.location;
      averageRatings.comfort += review.comfort;
      averageRatings.wifiConnection += review.wifiConnection;
    });

    if (reviews.length > 0) {
      averageRatings.amenities /= reviews.length;
      averageRatings.cleanliness /= reviews.length;
      averageRatings.location /= reviews.length;
      averageRatings.comfort /= reviews.length;
      averageRatings.wifiConnection /= reviews.length;
    }

    const data = {
      ...roomType.toObject(),
      amenities,
      images: roomTypeImages,
      rooms,
      policies,
      reviews: {
        allReviews: reviews,
        averageRatings,
      },
    };

    appResponder(StatusCodes.OK, data, res);
  }
);

const readAllRoomTypes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await RoomTypeModel.find();

    const mutatedData = [];
    for (const roomType of data) {
      const enriched = await roomType.mutate();
      mutatedData.push(enriched);
    }

    appResponder(StatusCodes.OK, mutatedData, res);
  }
);

const updateRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.update(req.params.id, res, req);
  }
);

const deleteRoomType = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDRoomType.delete(req.params.id, res, req);
  }
);

export const roomTypeControllers = {
  createRoomType,
  readOneRoomType,
  readAllRoomTypes,
  updateRoomType,
  deleteRoomType,
};
