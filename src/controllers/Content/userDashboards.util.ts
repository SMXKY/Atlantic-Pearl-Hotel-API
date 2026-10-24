import { NotificationModel } from "../../models/Notifications/Notification.model";
import { UserModel } from "../../models/HR/User.model";
import { EmployeeModel } from "../../models/HR/Employee.model";
import { GuestModel } from "../../models/HR/Guest.model";
import { ReservationModel } from "../../models/Reservations/Reservation.model";

import dayjs from "dayjs";

export async function computeDefaultDashboard(
  userId: string,
  userType: "Employee" | "Guest"
) {
  const notifications = await NotificationModel.find({
    $or: [{ user: userId }, { isGlobal: true }],
    isRead: false,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  if (userType === "Employee") {
    const employee = await EmployeeModel.findOne({ user: userId })
      .populate("department")
      .populate("position")
      .lean();

    return {
      type: "employee",
      notifications,
      employee: {
        department: employee?.department,
        position: employee?.position,
        employmentType: employee?.employmentType,
        tenureInMonths: dayjs().diff(dayjs(employee?.dateHired), "month"),
      },
    };
  }

  if (userType === "Guest") {
    const guest = await GuestModel.findOne({ user: userId });

    const recentReservations = await ReservationModel.find({ guest: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      type: "guest",
      notifications,
      guest: {
        guestType: guest?.guestType,
        guestTag: guest?.guestTag,
      },
      recentReservations,
    };
  }
}
