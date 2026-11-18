"use server";

import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ======================================================
// GREENSHARE — ADMIN EQUIPMENT APPROVAL ACTIONS
// ======================================================

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(),
  });

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

// ------------------------------------------------------
// TYPES
// ------------------------------------------------------

export type AdminEquipmentSubmission = {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  category: string;
  subcategory: string;
  ownerId: string;
  libraryId: string;
  currentLocationId: string;
  totalStock: number;
  dailyPricePence: number;
  approvalStatus: string;
  createdAt: number | null;
};

export type SubmissionDecision =
  | "request_deposit"
  | "reject";

// ------------------------------------------------------
// AUTHORISATION
// ------------------------------------------------------

async function requireAdmin(idToken: string): Promise<string> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Authentication is required.");
  }

  const decodedToken = await adminAuth.verifyIdToken(
    idToken,
    true
  );

  const profileSnapshot = await adminDb
    .collection("users")
    .doc(decodedToken.uid)
    .get();

  if (!profileSnapshot.exists) {
    throw new Error("User profile not found.");
  }

  const profile = profileSnapshot.data();

  if (
    profile?.active !== true ||
    profile?.role !== "admin"
  ) {
    throw new Error(
      "Administrator permissions are required."
    );
  }

  return decodedToken.uid;
}

// ------------------------------------------------------
// LOAD SUBMISSIONS
// ------------------------------------------------------

export async function getEquipmentSubmissions(
  idToken: string
): Promise<AdminEquipmentSubmission[]> {
  await requireAdmin(idToken);

  const snapshot = await adminDb
    .collection("equipment")
    .where("ownership", "==", "community")
    .get();

  const submissions: AdminEquipmentSubmission[] = [];

  for (const document of snapshot.docs) {
    const equipment = document.data();

    // Only equipment awaiting administrative processing.
    if (
      ![
        "submitted",
        "awaiting_deposit",
        "under_inspection",
        "awaiting_owner_approval",
      ].includes(equipment.approvalStatus)
    ) {
      continue;
    }

    submissions.push({
      id: document.id,
      name: String(equipment.name ?? ""),
      description: String(equipment.description ?? ""),
      brand: String(equipment.brand ?? ""),
      model: String(equipment.model ?? ""),
      category: String(equipment.category ?? ""),
      subcategory: String(equipment.subcategory ?? ""),
      ownerId: String(equipment.ownerId ?? ""),
      libraryId: String(equipment.libraryId ?? ""),
      currentLocationId: String(
        equipment.currentLocationId ?? ""
      ),
      totalStock: Number(equipment.totalStock ?? 0),
      dailyPricePence: Number(
        equipment.dailyPricePence ?? 0
      ),
      approvalStatus: String(
        equipment.approvalStatus ?? ""
      ),
      createdAt:
        typeof equipment.createdAt?.toMillis === "function"
          ? equipment.createdAt.toMillis()
          : null,
    });
  }

  return submissions.sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
}

// ------------------------------------------------------
// REVIEW A NEW SUBMISSION
// ------------------------------------------------------

export async function reviewEquipmentSubmission(
  idToken: string,
  equipmentId: string,
  decision: SubmissionDecision,
  reviewNote: string
): Promise<{ success: true; status: string }> {
  const adminUid = await requireAdmin(idToken);

  if (
    typeof equipmentId !== "string" ||
    !equipmentId.trim()
  ) {
    throw new Error("Equipment ID is required.");
  }

  if (
    decision !== "request_deposit" &&
    decision !== "reject"
  ) {
    throw new Error("Invalid review decision.");
  }

  if (typeof reviewNote !== "string") {
    throw new Error("Invalid review note.");
  }

  const note = reviewNote.trim();

  if (note.length > 1000) {
    throw new Error(
      "Review note cannot exceed 1000 characters."
    );
  }

  if (decision === "reject" && note.length < 5) {
    throw new Error(
      "Please provide a reason for rejection."
    );
  }

  const nextStatus =
    decision === "request_deposit"
      ? "awaiting_deposit"
      : "rejected";

  const equipmentRef = adminDb
    .collection("equipment")
    .doc(equipmentId);

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(equipmentRef);

    if (!snapshot.exists) {
      throw new Error("Equipment was not found.");
    }

    const equipment = snapshot.data();

    if (
      equipment?.ownership !== "community" ||
      equipment?.approvalStatus !== "submitted"
    ) {
      throw new Error(
        "This equipment submission is no longer awaiting initial review."
      );
    }

    transaction.update(equipmentRef, {
      approvalStatus: nextStatus,
      active: false,
      reviewNote: note,
      reviewedBy: adminUid,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return {
    success: true,
    status: nextStatus,
  };
}

// ------------------------------------------------------
// CONFIRM PHYSICAL EQUIPMENT DEPOSIT
// ------------------------------------------------------

export async function confirmEquipmentDeposit(
  idToken: string,
  equipmentId: string
): Promise<{ success: true; status: "under_inspection" }> {
  const adminUid = await requireAdmin(idToken);

  if (
    typeof equipmentId !== "string" ||
    !equipmentId.trim()
  ) {
    throw new Error("Equipment ID is required.");
  }

  const equipmentRef = adminDb
    .collection("equipment")
    .doc(equipmentId);

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(equipmentRef);

    if (!snapshot.exists) {
      throw new Error("Equipment was not found.");
    }

    const equipment = snapshot.data();

    if (
      equipment?.ownership !== "community" ||
      equipment?.approvalStatus !== "awaiting_deposit"
    ) {
      throw new Error(
        "Equipment is not awaiting physical deposit."
      );
    }

    transaction.update(equipmentRef, {
      approvalStatus: "under_inspection",
      active: false,
      depositedAt: new Date(),
      depositConfirmedBy: adminUid,
      updatedAt: new Date(),
    });
  });

  return {
    success: true,
    status: "under_inspection",
  };
}

// ------------------------------------------------------
// EQUIPMENT PHYSICAL INSPECTION
// ------------------------------------------------------

export type EquipmentInspectionInput = {
  functionalStatus: "passed" | "failed";
  safetyStatus: "passed" | "failed";
  grade: "A" | "B" | "C" | null;
  conditionNotes: string;
  proposedPricePence: number | null;
};

export async function completeEquipmentInspection(
  idToken: string,
  equipmentId: string,
  input: EquipmentInspectionInput
): Promise<{
  success: true;
  status: "awaiting_owner_approval" | "rejected";
}> {
  const adminUid = await requireAdmin(idToken);

  if (
    typeof equipmentId !== "string" ||
    !equipmentId.trim()
  ) {
    throw new Error("Equipment ID is required.");
  }

  if (
    input.functionalStatus !== "passed" &&
    input.functionalStatus !== "failed"
  ) {
    throw new Error("Invalid functional test result.");
  }

  if (
    input.safetyStatus !== "passed" &&
    input.safetyStatus !== "failed"
  ) {
    throw new Error("Invalid safety test result.");
  }

  const notes = input.conditionNotes?.trim();

  if (
    typeof notes !== "string" ||
    notes.length < 10 ||
    notes.length > 2000
  ) {
    throw new Error(
      "Inspection notes must contain between 10 and 2000 characters."
    );
  }

  const passed =
    input.functionalStatus === "passed" &&
    input.safetyStatus === "passed";

  if (passed) {
    if (
      input.grade !== "A" &&
      input.grade !== "B" &&
      input.grade !== "C"
    ) {
      throw new Error(
        "A condition grade is required for equipment that passes inspection."
      );
    }

    if (
      !Number.isInteger(input.proposedPricePence) ||
      input.proposedPricePence === null ||
      input.proposedPricePence < 0 ||
      input.proposedPricePence > 50000
    ) {
      throw new Error(
        "The proposed daily price must be between £0 and £500."
      );
    }
  }

  const nextStatus = passed
    ? "awaiting_owner_approval"
    : "rejected";

  const equipmentRef = adminDb
    .collection("equipment")
    .doc(equipmentId);

  const inspectionRef = adminDb
    .collection("equipmentInspections")
    .doc();

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(equipmentRef);

    if (!snapshot.exists) {
      throw new Error("Equipment was not found.");
    }

    const equipment = snapshot.data();

    if (
      equipment?.ownership !== "community" ||
      equipment?.approvalStatus !== "under_inspection"
    ) {
      throw new Error(
        "Equipment is not awaiting inspection."
      );
    }

    if (
      typeof equipment.dailyPricePence !== "number" ||
      !Number.isInteger(equipment.dailyPricePence)
    ) {
      throw new Error(
        "The original equipment price is invalid."
      );
    }

    transaction.create(inspectionRef, {
      id: inspectionRef.id,
      equipmentId,
      inspectedBy: adminUid,
      inspectionDate: new Date(),

      functionalStatus: input.functionalStatus,
      safetyStatus: input.safetyStatus,

      grade: passed ? input.grade : null,
      conditionNotes: notes,

      requestedPricePence:
        equipment.dailyPricePence,

      proposedPricePence: passed
        ? input.proposedPricePence
        : null,

      ownerDecision: "pending",
      photos: [],
    });

    transaction.update(equipmentRef, {
      approvalStatus: nextStatus,
      active: false,

      condition: passed ? input.grade : null,

      latestInspectionId: inspectionRef.id,
      inspectedBy: adminUid,
      inspectedAt: new Date(),

      updatedAt: new Date(),
    });
  });

  return {
    success: true,
    status: nextStatus,
  };
}