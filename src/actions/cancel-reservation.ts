"use server";

import { FieldValue } from "firebase-admin/firestore";

import {
  adminDb,
  getVerifiedUser,
} from "@/lib/firebase-admin";

// ======================================================
// GREENSHARE — CANCEL AN EQUIPMENT RESERVATION
// ======================================================
// Only the reservation owner can cancel a booking.
// Cancellation is permitted before the rental starts,
// provided that the equipment has not been collected.
//
// A single Firestore transaction updates the reservation
// and releases its reserved quantity on EVERY occupied
// date, including the scheduled return date.
// ======================================================

export interface CancelReservationResult {
  success: true;
  reservationId: string;
  status: "cancelled";
  releasedDates: string[];
}

function requireReservationId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 150 ||
    value.includes("/")
  ) {
    throw new Error("Invalid reservation ID.");
  }

  return value.trim();
}

function isValidCalendarDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getTodayInLondon(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to verify the current date.");
  }

  return `${year}-${month}-${day}`;
}

export async function cancelReservation(
  idToken: string,
  reservationIdInput: string
): Promise<CancelReservationResult> {
  // Verify the Firebase ID token and active Firestore profile.
  const user = await getVerifiedUser(idToken);

  if (user.role !== "worker" && user.role !== "admin") {
    throw new Error("Your account cannot cancel reservations.");
  }

  const reservationId = requireReservationId(
    reservationIdInput
  );

  const reservationRef = adminDb
    .collection("reservations")
    .doc(reservationId);

  const todayInLondon = getTodayInLondon();

  // All checks and writes occur in the same transaction.
  // If another operation changes any read document,
  // Firestore retries the transaction.
  const releasedDates = await adminDb.runTransaction(
    async (transaction): Promise<string[]> => {
      const reservationSnapshot = await transaction.get(
        reservationRef
      );

      if (!reservationSnapshot.exists) {
        throw new Error("Reservation not found.");
      }

      const reservation = reservationSnapshot.data();

      if (!reservation) {
        throw new Error("Reservation data is unavailable.");
      }

      // Never accept the owner UID from the browser.
      if (reservation.workerId !== user.uid) {
        throw new Error(
          "You can only cancel your own reservations."
        );
      }

      if (reservation.status === "cancelled") {
        throw new Error("This reservation is already cancelled.");
      }

      if (reservation.status !== "active") {
        throw new Error(
          "Only active reservations can be cancelled."
        );
      }

      if (reservation.returnStatus !== "not_collected") {
        throw new Error(
          "Equipment that has been collected cannot be cancelled online."
        );
      }

      const rentalStartDate = reservation.rentalStartDate;

      if (!isValidCalendarDate(rentalStartDate)) {
        throw new Error("The reservation start date is invalid.");
      }

      // The start day itself is too late for self-service
      // cancellation: staff may already be preparing pickup.
      if (rentalStartDate <= todayInLondon) {
        throw new Error(
          "Online cancellation is only available before the rental start date."
        );
      }

      const equipmentId = reservation.equipmentId;
      const quantity = reservation.quantity;
      const occupiedDates = reservation.occupiedDates;

      if (
        typeof equipmentId !== "string" ||
        equipmentId.length === 0 ||
        equipmentId.length > 150 ||
        equipmentId.includes("/")
      ) {
        throw new Error("Invalid equipment record.");
      }

      if (
        typeof quantity !== "number" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 50
      ) {
        throw new Error("Invalid reserved quantity.");
      }

      if (
        !Array.isArray(occupiedDates) ||
        occupiedDates.length === 0 ||
        occupiedDates.length > 4 ||
        !occupiedDates.every(isValidCalendarDate) ||
        new Set(occupiedDates).size !== occupiedDates.length ||
        occupiedDates[0] !== rentalStartDate
      ) {
        throw new Error("Invalid occupied dates in reservation.");
      }

      const availabilityRefs = occupiedDates.map((date: string) =>
        adminDb
          .collection("availability")
          .doc(`${equipmentId}_${date}`)
      );

      // Read every availability document before any writes.
      const availabilitySnapshots = await Promise.all(
        availabilityRefs.map((ref) => transaction.get(ref))
      );

      const updatedQuantities = availabilitySnapshots.map(
        (snapshot, index) => {
          if (!snapshot.exists) {
            throw new Error(
              "Availability data is missing. Cancellation was not applied."
            );
          }

          const data = snapshot.data();

          if (
            !data ||
            data.equipmentId !== equipmentId ||
            data.date !== occupiedDates[index]
          ) {
            throw new Error(
              "Availability data does not match the reservation."
            );
          }

          const reservedQuantity = data.reservedQuantity;

          if (
            typeof reservedQuantity !== "number" ||
            !Number.isSafeInteger(reservedQuantity) ||
            reservedQuantity < quantity
          ) {
            throw new Error(
              "Availability quantities are inconsistent. Cancellation was not applied."
            );
          }

          return reservedQuantity - quantity;
        }
      );

      // Keep availability documents, even when the new
      // reserved quantity is zero. This matches the
      // existing createReservation data model.
      availabilityRefs.forEach((ref, index) => {
        transaction.update(ref, {
          reservedQuantity: updatedQuantities[index],
        });
      });

      transaction.update(reservationRef, {
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return [...occupiedDates];
    }
  );

  return {
    success: true,
    reservationId,
    status: "cancelled",
    releasedDates,
  };
}
