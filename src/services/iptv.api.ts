import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";

import * as dotEnv from "dotenv";
import {
  ReservationModel,
  IReservation,
  IReservationItem,
} from "../models/Reservation.model";
import { IRoom, RoomModel } from "../models/Room.model";
import { GuestModel, IGuest } from "../models/Guest.model";
import { generateIdentifyToken } from "../util/generateUUID.util";
import { IPTVLogModel } from "../models/IPTVLogs.model";
import { ReservationSnapshotModel } from "../models/ReservationSnapShot.model";
import { catchAsync } from "../util/catchAsync";
import { BillModel } from "../models/Bill.model";
import { BillItemModel } from "../models/BillItem.model";
import { NextFunction, Request, Response } from "express";
import { TransactionModel } from "../models/Transaction.model";
import * as bcrypt from "bcrypt";
import mongoose from "mongoose";

dotEnv.config();

const baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.IPTV_BASE_URL_PROD
    : process.env.IPTV_BASE_URL_DEV;

const authToken =
  process.env.NODE_ENV === "production"
    ? process.env.IPTV_AUTH_TOKEN_PROD
    : process.env.IPTV_AUTH_TOKEN_DEV;

if (!baseURL || !authToken) {
  throw new AppError(
    "❌ Cannot find IPTV enviroment variables",
    StatusCodes.INTERNAL_SERVER_ERROR
  );
}

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Authorization: authToken,
  },
});

const checkIn = async (resvId: string) => {
  try {
    const reservation = await ReservationModel.findById(resvId)
      .populate("guest")
      .populate("items.roomType")
      .populate("items.rate")
      .populate("items.rooms.room")
      .populate("checkInStation")
      .lean<IReservation>();

    if (!reservation)
      throw new AppError("Reservation not found.", StatusCodes.NOT_FOUND);
    if (reservation.status !== "checked in")
      throw new AppError(
        "Guest is not checked in yet.",
        StatusCodes.BAD_REQUEST
      );
    if (!reservation.guest)
      throw new AppError(
        "Reservation missing guest info.",
        StatusCodes.BAD_REQUEST
      );
    if (!reservation.wifi?.name || !reservation.wifi?.password)
      throw new AppError(
        "WiFi credentials missing for IPTV sync.",
        StatusCodes.BAD_REQUEST
      );

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}${String(
      today.getMonth() + 1
    ).padStart(2, "0")}${today.getFullYear()}`;
    const formattedTime = `${String(today.getHours()).padStart(
      2,
      "0"
    )}:${String(today.getMinutes()).padStart(2, "0")}`;

    const payloads = (
      await Promise.all(
        reservation.items.flatMap(async (item) =>
          Promise.all(
            item.rooms.map(async (roomEntry) => {
              const room = roomEntry.room as IRoom;
              const identify = await generateIdentifyToken();

              return {
                Station: "AP",
                TransactionDate: formattedDate,
                TransactionTime: formattedTime,
                RoomNumber: room.number,
                OrderNumber: reservation.id,
                GuestID: reservation.guest?._id,
                GuestName: reservation.guestName,
                GuestMaster: "Y",
                VIP:
                  (reservation.guest as IGuest).guestType === "VIP" ? "Y" : "N",
                LanguageCode: reservation.preferedLanguage,
                WifiName: reservation.wifi.name,
                WifiPassword: reservation.wifi.password,
                Identify: identify,
              };
            })
          )
        )
      )
    ).flat();

    for (const body of payloads) {
      const { Station, ...query } = body;

      const res = await api.post("/checkin", null, {
        headers: {
          Station: "AP",
          Authorization: authToken,
        },
        params: query,
      });

      const isSuccess = res.data.Status === "SUCCESS";

      await IPTVLogModel.create({
        isSuccess,
        response: JSON.stringify(res.data),
        identify: body.Identify,
        isValidResponseToken: body.Identify === res.data.Identify,
      });

      if (!isSuccess)
        throw new AppError(
          "Error sending record to IPTV",
          StatusCodes.BAD_GATEWAY
        );

      if (body.Identify !== res.data.Identify)
        throw new AppError(
          "Invalid Identify token received from IPTV",
          StatusCodes.BAD_GATEWAY
        );
    }
  } catch (err: any) {
    console.error(
      "IPTV Check-In Error:",
      err?.response?.data || err.message || err
    );
    throw new AppError(
      `Error sending check-in request to IPTV: ${err.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const checkOut = async (resvId: string) => {
  try {
    const reservation = await ReservationModel.findById(resvId)
      .populate("guest")
      .populate("items.roomType")
      .populate("items.rate")
      .populate("items.rooms.room")
      .populate("checkOutStation")
      .lean<IReservation>();

    if (!reservation)
      throw new AppError("Reservation not found.", StatusCodes.NOT_FOUND);

    if (reservation.status !== "checked out")
      throw new AppError(
        "Guest is not checked out yet.",
        StatusCodes.BAD_REQUEST
      );

    if (!reservation.guest)
      throw new AppError(
        "Reservation missing guest info.",
        StatusCodes.BAD_REQUEST
      );

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}${String(
      today.getMonth() + 1
    ).padStart(2, "0")}${today.getFullYear()}`;
    const formattedTime = `${String(today.getHours()).padStart(
      2,
      "0"
    )}:${String(today.getMinutes()).padStart(2, "0")}`;

    const payloads = (
      await Promise.all(
        reservation.items.flatMap(async (item) =>
          Promise.all(
            item.rooms.map(async (roomEntry) => {
              const room = roomEntry.room as IRoom;
              const identify = await generateIdentifyToken();

              return {
                Station: "AP",
                TransactionDate: formattedDate,
                TransactionTime: formattedTime,
                RoomNumber: room.number,
                Identify: identify,
                OrderNumber: reservation.id,
              };
            })
          )
        )
      )
    ).flat();

    for (const body of payloads) {
      const { Station, ...query } = body;

      const res = await api.post("/checkout", null, {
        headers: {
          Station,
          Authorization: authToken,
        },
        params: query,
      });

      const isSuccess = res.data.Status === "SUCCESS";

      await IPTVLogModel.create({
        isSuccess,
        response: JSON.stringify(res.data),
        identify: body.Identify,
        isValidResponseToken: body.Identify === res.data.Identify,
      });

      if (!isSuccess)
        throw new AppError(
          "Error sending record to IPTV",
          StatusCodes.BAD_GATEWAY
        );

      if (body.Identify !== res.data.Identify)
        throw new AppError(
          "Invalid Identify token received from IPTV",
          StatusCodes.BAD_GATEWAY
        );
    }
  } catch (err: any) {
    console.error(
      "IPTV Check-OUT Error:",
      err?.response?.data || err.message || err
    );
    throw new AppError(
      `Error sending check-out request to IPTV: ${err.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const roomMove = async (resvId: string, preUpdateSnapshotId: string) => {
  try {
    const reservation = await ReservationModel.findById(resvId)
      .populate("guest")
      .populate("items.roomType")
      .populate("items.rate")
      .populate("items.rooms.room")
      .populate("checkInStation")
      .populate("roomUpdateStation")
      .lean<IReservation>();

    const preUpdateReservationSnapshot =
      await ReservationSnapshotModel.findById(preUpdateSnapshotId);

    if (!reservation)
      throw new AppError("Reservation not found.", StatusCodes.NOT_FOUND);
    if (!preUpdateReservationSnapshot)
      throw new AppError(
        "Reservation pre update snapshot not found.",
        StatusCodes.NOT_FOUND
      );
    if (!preUpdateReservationSnapshot.state)
      throw new AppError(
        "Reservation pre update snapshot state not found.",
        StatusCodes.NOT_FOUND
      );
    if (!reservation.guest)
      throw new AppError(
        "Reservation missing guest info.",
        StatusCodes.BAD_REQUEST
      );
    if (!reservation.wifi?.name || !reservation.wifi?.password)
      throw new AppError(
        "WiFi credentials missing for IPTV sync.",
        StatusCodes.BAD_REQUEST
      );

    const preUpdateReservation: IReservation = JSON.parse(
      preUpdateReservationSnapshot.state
    );

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}${String(
      today.getMonth() + 1
    ).padStart(2, "0")}${today.getFullYear()}`;
    const formattedTime = `${String(today.getHours()).padStart(
      2,
      "0"
    )}:${String(today.getMinutes()).padStart(2, "0")}`;

    const extractRoomNumbers = (items: IReservationItem[]): string[] => {
      const roomNumbers: string[] = [];
      (items || []).forEach((item) => {
        (item.rooms || []).forEach((roomEntry) => {
          const room = roomEntry.room as IRoom;
          let roomNumber: string = "";

          if (room && typeof room === "object") {
            roomNumber = String(room.number || room._id);
          } else if (room) {
            roomNumber = String(room);
          }

          if (roomNumber) {
            roomNumbers.push(roomNumber);
          }
        });
      });
      return roomNumbers;
    };

    const oldRoomNumbers = extractRoomNumbers(preUpdateReservation.items || []);
    const newRoomNumbers = extractRoomNumbers(reservation.items || []);

    const oldRoomSet = new Set(oldRoomNumbers);
    const newRoomSet = new Set(newRoomNumbers);

    const removedRooms = oldRoomNumbers.filter((room) => !newRoomSet.has(room));

    const addedRooms = newRoomNumbers.filter((room) => !oldRoomSet.has(room));

    const unchangedRooms = oldRoomNumbers.filter((room) =>
      newRoomSet.has(room)
    );

    console.log("Room changes detected:", {
      removed: removedRooms,
      added: addedRooms,
      unchanged: unchangedRooms,
    });

    if (removedRooms.length === 0 && addedRooms.length === 0) {
      console.log("No room changes detected");
      return;
    }

    const roomMovePairs: { oldRoomNumber: string; newRoomNumber: string }[] =
      [];

    const removedRoomsCopy = [...removedRooms];
    const addedRoomsCopy = [...addedRooms];

    while (removedRoomsCopy.length > 0 && addedRoomsCopy.length > 0) {
      const oldRoom = removedRoomsCopy.shift()!;
      const newRoom = addedRoomsCopy.shift()!;
      roomMovePairs.push({
        oldRoomNumber: oldRoom,
        newRoomNumber: newRoom,
      });
    }

    if (removedRoomsCopy.length > 0) {
      console.warn(
        "Guest reduced number of rooms. Remaining old rooms:",
        removedRoomsCopy
      );
    }

    if (addedRoomsCopy.length > 0) {
      console.warn(
        "Guest increased number of rooms. Remaining new rooms:",
        addedRoomsCopy
      );
    }

    if (roomMovePairs.length === 0) {
      console.log("No valid room move pairs to process");
      return;
    }

    const identifiesResults = await Promise.allSettled(
      roomMovePairs.map(() => generateIdentifyToken())
    );

    const identifies = identifiesResults
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean) as string[];

    if (identifies.length < roomMovePairs.length) {
      console.warn(
        "Some identify tokens failed to generate, continuing with available tokens"
      );
    }

    const payloads = roomMovePairs.map((pair, i) => ({
      Station: "AP",
      TransactionDate: formattedDate,
      TransactionTime: formattedTime,
      GuestID: String((reservation.guest as any)?._id || reservation.guest),
      GuestName: reservation.guestName,
      GuestMaster: "Y",
      OldRoomNumber: pair.oldRoomNumber,
      NewRoomNumber: pair.newRoomNumber,
      WifiName: reservation.wifi.name,
      WifiPassword: reservation.wifi.password,
      Identify: identifies[i],
      OrderNumber: reservation.id,
    }));

    const results = [];
    for (const body of payloads) {
      try {
        const { Station, ...query } = body;
        const res = await api.post("/roommove", null, {
          headers: { Station },
          params: query,
        });

        const isSuccess = res?.data?.Status === "SUCCESS";

        if (!isSuccess) {
          console.error(
            `Room move failed for ${body.OldRoomNumber} -> ${body.NewRoomNumber}:`,
            res?.data
          );
          throw new AppError(
            `Error moving room ${body.OldRoomNumber} to ${body.NewRoomNumber}`,
            StatusCodes.BAD_GATEWAY
          );
        }

        if (body.Identify !== res?.data?.Identify) {
          throw new AppError(
            "Invalid Identify token received from IPTV",
            StatusCodes.BAD_GATEWAY
          );
        }

        results.push({
          success: true,
          oldRoom: body.OldRoomNumber,
          newRoom: body.NewRoomNumber,
        });
      } catch (error) {
        console.error(
          `Failed to move room ${body.OldRoomNumber} to ${body.NewRoomNumber}:`,
          error
        );
        results.push({
          success: false,
          oldRoom: body.OldRoomNumber,
          newRoom: body.NewRoomNumber,
          error: error,
        });

        throw error;
      }
    }

    console.log("Room move results:", results);
    return results;
  } catch (err: any) {
    console.error(
      "IPTV RoomMove Error:",
      err?.response?.data || err?.message || err
    );
    throw new AppError(
      `Error sending room move request to IPTV: ${err?.message || err}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const getFolio = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      Station,
      TransactionDate,
      TransactionTime,
      RoomNumber,
      GuestID,
      Identify,
      OrderNumber,
    } = req.query;

    const requiredFields = {
      TransactionDate,
      TransactionTime,
      RoomNumber,
      GuestID,
      Identify,
      OrderNumber,
    };

    const Authorization = req.headers.authorization;

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return next(
          new AppError(`${key} missing from req query`, StatusCodes.BAD_REQUEST)
        );
      }
    }

    if (typeof Authorization !== "string") {
      return next(
        new AppError("Authorization must be a string", StatusCodes.BAD_REQUEST)
      );
    }

    const token = process.env.IPTV_SERVER_SIDE_AUTH_TOKEN_HARSH;
    if (!token) {
      return next(
        new AppError(
          "IPTV server side token not found.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    if (!(await bcrypt.compare(Authorization, token))) {
      return next(
        new AppError(
          "Invalid token: IPTV Authorize token not found",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const room = await RoomModel.findOne({ number: RoomNumber });
    if (!room) {
      return next(
        new AppError(
          "Room number not found in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const guestIdStr = String(GuestID).trim();

    if (!mongoose.Types.ObjectId.isValid(guestIdStr)) {
      console.error("Invalid ObjectId:", guestIdStr);
    }

    const guest = await GuestModel.findById(guestIdStr);
    console.log(GuestID, guest);

    if (!guest) {
      return next(
        new AppError(
          "Guest id not found in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findById(OrderNumber);

    console.log(reservation);

    if (!reservation) {
      return next(
        new AppError(
          "Guest is not associated with any checked In / active reservation.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const transactions = await TransactionModel.find({
      guest: GuestID,
      room: room._id,
      reservation: reservation._id,
    });

    await IPTVLogModel.create({
      isSuccess: true,
      response: JSON.stringify(req.query),
      identify: Identify,
      isValidResponseToken: true,
      serverSentRequest: true,
    });

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${now.getFullYear()}`;
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const transactionsNormalized = transactions.map((el) => ({
      Code: el.trancode,
      Date: el.transactionDate,
      Time: el.transactionTime,
      Reference: el.reference,
      Description: el.reason,
      Amount: el.amountInCFA,
    }));

    res.header("Station", "AP");
    res.json({
      Status: "SUCCESS",
      TransactionDate: formattedDate,
      TransactionTime: formattedTime,
      RoomNumber: room.number,
      OrderNumber: reservation._id,
      GuestID: guest._id,
      Transactions: transactionsNormalized,
      Identify,
    });
  }
);

const postFolio = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      Station,
      TransactionDate,
      TransactionTime,
      RoomNumber,
      GuestID,
      Identify,
      GrossAmt,
      Remark,
      Trancode,
      OrderNumber,
    } = req.query;

    const requiredFields = {
      TransactionDate,
      TransactionTime,
      RoomNumber,
      GuestID,
      Identify,
      GrossAmt,
      Trancode,
      OrderNumber,
    };

    const Authorization = req.headers.authorization;

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return next(
          new AppError(`${key} missing from req body`, StatusCodes.BAD_REQUEST)
        );
      }
    }

    if (typeof Authorization !== "string") {
      return next(
        new AppError("Authorization must be a string", StatusCodes.BAD_REQUEST)
      );
    }

    const token = process.env.IPTV_SERVER_SIDE_AUTH_TOKEN_HARSH;
    if (!token) {
      return next(
        new AppError(
          "IPTV server side token not found.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    if (!(await bcrypt.compare(Authorization, token))) {
      return next(
        new AppError(
          "Invalid token: IPTV Authorize token not found",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const room = await RoomModel.findOne({ number: RoomNumber });
    if (!room) {
      return next(
        new AppError(
          "Room number not found in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const guest = await GuestModel.findById(GuestID).populate("user");

    if (!guest) {
      return next(
        new AppError(
          "Guest id not found in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findById(OrderNumber);

    if (!reservation) {
      return next(
        new AppError(
          "Guest is not associated with any checked In / active reservation.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    let bill = await BillModel.findOne({
      guestId: reservation.guest,
      reservationId: reservation._id,
    });
    if (!bill) {
      bill = await BillModel.create([
        { guestId: reservation.guest, reservationId: reservation._id },
      ]).then(([created]) => created);
    }

    if (!bill) {
      return next(
        new AppError(
          "Falied to create and/or find existing bill.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    await BillItemModel.create({
      billId: bill._id,
      description: `${reservation.guestName} purchased on IPTV: ${Remark}`,
      amount: GrossAmt,
    });

    await TransactionModel.create({
      transactionType: "restuarant order",
      reason: `${reservation.guestName} was dillivered charged from IPTV: ${Remark}`,
      amountInCFA: GrossAmt,
      reservation: reservation._id,
      guest: reservation.guest,
      room: room._id,
      transactionDate: TransactionDate,
      transactionTime: TransactionTime,
      trancode: Trancode,
      isCharge: true,
    });

    await IPTVLogModel.create({
      isSuccess: true,
      response: JSON.stringify(req.query),
      identify: Identify,
      isValidResponseToken: true,
      serverSentRequest: true,
    });

    res.json({
      Status: "SUCCESS",
      Identify: Identify,
    });
  }
);

const syncRoom = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      Station,
      TransactionDate,
      TransactionTime,
      RoomNumber,
      Identify,
      OrderNumber,
    } = req.query;

    const requiredFields = {
      TransactionDate,
      TransactionTime,
      RoomNumber,
      Identify,
      OrderNumber,
    };

    const Authorization =
      req.headers.authorization || req.headers.Authorization;

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return next(
          new AppError(`${key} missing from req query`, StatusCodes.BAD_REQUEST)
        );
      }
    }

    if (typeof Authorization !== "string") {
      return next(
        new AppError("Authorization must be a string", StatusCodes.BAD_REQUEST)
      );
    }

    const token = process.env.IPTV_SERVER_SIDE_AUTH_TOKEN_HARSH;
    if (!token) {
      return next(
        new AppError(
          "IPTV server side token not found.",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }

    const isValid = await bcrypt.compare(Authorization, token);
    if (!isValid) {
      return next(
        new AppError(
          "Invalid token: IPTV Authorize token not found",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const room = await RoomModel.findOne({ number: RoomNumber });
    if (!room) {
      return next(
        new AppError(
          "Room number not found in the database.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const reservation = await ReservationModel.findById(OrderNumber)
      .populate("guest")
      .populate("items.roomType")
      .populate("items.rate")
      .populate("items.rooms.room");

    if (!reservation) {
      return next(
        new AppError(
          "No active/checked in reservation found associated with this room id.",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const rooms = reservation.items.flatMap((item) =>
      item.rooms.map((roomEntry) => {
        const r = roomEntry.room as IRoom;
        return {
          RoomNumber: r.number,
          OrderNumber: reservation._id,
          RoomStatus: r.status,
          Guests: [
            {
              GuestID: reservation.guest?._id,
              GuestName: reservation.guestName,
              GuestMaster: "Y",
              LanguageCode: reservation.preferedLanguage,
            },
          ],
        };
      })
    );

    res.status(StatusCodes.OK).json({
      Status: "SUCCESS",
      Rooms: rooms,
      Identify,
    });
  }
);

export const iptv = {
  checkIn,
  checkOut,
  roomMove,
  getFolio,
  postFolio,
  syncRoom,
};
