"use server";

import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { adminDb, getVerifiedUser } from "@/lib/firebase-admin";

// GREENSHARE — ADMIN RESERVATION MANAGEMENT
// The existing availability model locks both rental days and the return day.
// All inventory changes and reservation edits happen in one Firestore transaction.

export interface AdminReservationEditInput {
  reservationId: string;
  rentalStartDate: string; // 2027-02-01, 02 or 03
  rentalDays: number;
  quantity: number;
}

export interface AdminReservationChangeResult {
  success: true;
  reservationId: string;
  status: "active" | "cancelled";
}

function requireId(value: unknown): string {
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

function requirePositiveInteger(value: unknown, label: string, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${label} must be a whole number between 1 and ${max}.`);
  }
  return value;
}

function dateIsValid(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function addDays(date: string, count: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}

function reservationPeriod(start: string, days: number) {
  if (!dateIsValid(start) || start < "2027-02-01" || start > "2027-02-03") {
    throw new Error("Start date must be 1, 2 or 3 February 2027.");
  }
  const end = addDays(start, days - 1);
  if (end > "2027-02-03") {
    throw new Error("All paid rental days must fall between 1 and 3 February 2027.");
  }
  const returnDate = addDays(end, 1);
  const occupiedDates: string[] = [];
  for (let current = start; current <= returnDate; current = addDays(current, 1)) {
    occupiedDates.push(current);
  }
  return {
    end,
    occupiedDates,
    returnDeadline: `${returnDate}T15:00:00.000Z`,
  };
}

function checkExistingReservation(data: DocumentData) {
  if (data.status !== "active") {
    throw new Error("Only active reservations can be modified or cancelled.");
  }
  if (data.returnStatus !== "not_collected") {
    throw new Error("Equipment already collected cannot be changed in this workflow.");
  }
  const equipmentId = data.equipmentId;
  requireId(equipmentId);
  const quantity = requirePositiveInteger(data.quantity, "Existing quantity", 50);
  const oldStart = data.rentalStartDate;
  const oldDays = requirePositiveInteger(data.rentalDays, "Existing duration", 3);
  const expected = reservationPeriod(oldStart, oldDays);
  if (
    !Array.isArray(data.occupiedDates) ||
    data.occupiedDates.length !== expected.occupiedDates.length ||
    data.occupiedDates.some((date: unknown, index: number) => date !== expected.occupiedDates[index])
  ) {
    throw new Error("Reservation occupancy is inconsistent. No changes were made.");
  }
  return { equipmentId: equipmentId as string, quantity, occupiedDates: expected.occupiedDates };
}

async function requireAdministrator(idToken: string): Promise<string> {
  const user = await getVerifiedUser(idToken);
  if (user.role !== "admin") throw new Error("Administrator access required.");
  return user.uid;
}

function todayLondon(): string {
  const values = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => values.find((item) => item.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Admin can correct future, not-yet-collected reservations.
export async function adminEditReservation(
  idToken: string,
  input: AdminReservationEditInput
): Promise<AdminReservationChangeResult> {
  const adminUid = await requireAdministrator(idToken);
  if (!input || typeof input !== "object") throw new Error("Edit details are required.");
  const reservationId = requireId(input.reservationId);
  const newQuantity = requirePositiveInteger(input.quantity, "Quantity", 50);
  const newDays = requirePositiveInteger(input.rentalDays, "Rental duration", 3);
  const next = reservationPeriod(input.rentalStartDate, newDays);
  const currentDate = todayLondon();
  if (input.rentalStartDate <= currentDate) {
    throw new Error("A reservation cannot be moved to today or into the past.");
  }
  const reservationRef = adminDb.collection("reservations").doc(reservationId);

  await adminDb.runTransaction(async (tx) => {
    const reservationSnap = await tx.get(reservationRef);
    if (!reservationSnap.exists) throw new Error("Reservation not found.");
    const reservation = reservationSnap.data();
    if (!reservation) throw new Error("Reservation data unavailable.");
    const old = checkExistingReservation(reservation);
    if (reservation.rentalStartDate <= currentDate) {
      throw new Error("Only future reservations can be edited.");
    }
    const equipmentRef = adminDb.collection("equipment").doc(old.equipmentId);
    const dates = Array.from(new Set([...old.occupiedDates, ...next.occupiedDates])).sort();
    const refs = dates.map((date) => adminDb.collection("availability").doc(`${old.equipmentId}_${date}`));
    const [equipmentSnap, ...availabilitySnaps] = await Promise.all([
      tx.get(equipmentRef),
      ...refs.map((ref) => tx.get(ref)),
    ]);
    const equipment = equipmentSnap.data();
    if (!equipmentSnap.exists || !equipment || equipment.active !== true || equipment.approvalStatus !== "approved") {
      throw new Error("Equipment is not available for changes.");
    }
    const stock = equipment.totalStock;
    const rate = reservation.dailyPricePence;
    if (!Number.isSafeInteger(stock) || stock < 1 || !Number.isSafeInteger(rate) || rate < 0) {
      throw new Error("Invalid equipment stock or reservation price.");
    }
    const total = rate * newQuantity * newDays;
    if (!Number.isSafeInteger(total)) throw new Error("Price calculation overflow.");

    const updated = dates.map((date, index) => {
      const snapshot = availabilitySnaps[index];
      const data = snapshot.data();
      if (!snapshot.exists || !data || data.equipmentId !== old.equipmentId || data.date !== date) {
        // A new date may be unoccupied and have no availability document yet.
        if (!snapshot.exists && !old.occupiedDates.includes(date)) {
          if (newQuantity > stock) throw new Error(`Insufficient stock on ${date}.`);
          return newQuantity;
        }
        throw new Error(`Inconsistent availability on ${date}.`);
      }
      const current = data.reservedQuantity;
      if (!Number.isSafeInteger(current) || current < 0 || current > stock) {
        throw new Error(`Invalid inventory count on ${date}.`);
      }
      const remaining = current - (old.occupiedDates.includes(date) ? old.quantity : 0);
      if (remaining < 0) throw new Error(`Cannot release stock on ${date}.`);
      const replacement = remaining + (next.occupiedDates.includes(date) ? newQuantity : 0);
      if (replacement > stock) throw new Error(`Only ${stock - remaining} unit(s) available on ${date}.`);
      return replacement;
    });

    refs.forEach((ref, index) => {
      tx.set(ref, {
        id: ref.id, equipmentId: old.equipmentId, date: dates[index], reservedQuantity: updated[index],
      });
    });
    tx.update(reservationRef, {
      date: input.rentalStartDate,
      rentalStartDate: input.rentalStartDate,
      rentalEndDate: next.end,
      rentalDays: newDays,
      quantity: newQuantity,
      occupiedDates: next.occupiedDates,
      returnDeadline: next.returnDeadline,
      totalPricePence: total,
      lastEditedBy: adminUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true, reservationId, status: "active" };
}

// Admin cancellation keeps the record for audit and releases all occupied days.
export async function adminCancelReservation(
  idToken: string,
  reservationIdInput: string
): Promise<AdminReservationChangeResult> {
  const adminUid = await requireAdministrator(idToken);
  const reservationId = requireId(reservationIdInput);
  const ref = adminDb.collection("reservations").doc(reservationId);
  await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new Error("Reservation not found.");
    const data = snapshot.data();
    if (!data) throw new Error("Reservation data unavailable.");
    const current = checkExistingReservation(data);
    if (data.rentalStartDate <= todayLondon()) {
      throw new Error("Only future, not-yet-collected bookings can be cancelled in this workflow.");
    }
    const refs = current.occupiedDates.map((date) =>
      adminDb.collection("availability").doc(`${current.equipmentId}_${date}`)
    );
    const snaps = await Promise.all(refs.map((item) => tx.get(item)));
    const updated = snaps.map((item, index) => {
      const dataForDate = item.data();
      if (!item.exists || !dataForDate || dataForDate.equipmentId !== current.equipmentId || dataForDate.date !== current.occupiedDates[index]) {
        throw new Error("Availability data is inconsistent. Cancellation was not applied.");
      }
      const count = dataForDate.reservedQuantity;
      if (!Number.isSafeInteger(count) || count < current.quantity) {
        throw new Error("Availability counts are inconsistent. Cancellation was not applied.");
      }
      return count - current.quantity;
    });
    refs.forEach((item, index) => tx.update(item, { reservedQuantity: updated[index] }));
    tx.update(ref, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: adminUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true, reservationId, status: "cancelled" };
}
