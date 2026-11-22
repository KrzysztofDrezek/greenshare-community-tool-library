"use server";

import { adminDb, getVerifiedUser } from "@/lib/firebase-admin";

// ======================================================
// GREENSHARE — READ MY RESERVATIONS
// ======================================================
// Data is read on the trusted server using a verified
// Firebase ID token. The browser cannot choose another
// worker's UID.
// ======================================================

export interface MyReservation {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentBrand: string;
  quantity: number;
  rentalStartDate: string;
  rentalEndDate: string;
  rentalDays: number;
  returnDeadline: string;
  pickupLocationId: string;
  pickupLocationName: string;
  returnLocationId: string;
  returnLocationName: string;
  dailyPricePence: number;
  totalPricePence: number;
  status: string;
  returnStatus: string;
  termsVersion: string;
  createdAt: string | null;
  cancelledAt: string | null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNonNegativeInteger(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0;
}

function readTimestamp(value: unknown): string | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("toDate" in value) ||
    typeof value.toDate !== "function"
  ) {
    return null;
  }

  const date = value.toDate();

  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toISOString()
    : null;
}

export async function getMyReservations(
  idToken: string
): Promise<MyReservation[]> {
  const user = await getVerifiedUser(idToken);

  if (user.role !== "worker" && user.role !== "admin") {
    throw new Error("Your account cannot view reservations.");
  }

  // A bounded query avoids downloading unrelated users'
  // data. Sorting locally avoids requiring a composite
  // Firestore index solely for display ordering.
  const snapshot = await adminDb
    .collection("reservations")
    .where("workerId", "==", user.uid)
    .limit(100)
    .get();

  const records = snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      equipmentId: readString(data.equipmentId),
      quantity: readNonNegativeInteger(data.quantity),
      rentalStartDate: readString(
        data.rentalStartDate,
        readString(data.date)
      ),
      rentalEndDate: readString(data.rentalEndDate),
      rentalDays: readNonNegativeInteger(data.rentalDays),
      returnDeadline: readString(data.returnDeadline),
      pickupLocationId: readString(
        data.pickupLocationId,
        readString(data.libraryId)
      ),
      returnLocationId: readString(
        data.returnLocationId,
        readString(data.libraryId)
      ),
      dailyPricePence: readNonNegativeInteger(
        data.dailyPricePence
      ),
      totalPricePence: readNonNegativeInteger(
        data.totalPricePence
      ),
      status: readString(data.status, "unknown"),
      returnStatus: readString(data.returnStatus, "unknown"),
      termsVersion: readString(data.termsVersion),
      createdAt: readTimestamp(data.createdAt),
      cancelledAt: readTimestamp(data.cancelledAt),
    };
  });

  // Enrich the cards with equipment and location names.
  // These lookups are server-side and do not expose
  // unrelated reservation documents.
  const equipmentIds = [
    ...new Set(records.map((item) => item.equipmentId).filter(Boolean)),
  ];
  const locationIds = [
    ...new Set(
      records.flatMap((item) => [
        item.pickupLocationId,
        item.returnLocationId,
      ]).filter(Boolean)
    ),
  ];

  const [equipmentSnapshots, locationSnapshots] = await Promise.all([
    equipmentIds.length > 0
      ? adminDb.getAll(
          ...equipmentIds.map((id) => adminDb.collection("equipment").doc(id))
        )
      : Promise.resolve([]),
    locationIds.length > 0
      ? adminDb.getAll(
          ...locationIds.map((id) => adminDb.collection("libraries").doc(id))
        )
      : Promise.resolve([]),
  ]);

  const equipmentNames = new Map<string, { name: string; brand: string }>();

  equipmentSnapshots.forEach((document) => {
    if (!document.exists) return;
    const data = document.data();
    equipmentNames.set(document.id, {
      name: readString(data?.name, "Equipment"),
      brand: readString(data?.brand),
    });
  });

  const locationNames = new Map<string, string>();

  locationSnapshots.forEach((document) => {
    if (!document.exists) return;
    locationNames.set(
      document.id,
      readString(document.data()?.name, document.id)
    );
  });

  const result: MyReservation[] = records.map((record) => {
    const equipment = equipmentNames.get(record.equipmentId);

    return {
      ...record,
      equipmentName: equipment?.name ?? "Equipment unavailable",
      equipmentBrand: equipment?.brand ?? "",
      pickupLocationName:
        locationNames.get(record.pickupLocationId) ?? record.pickupLocationId,
      returnLocationName:
        locationNames.get(record.returnLocationId) ?? record.returnLocationId,
    };
  });

  result.sort((a, b) => {
    const first = b.createdAt ?? b.rentalStartDate;
    const second = a.createdAt ?? a.rentalStartDate;
    return first.localeCompare(second);
  });

  return result;
}
