
"use server";

import { FieldValue } from "firebase-admin/firestore";
import { RENTAL_TERMS_VERSION } from "@/lib/rental-constants";

import {
  adminDb,
  getVerifiedUser,
} from "@/lib/firebase-admin";

import {
  isValidReservationDate,
  type ReservationDate,
} from "@/types";

// ======================================================
// GREENSHARE — RESERVATION SERVER ACTIONS
// ======================================================

// Booking dates are restricted by the assessment brief.
// Rental periods use complete calendar days.
//
// The return deadline is 15:00 Europe/London on the
// calendar day following the final rental day.
//
// For safety, inventory remains unavailable throughout
// the scheduled return date. Future return-processing
// functionality will manage physical check-in.

const FIRST_RENTAL_DATE = "2027-02-01";
const LAST_RENTAL_DATE = "2027-02-03";

const MAX_RENTAL_DAYS = 3;
const MAX_QUANTITY = 50;

// All relevant dates are in February, when the
// Europe/London time zone is GMT (UTC+00:00).

const RETURN_HOUR = 15;

// ------------------------------------------------------
// INPUT AND OUTPUT TYPES
// ------------------------------------------------------

export interface CreateReservationInput {
  equipmentId: string;

  // First day of the rental.
  date: string;

  // Number of paid rental calendar days.
  rentalDays: number;

  quantity: number;

  pickupLocationId: string;
  returnLocationId: string;

  // Explicit agreement to the currently published
  // GreenShare rental terms.
  termsAccepted: boolean;
}

export interface CreateReservationResult {
  success: true;

  reservationId: string;
  equipmentId: string;

  date: ReservationDate;
  rentalStartDate: ReservationDate;
  rentalEndDate: string;

  rentalDays: number;
  quantity: number;

  // Includes the scheduled return date.
  occupiedDates: string[];

  returnDeadline: string;

  dailyPricePence: number;
  totalPricePence: number;

  termsVersion: string;
}

// ------------------------------------------------------
// VALIDATION HELPERS
// ------------------------------------------------------

function requireId(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 150 ||
    value.includes("/")
  ) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value.trim();
}

function requireInteger(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `${fieldName} must be a whole number ` +
        `between ${min} and ${max}.`
    );
  }

  return value;
}

// ------------------------------------------------------
// CALENDAR HELPERS
// ------------------------------------------------------

// UTC arithmetic is safe for the fixed February 2027
// assessment dates. All return deadline timestamps
// are expressed as UTC, equivalent to GMT in February.

function addCalendarDays(
  date: string,
  numberOfDays: number
): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid reservation date.");
  }

  parsed.setUTCDate(
    parsed.getUTCDate() + numberOfDays
  );

  return parsed.toISOString().slice(0, 10);
}

function enumerateDates(
  firstDate: string,
  lastDate: string
): string[] {
  const dates: string[] = [];

  let currentDate = firstDate;

  while (currentDate <= lastDate) {
    dates.push(currentDate);

    currentDate = addCalendarDays(
      currentDate,
      1
    );
  }

  return dates;
}

function calculateRentalPeriod(
  startDate: ReservationDate,
  rentalDays: number
) {
  const rentalEndDate = addCalendarDays(
    startDate,
    rentalDays - 1
  );

  if (
    startDate < FIRST_RENTAL_DATE ||
    rentalEndDate > LAST_RENTAL_DATE
  ) {
    throw new Error(
      "Rental days must fall between " +
        "1 and 3 February 2027."
    );
  }

  // The next calendar day is the return day.
  const returnDate = addCalendarDays(
    rentalEndDate,
    1
  );

  const returnDeadline =
    `${returnDate}T` +
    `${String(RETURN_HOUR).padStart(2, "0")}` +
    ":00:00.000Z";

  // Include the return date in inventory occupancy.
  //
  // Example:
  // Rental: 1 February, one day.
  // Return deadline: 2 February, 15:00.
  // Occupied dates: 1 and 2 February.
  //
  // This conservatively prevents a second borrower
  // collecting the same unit on the return day.

  const occupiedDates = enumerateDates(
    startDate,
    returnDate
  );

  return {
    rentalStartDate: startDate,
    rentalEndDate,
    returnDate,
    returnDeadline,
    occupiedDates,
  };
}

// ------------------------------------------------------
// CREATE RESERVATION
// ------------------------------------------------------

export async function createReservation(
  idToken: string,
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  // ----------------------------------------------------
  // 1. AUTHENTICATION AND AUTHORISATION
  // ----------------------------------------------------

  const user = await getVerifiedUser(idToken);

  if (
    user.role !== "worker" &&
    user.role !== "admin"
  ) {
    throw new Error(
      "Your account cannot create reservations."
    );
  }

  // ----------------------------------------------------
  // 2. INPUT VALIDATION
  // ----------------------------------------------------

  if (!input || typeof input !== "object") {
    throw new Error(
      "Reservation details are required."
    );
  }

  const equipmentId = requireId(
    input.equipmentId,
    "equipment ID"
  );

  const pickupLocationId = requireId(
    input.pickupLocationId,
    "pickup location"
  );

  const returnLocationId = requireId(
    input.returnLocationId,
    "return location"
  );

  const quantity = requireInteger(
    input.quantity,
    "Quantity",
    1,
    MAX_QUANTITY
  );

  const rentalDays = requireInteger(
    input.rentalDays,
    "Rental duration",
    1,
    MAX_RENTAL_DAYS
  );

  if (
    typeof input.date !== "string" ||
    !isValidReservationDate(input.date)
  ) {
    throw new Error(
      "Reservations can only begin on " +
        "1, 2 or 3 February 2027."
    );
  }

  if (input.termsAccepted !== true) {
    throw new Error(
      "You must accept the GreenShare " +
        "Rental Terms & Conditions."
    );
  }

  const date: ReservationDate = input.date;

  const rentalPeriod = calculateRentalPeriod(
    date,
    rentalDays
  );

  // ----------------------------------------------------
  // 3. PREPARE FIRESTORE REFERENCES
  // ----------------------------------------------------

  const equipmentRef = adminDb
    .collection("equipment")
    .doc(equipmentId);

  const pickupRef = adminDb
    .collection("libraries")
    .doc(pickupLocationId);

  const returnRef = adminDb
    .collection("libraries")
    .doc(returnLocationId);

  const availabilityReferences =
    rentalPeriod.occupiedDates.map(
      (occupiedDate) => {
        const availabilityId =
          `${equipmentId}_${occupiedDate}`;

        return {
          date: occupiedDate,
          id: availabilityId,
          ref: adminDb
            .collection("availability")
            .doc(availabilityId),
        };
      }
    );

  const reservationRef = adminDb
    .collection("reservations")
    .doc();

  // ----------------------------------------------------
  // 4. FIRESTORE TRANSACTION
  // ----------------------------------------------------

  // Every availability document is read inside the
  // same transaction before any write is performed.
  //
  // Firestore will retry a conflicting transaction.
  // This prevents overlapping bookings from exceeding
  // the available stock when all booking operations
  // follow the same availability-document convention.

  const dailyPricePence =
    await adminDb.runTransaction(
      async (transaction) => {
        // ----------------------------------------------
        // READ ALL REQUIRED DOCUMENTS FIRST
        // ----------------------------------------------

        const [
          equipmentSnapshot,
          pickupSnapshot,
          returnSnapshot,
          ...availabilitySnapshots
        ] = await Promise.all([
          transaction.get(equipmentRef),
          transaction.get(pickupRef),
          transaction.get(returnRef),
          ...availabilityReferences.map(
            (item) =>
              transaction.get(item.ref)
          ),
        ]);

        // ----------------------------------------------
        // VALIDATE EQUIPMENT
        // ----------------------------------------------

        if (!equipmentSnapshot.exists) {
          throw new Error(
            "The selected equipment does not exist."
          );
        }

        const equipment =
          equipmentSnapshot.data();

        if (
          !equipment ||
          equipment.active !== true ||
          equipment.approvalStatus !== "approved"
        ) {
          throw new Error(
            "This equipment is not approved for borrowing."
          );
        }

        const totalStock = equipment.totalStock;

        if (
          typeof totalStock !== "number" ||
          !Number.isSafeInteger(totalStock) ||
          totalStock < 1
        ) {
          throw new Error(
            "The equipment stock record is invalid."
          );
        }

        const pricePence =
          equipment.dailyPricePence;

        if (
          typeof pricePence !== "number" ||
          !Number.isSafeInteger(pricePence) ||
          pricePence < 0
        ) {
          throw new Error(
            "The equipment price is invalid."
          );
        }

        const totalPricePence =
          pricePence *
          quantity *
          rentalDays;

        if (
          !Number.isSafeInteger(
            totalPricePence
          )
        ) {
          throw new Error(
            "The calculated rental price is invalid."
          );
        }

        // ----------------------------------------------
        // VALIDATE COLLECTION POINTS
        // ----------------------------------------------

        if (
          !pickupSnapshot.exists ||
          pickupSnapshot.data()?.active !== true
        ) {
          throw new Error(
            "The pickup location is unavailable."
          );
        }

        if (
          equipment.currentLocationId !==
          pickupLocationId
        ) {
          throw new Error(
            "This equipment is not stored at " +
              "the selected pickup location."
          );
        }

        if (
          !returnSnapshot.exists ||
          returnSnapshot.data()?.active !== true
        ) {
          throw new Error(
            "The return location is unavailable."
          );
        }

        if (
          equipment.ownership !== "greenshare" &&
          equipment.ownership !== "community"
        ) {
          throw new Error(
            "The equipment ownership record is invalid."
          );
        }

        if (
          equipment.ownership === "community" &&
          returnLocationId !== pickupLocationId
        ) {
          throw new Error(
            "Community-owned equipment must be " +
              "returned to its original location."
          );
        }

        // ----------------------------------------------
        // VALIDATE EVERY OCCUPIED DATE
        // ----------------------------------------------

        const reservedQuantities: number[] = [];

        for (
          let index = 0;
          index < availabilityReferences.length;
          index++
        ) {
          const availabilitySnapshot =
            availabilitySnapshots[index];

          const existingData =
            availabilitySnapshot.exists
              ? availabilitySnapshot.data()
              : undefined;

          if (
            existingData &&
            (
              existingData.equipmentId !== equipmentId ||
              existingData.date !==
                availabilityReferences[index].date
            )
          ) {
            throw new Error(
              "The availability record has " +
                "inconsistent equipment or date data."
            );
          }

          const reservedQuantity =
            existingData
              ? existingData.reservedQuantity
              : 0;

          if (
            typeof reservedQuantity !== "number" ||
            !Number.isSafeInteger(
              reservedQuantity
            ) ||
            reservedQuantity < 0 ||
            reservedQuantity > totalStock
          ) {
            throw new Error(
              "The availability record is inconsistent."
            );
          }

          const availableQuantity =
            totalStock -
            reservedQuantity;

          if (quantity > availableQuantity) {
            throw new Error(
              `Only ${availableQuantity} unit(s) ` +
                `are available on ` +
                `${availabilityReferences[index].date}.`
            );
          }

          reservedQuantities.push(
            reservedQuantity
          );
        }

        // ----------------------------------------------
        // UPDATE ALL OCCUPIED DATES
        // ----------------------------------------------

        for (
          let index = 0;
          index < availabilityReferences.length;
          index++
        ) {
          const item =
            availabilityReferences[index];

          transaction.set(item.ref, {
            id: item.id,
            equipmentId,
            date: item.date,

            reservedQuantity:
              reservedQuantities[index] +
              quantity,
          });
        }

        // ----------------------------------------------
        // CREATE RESERVATION RECORD
        // ----------------------------------------------

        transaction.create(
          reservationRef,
          {
            id: reservationRef.id,

            // Identity is derived from the verified
            // Firebase user, never browser input.
            workerId: user.uid,

            equipmentId,
            libraryId: pickupLocationId,

            // Keep the original date field for
            // compatibility with the initial model.
            date,

            rentalStartDate:
              rentalPeriod.rentalStartDate,

            rentalEndDate:
              rentalPeriod.rentalEndDate,

            rentalDays,
            quantity,

            occupiedDates:
              rentalPeriod.occupiedDates,

            returnDeadline:
              rentalPeriod.returnDeadline,

            returnDeadlineTimeZone:
              "Europe/London",

            pickupLocationId,
            returnLocationId,

            status: "active",

            returnStatus: "not_collected",

            // The price and conditions are snapshots
            // of the agreement at booking time.
            dailyPricePence: pricePence,
            totalPricePence,

            termsVersion:
              RENTAL_TERMS_VERSION,

            termsAccepted: true,

            termsAcceptedAt:
              FieldValue.serverTimestamp(),

            createdAt:
              FieldValue.serverTimestamp(),

            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );

        return pricePence;
      }
    );

  // ----------------------------------------------------
  // 5. SUCCESSFUL RESULT
  // ----------------------------------------------------

  return {
    success: true,

    reservationId: reservationRef.id,
    equipmentId,

    date,
    rentalStartDate:
      rentalPeriod.rentalStartDate,

    rentalEndDate:
      rentalPeriod.rentalEndDate,

    rentalDays,
    quantity,

    occupiedDates:
      rentalPeriod.occupiedDates,

    returnDeadline:
      rentalPeriod.returnDeadline,

    dailyPricePence,

    totalPricePence:
      dailyPricePence *
      quantity *
      rentalDays,

    termsVersion: RENTAL_TERMS_VERSION,
  };
}
