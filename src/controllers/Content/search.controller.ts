import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Joi from "joi";
import { catchAsync } from "../../util/catchAsync";
import { appResponder } from "../../util/appResponder.util";
import { hasPermission } from "../../util/hasPermission.util";
import { allPermissions } from "../../types/Permissions.type";
import { IUser, UserModel } from "../../models/HR/User.model";
import { IRoom, RoomModel } from "../../models/Properties/Room.model";
import {
  IRoomType,
  RoomTypeModel,
} from "../../models/Properties/RoomType.model";
import {
  IReservation,
  ReservationModel,
} from "../../models/Reservations/Reservation.model";

interface SearchResult {
  id: string;
  type: "employee" | "guest" | "reservation" | "room" | "roomType";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  meta?: { label: string; value: string }[];
  relevanceScore?: number;
}

interface SearchQuery {
  term: string;
  type?: "employee" | "guest" | "reservation" | "room" | "roomType";
  dateRange?: "today" | "this month" | "this year" | "all time";
  page: number;
  limit: number;
}

const searchValidationSchema = Joi.object({
  term: Joi.string().max(200).allow("").default(""),
  type: Joi.string()
    .valid("employee", "guest", "reservation", "room", "roomType")
    .optional(),
  dateRange: Joi.string()
    .valid("today", "this month", "this year", "all time")
    .default("this month"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const normalizeText = (value: string): string => {
  return value?.trim().toLowerCase() || "";
};

const parseDateRange = (range: string) => {
  const now = new Date();

  switch (range) {
    case "today":
      return {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
      };

    case "this month":
      return {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
      };

    case "this year":
      return {
        $gte: new Date(now.getFullYear(), 0, 1),
      };

    case "all time":
    default:
      return null;
  }
};

const calculateRelevanceScore = (
  searchTerm: string,
  matchedField: string
): number => {
  const term = normalizeText(searchTerm);
  const field = normalizeText(matchedField);

  if (field === term) return 100; // Exact match
  if (field.startsWith(term)) return 80; // Starts with
  if (field.includes(term)) return 60; // Contains
  return 40; // Default
};

const searchEmployees = async (
  searchTerm: string,
  canView: boolean
): Promise<SearchResult[]> => {
  if (!canView || !searchTerm) return [];

  try {
    const users = await UserModel.find({
      userType: "Employee",
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("name email profilePictureUrl createdAt updatedAt")
      .limit(100)
      .lean()
      .exec();

    return users.map((u: any) => ({
      id: u._id.toString(),
      type: "employee",
      title: u.name,
      subtitle: u.email,
      imageUrl: u.profilePictureUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      relevanceScore: Math.max(
        calculateRelevanceScore(searchTerm, u.name),
        calculateRelevanceScore(searchTerm, u.email)
      ),
    }));
  } catch (error) {
    return [];
  }
};

const searchGuests = async (
  searchTerm: string,
  canView: boolean
): Promise<SearchResult[]> => {
  if (!canView || !searchTerm) return [];

  try {
    const users = await UserModel.find({
      userType: "Guest",
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("name email profilePictureUrl createdAt updatedAt")
      .limit(100)
      .lean()
      .exec();

    return users.map((u: any) => ({
      id: u._id.toString(),
      type: "guest",
      title: u.name,
      subtitle: u.email,
      imageUrl: u.profilePictureUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      relevanceScore: Math.max(
        calculateRelevanceScore(searchTerm, u.name),
        calculateRelevanceScore(searchTerm, u.email)
      ),
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Search reservations
 */
const searchReservations = async (
  searchTerm: string,
  dateRange: string,
  canView: boolean
): Promise<SearchResult[]> => {
  if (!canView || !searchTerm) return [];

  try {
    const query: any = {
      $or: [
        { bookingReference: { $regex: searchTerm, $options: "i" } },
        { guestName: { $regex: searchTerm, $options: "i" } },
        { guestEmail: { $regex: searchTerm, $options: "i" } },
        { guestPhone: { $regex: searchTerm, $options: "i" } },
      ],
    };

    const dateFilter = parseDateRange(dateRange);
    if (dateFilter) {
      query.checkInDate = dateFilter;
    }

    const reservations = await ReservationModel.find(query)
      .select(
        "bookingReference guestName guestEmail guestPhone status checkInDate checkOutDate createdAt updatedAt"
      )
      .limit(100)
      .lean()
      .exec();

    return reservations.map((r: any) => ({
      id: r._id.toString(),
      type: "reservation",
      title: r.bookingReference,
      subtitle: r.guestName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      meta: [
        { label: "Status", value: r.status },
        { label: "Email", value: r.guestEmail || "N/A" },
        {
          label: "Check-in",
          value: new Date(r.checkInDate).toLocaleDateString(),
        },
      ],
      relevanceScore: Math.max(
        calculateRelevanceScore(searchTerm, r.bookingReference),
        calculateRelevanceScore(searchTerm, r.guestName),
        calculateRelevanceScore(searchTerm, r.guestEmail || "")
      ),
    }));
  } catch (error) {
    return [];
  }
};

const searchRooms = async (
  searchTerm: string,
  canView: boolean
): Promise<SearchResult[]> => {
  if (!searchTerm) return [];

  try {
    const rooms = await RoomModel.find({
      $or: [
        { number: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("number floorNumber viewType imageUrl createdAt updatedAt")
      .limit(100)
      .lean()
      .exec();

    return rooms.map((r: any) => ({
      id: r._id.toString(),
      type: "room",
      title: `Room ${r.number}`,
      subtitle: r.viewType,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      meta: [{ label: "Floor", value: r.floorNumber?.toString() || "N/A" }],
      relevanceScore: calculateRelevanceScore(searchTerm, r.number),
    }));
  } catch (error) {
    return [];
  }
};

const searchRoomTypes = async (
  searchTerm: string,
  canView: boolean
): Promise<SearchResult[]> => {
  if (!searchTerm) return [];

  try {
    const types = await RoomTypeModel.find({
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("name description imageUrl basePrice createdAt updatedAt")
      .limit(100)
      .lean()
      .exec();

    return types.map((t: any) => ({
      id: t._id.toString(),
      type: "roomType",
      title: t.name,
      subtitle: t.description,
      imageUrl: t.imageUrl,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      meta: [{ label: "Base Price", value: `${t.basePrice} CFA` }],
      relevanceScore: Math.max(
        calculateRelevanceScore(searchTerm, t.name),
        calculateRelevanceScore(searchTerm, t.description || "")
      ),
    }));
  } catch (error) {
    return [];
  }
};

export const searchController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = searchValidationSchema.validate(req.body);

    if (error) {
      return appResponder(
        StatusCodes.BAD_REQUEST,
        {
          success: false,
          message: "Invalid search parameters",
          errors: error.details.map((d) => d.message),
        },
        res
      );
    }

    const { term, type, dateRange, page, limit } = value as SearchQuery;
    const searchTerm = normalizeText(term);

    if (searchTerm && searchTerm.length < 2) {
      return appResponder(
        StatusCodes.OK,
        {
          success: true,
          data: [],
          message: "Search term must be at least 2 characters",
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
        res
      );
    }

    const userPermissions = res.locals.user.permissions || [];

    const canViewEmployees = hasPermission(userPermissions, [
      allPermissions.employees.readAll,
    ]);

    const canViewGuests = hasPermission(userPermissions, [
      allPermissions.guest.readAll,
    ]);

    const canViewReservations = hasPermission(userPermissions, [
      allPermissions.reservations.readAll,
    ]);

    const canViewRooms = hasPermission(userPermissions, [
      allPermissions.rooms.readAll,
    ]);

    const canViewRoomTypes = hasPermission(userPermissions, [
      allPermissions.roomTypes.readAll,
    ]);

    const searchPromises: Promise<SearchResult[]>[] = [];

    if (!type || type === "employee") {
      searchPromises.push(searchEmployees(searchTerm, canViewEmployees));
    }

    if (!type || type === "guest") {
      searchPromises.push(searchGuests(searchTerm, canViewGuests));
    }

    if (!type || type === "reservation") {
      searchPromises.push(
        searchReservations(searchTerm, dateRange!, canViewReservations)
      );
    }

    if (!type || type === "room") {
      searchPromises.push(searchRooms(searchTerm, canViewRooms));
    }

    if (!type || type === "roomType") {
      searchPromises.push(searchRoomTypes(searchTerm, canViewRoomTypes));
    }

    const searchResults = await Promise.all(searchPromises);

    const allResults: SearchResult[] = searchResults.flat();

    const sortedResults = allResults.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      const dateA = a.updatedAt?.getTime() || 0;
      const dateB = b.updatedAt?.getTime() || 0;

      return dateB - dateA;
    });

    const total = sortedResults.length;
    const skip = (page - 1) * limit;
    const paginatedResults = sortedResults.slice(skip, skip + limit);

    return appResponder(
      StatusCodes.OK,
      {
        success: true,
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      res
    );
  }
);
