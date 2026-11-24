"use server";

import { adminDb, getVerifiedUser } from "@/lib/firebase-admin";

// ======================================================
// GREENSHARE — ADMIN RESERVATION READ ACTION
// ======================================================
// Read-only action. Every request verifies the Firebase
// ID token and the current server-side administrator role.

export interface AdminReservationItem {
  id: string;
  workerId: string;
  workerName: string;
  equipmentId: string;
  equipmentName: string;
  pickupLocationId: string;
  pickupLocationName: string;
  returnLocationId: string;
  returnLocationName: string;
  rentalStartDate: string;
  rentalEndDate: string;
  returnDeadline: string;
  rentalDays: number;
  quantity: number;
  totalPricePence: number;
  status: string;
  returnStatus: string;
  createdAt: string | null;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function integerValue(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0;
}

function timestampToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date &&
      !Number.isNaN(date.getTime())
      ? date.toISOString()
      : null;
  }
  return null;
}

/** Returns all reservations exclusively to verified administrators. */
export async function getAdminReservations(
  idToken: string
): Promise<AdminReservationItem[]> {
  if (typeof idToken !== "string" || idToken.length === 0) {
    throw new Error("Authentication is required.");
  }

  const user = await getVerifiedUser(idToken);
  if (user.role !== "admin") {
    throw new Error("Administrator access is required.");
  }

  const snapshot = await adminDb.collection("reservations").get();
  const records = snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));

  // Batch reads: resolve labels without repeating a Firestore
  // fetch for every reservation. Do not expose user emails.
  const workerIds = Array.from(
    new Set(records.map(({ data }) => stringValue(data.workerId)).filter(Boolean))
  );
  const equipmentIds = Array.from(
    new Set(records.map(({ data }) => stringValue(data.equipmentId)).filter(Boolean))
  );
  const libraryIds = Array.from(
    new Set(
      records.flatMap(({ data }) => [
        stringValue(data.pickupLocationId, stringValue(data.libraryId)),
        stringValue(data.returnLocationId, stringValue(data.libraryId)),
      ]).filter(Boolean)
    )
  );

  const [workers, equipment, libraries] = await Promise.all([
    Promise.all(workerIds.map((id) => adminDb.collection("users").doc(id).get())),
    Promise.all(equipmentIds.map((id) => adminDb.collection("equipment").doc(id).get())),
    Promise.all(libraryIds.map((id) => adminDb.collection("libraries").doc(id).get())),
  ]);

  const workerNames = new Map(
    workers.map((doc) => [doc.id, stringValue(doc.data()?.username, "Unknown worker")])
  );
  const equipmentNames = new Map(
    equipment.map((doc) => [doc.id, stringValue(doc.data()?.name, "Unknown equipment")])
  );
  const libraryNames = new Map(
    libraries.map((doc) => [doc.id, stringValue(doc.data()?.name, "Unknown location")])
  );

  return records
    .map(({ id, data }): AdminReservationItem => {
      const workerId = stringValue(data.workerId);
      const equipmentId = stringValue(data.equipmentId);
      const pickupLocationId = stringValue(
        data.pickupLocationId,
        stringValue(data.libraryId)
      );
      const returnLocationId = stringValue(
        data.returnLocationId,
        pickupLocationId
      );
      return {
        id,
        workerId,
        workerName: workerNames.get(workerId) ?? "Unknown worker",
        equipmentId,
        equipmentName: equipmentNames.get(equipmentId) ?? "Unknown equipment",
        pickupLocationId,
        pickupLocationName: libraryNames.get(pickupLocationId) ?? "Unknown location",
        returnLocationId,
        returnLocationName: libraryNames.get(returnLocationId) ?? "Unknown location",
        rentalStartDate: stringValue(data.rentalStartDate, stringValue(data.date)),
        rentalEndDate: stringValue(data.rentalEndDate, stringValue(data.date)),
        returnDeadline: stringValue(data.returnDeadline),
        rentalDays: integerValue(data.rentalDays),
        quantity: integerValue(data.quantity),
        totalPricePence: integerValue(data.totalPricePence),
        status: stringValue(data.status, "unknown"),
        returnStatus: stringValue(data.returnStatus, "unknown"),
        createdAt: timestampToIso(data.createdAt),
      };
    })
    .sort((a, b) => {
      const dateOrder = b.rentalStartDate.localeCompare(a.rentalStartDate);
      return dateOrder || a.id.localeCompare(b.id);
    });
}
