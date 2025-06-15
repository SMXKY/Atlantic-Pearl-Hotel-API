import { ReservationModel, IReservation } from "../models/Reservation.model";
import { GuestModel, IGuest } from "../models/Guest.model";
import { UserModel, IUser } from "../models/User.model";

export async function getGuestDetailsFromReservation(
  reservationId: string
): Promise<any> {
  try {
    // Find the reservation by ID
    const reservation: IReservation | null = await ReservationModel.findById(
      reservationId
    ).populate("guest");

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    let guestDetails: any;

    if (reservation.guest) {
      // Guest exists in the system
      const guest: IGuest = reservation.guest as IGuest;
      const user: IUser | null = await UserModel.findById(guest.user);

      if (!user) {
        throw new Error("User not found");
      }

      guestDetails = {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        countryOfResidence: guest.countryOfResidence,
        preferedCurrency: guest.preferedCurrency,
        preferedLanguage: guest.preferedLanguage,
        isLoyaltyProgramMember: guest.isLoyaltyProgramMember,
        guestTag: guest.guestTag,
        guestType: guest.guestType,
        NIC: guest.NIC,
      };
    } else {
      // Guest does not exist in the system, use reservation details
      guestDetails = {
        name: reservation.guestName,
        email: reservation.guestEmail,
        phoneNumber: reservation.guestPhoneNumber,
        countryOfResidence: reservation.countryOfResidence,
        NIC: reservation.guestNIC,
      };
    }

    return guestDetails;
  } catch (err) {
    throw err;
  }
}

// Example usage:
// getGuestDetailsFromReservation('reservationIdHere').then(details => console.log(details)).catch(err => console.error(err));
