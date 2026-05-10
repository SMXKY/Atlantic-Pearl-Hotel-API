import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../../util/catchAsync";
import { CRUD } from "../../util/Crud.util";
import { GuestModel } from "../../models/HR/Guest.model";
import { UserModel } from "../../models/HR/User.model";
import { AppError } from "../../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { allPermissions } from "../../types/Permissions.type";
import { IUser } from "../../models/HR/User.model";
import { ReservationModel } from "../../models/Reservations/Reservation.model";
import { appResponder } from "../../util/appResponder.util";
import { InvoiceModel } from "../../models/Finance/Invoice.model";
import { BillModel } from "../../models/Finance/Bill.model";
import { TransactionModel } from "../../models/Finance/Transaction.model";

const CRUDGuest: CRUD = new CRUD(GuestModel);

const createGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.create(req.body, res, req);
  }
);

const readOneGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.readOne(req.params.id, res, ["user"], req);
  }
);

const readAllGuests = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.readAll(res, req, 1, 100, ["user"]);
  }
);

const updateGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDGuest.update(req.params.id, res, req);
  }
);

const deleteGuest = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.id) {
      return next(
        new AppError(
          "Guest Id is required in request parameters",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    const guest = await GuestModel.findById(req.params.id);

    if (!guest) {
      return next(
        new AppError(
          "Guest does not exist in the database",
          StatusCodes.NOT_FOUND
        )
      );
    }

    await UserModel.findByIdAndDelete(guest?.user);
    await CRUDGuest.delete(req.params.id, res, req);
  }
);

export const getGuestDetails = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const isAdmin = res.locals.user.permissions.includes(
      allPermissions.guest.readDetailsAsAdmin
    );

    // ── Core guest + user ────────────────────────────────────────────────
    const guest = await GuestModel.findOne({ user: id }).populate<{
      user: IUser;
    }>("user");

    if (!guest) {
      return next(
        new AppError("No guest found with that ID", StatusCodes.NOT_FOUND)
      );
    }

    const user = guest.user as IUser;

    // ── Reservations ─────────────────────────────────────────────────────
    const reservations = await ReservationModel.find({ guest: guest._id })
      .populate("items.roomType")
      .populate("items.rate")
      .populate("items.rooms.room")
      .sort({ createdAt: -1 })
      .lean();

    const totalStays = reservations.filter(
      (r) => r.status === "checked out"
    ).length;

    const totalNights = reservations
      .filter((r) => r.status === "checked out")
      .reduce((sum, r) => {
        if (!r.checkInDate || !r.checkOutDate) return sum;
        return (
          sum +
          Math.ceil(
            (new Date(r.checkOutDate).getTime() -
              new Date(r.checkInDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
      }, 0);

    const currentReservation =
      reservations.find((r) => r.status === "checked in") ?? null;

    const upcomingReservations = reservations.filter((r) =>
      ["pending", "confirmed"].includes(r.status)
    );

    // ── Base response — available to all ─────────────────────────────────
    const base = {
      _id: guest._id,
      name: user.name,
      email: user.email,
      phoneNumber: (user as any).phoneNumber,
      profilePicture: user.profilePictureUrl,
      guestType: guest.guestType,
      preferredLanguage: guest.preferedLanguage,
      countryOfResidence: guest.countryOfResidence,
      currentReservation,
      upcomingReservations,
      totalStays,
      totalNights,
      memberSince: guest.createdAt,
    };

    if (!isAdmin) {
      return appResponder(StatusCodes.OK, base, res);
    }

    // ── Admin-only enrichment ─────────────────────────────────────────────
    const reservationIds = reservations.map((r) => r._id);

    const [invoices, transactions, bills] = await Promise.all([
      InvoiceModel.find({ reservation: { $in: reservationIds } }).lean(),
      TransactionModel.find({ guest: guest._id })
        .sort({ createdAt: -1 })
        .lean(),
      BillModel.find({ reservationId: { $in: reservationIds } })
        .populate("billItems")
        .lean(),
    ]);

    // Spending breakdown by transaction type
    const spendingByCategory = transactions.reduce((acc, txn) => {
      acc[txn.transactionType] =
        (acc[txn.transactionType] || 0) + txn.amountInCFA;
      return acc;
    }, {} as Record<string, number>);

    const totalSpent = transactions
      .filter((t) => t.isCharge)
      .reduce((sum, t) => sum + t.amountInCFA, 0);

    const averageSpendPerStay = totalStays > 0 ? totalSpent / totalStays : 0;

    const outstandingBalance = invoices
      .filter((inv) => ["unpaid", "partial"].includes(inv.paymentStatus))
      .reduce((sum, inv) => sum + inv.amountDue, 0);

    // ── Per-reservation financial summary ────────────────────────────────
    const reservationFinancials = reservations.map((r) => {
      const invoice =
        invoices.find(
          (inv) => inv.reservation.toString() === r._id.toString()
        ) ?? null;

      const bill =
        bills.find(
          (b) => String(b.reservationId).toString() === r._id.toString()
        ) ?? null;

      const reservationTransactions = transactions.filter(
        (t) => t.reservation?.toString() === r._id.toString()
      );

      let totalDebtInCFA = 0;
      let totalBill = 0;

      if (bill && bill.billItems?.length) {
        bill.billItems.forEach((item: any) => {
          totalDebtInCFA += item.amount;
          totalBill += item.amount;
        });
      }

      if (invoice) totalDebtInCFA += invoice.amountDue;

      return {
        reservationId: r._id,
        bookingReference: r.bookingReference,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        status: r.status,
        invoice: invoice
          ? {
              ref: invoice.invoiceNumber,
              lineItems: invoice.lineItems,
              total: invoice.grandTotal,
              amountPaid: invoice.amountPaid,
              amountDue: invoice.amountDue,
            }
          : null,
        bill: {
          ref: bill?._id ?? null,
          items: bill?.billItems ?? [],
          total: totalBill,
        },
        total: totalDebtInCFA,
        transactions: reservationTransactions,
        totalChargesOnStay: reservationTransactions
          .filter((t) => t.isCharge)
          .reduce((sum, t) => sum + t.amountInCFA, 0),
      };
    });

    const admin = {
      ...base,
      NIC: guest.NIC,
      guestTag: guest.guestTag,
      isLoyaltyProgramMember: guest.isLoyaltyProgramMember,
      hasConfirmedEmail: guest.hasConfirmedEmail,
      reservationFinancials, // per-reservation breakdown with bill + invoice + transactions
      transactions, // full flat ledger across all stays
      financials: {
        totalSpent,
        averageSpendPerStay,
        outstandingBalance,
        spendingByCategory,
        lifetimeValue: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
        totalBillCharges: bills.reduce(
          (sum, b) =>
            sum +
            (b.billItems?.reduce(
              (s: number, item: any) => s + item.amount,
              0
            ) ?? 0),
          0
        ),
      },
    };
    appResponder(StatusCodes.OK, admin, res);
  }
);

export const guestControllers = {
  createGuest,
  readOneGuest,
  readAllGuests,
  updateGuest,
  deleteGuest,
  getGuestDetails,
};
