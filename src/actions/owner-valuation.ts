"use server";

import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";

import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

// ======================================================
// GREENSHARE — OWNER VALUATION ACTIONS
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

export type OwnerValuation = {
  equipmentId: string;
  inspectionId: string;

  equipmentName: string;
  brand: string;

  requestedPricePence: number;
  proposedPricePence: number;

  grade: "A" | "B" | "C";

  functionalStatus: "passed";
  safetyStatus: "passed";

  conditionNotes: string;
  inspectionDate: number | null;
};

export type ValuationDecision =
  | "accept"
  | "decline";

// ------------------------------------------------------
// VERIFY WORKER
// ------------------------------------------------------

async function requireWorker(
  idToken: string
): Promise<string> {
  if (
    typeof idToken !== "string" ||
    !idToken.trim()
  ) {
    throw new Error("Authentication is required.");
  }

  const decodedToken =
    await adminAuth.verifyIdToken(
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
    profile?.role !== "worker" ||
    profile?.uid !== decodedToken.uid
  ) {
    throw new Error(
      "An active Worker account is required."
    );
  }

  return decodedToken.uid;
}

// ------------------------------------------------------
// GET WORKER VALUATIONS
// ------------------------------------------------------

export async function getOwnerValuations(
  idToken: string
): Promise<OwnerValuation[]> {
  const uid = await requireWorker(idToken);

  const equipmentSnapshot = await adminDb
    .collection("equipment")
    .where("ownerId", "==", uid)
    .get();

  const pendingEquipment = equipmentSnapshot.docs.filter(
    (document) =>
      document.data().ownership === "community" &&
      document.data().approvalStatus ===
        "awaiting_owner_approval"
  );

  const valuations = await Promise.all(
    pendingEquipment.map(async (document) => {
      const equipment = document.data();

      const inspectionId =
        equipment.latestInspectionId;

      if (
        typeof inspectionId !== "string" ||
        !inspectionId
      ) {
        return null;
      }

      const inspectionSnapshot = await adminDb
        .collection("equipmentInspections")
        .doc(inspectionId)
        .get();

      if (!inspectionSnapshot.exists) {
        return null;
      }

      const inspection =
        inspectionSnapshot.data();

      if (
        !inspection ||
        inspection.equipmentId !== document.id ||
        inspection.ownerDecision !== "pending" ||
        inspection.functionalStatus !== "passed" ||
        inspection.safetyStatus !== "passed"
      ) {
        return null;
      }

      if (
        inspection.grade !== "A" &&
        inspection.grade !== "B" &&
        inspection.grade !== "C"
      ) {
        return null;
      }

      const proposedPrice =
        inspection.proposedPricePence;

      if (
        !Number.isInteger(proposedPrice) ||
        proposedPrice < 0 ||
        proposedPrice > 50000
      ) {
        return null;
      }

      const valuation: OwnerValuation = {
        equipmentId: document.id,
        inspectionId,

        equipmentName: String(
          equipment.name ?? ""
        ),

        brand: String(
          equipment.brand ?? ""
        ),

        requestedPricePence:
          inspection.requestedPricePence,

        proposedPricePence: proposedPrice,

        grade: inspection.grade,

        functionalStatus: "passed",
        safetyStatus: "passed",

        conditionNotes: String(
          inspection.conditionNotes ?? ""
        ),

        inspectionDate:
          typeof inspection.inspectionDate
            ?.toMillis === "function"
            ? inspection.inspectionDate.toMillis()
            : null,
      };

      return valuation;
    })
  );

  return valuations
    .filter(
      (valuation): valuation is OwnerValuation =>
        valuation !== null
    )
    .sort(
      (a, b) =>
        (b.inspectionDate ?? 0) -
        (a.inspectionDate ?? 0)
    );
}

// ------------------------------------------------------
// OWNER ACCEPTS OR DECLINES VALUATION
// ------------------------------------------------------

export async function respondToOwnerValuation(
  idToken: string,
  equipmentId: string,
  decision: ValuationDecision
): Promise<{
  success: true;
  status: "approved" | "withdrawn";
}> {
  const uid = await requireWorker(idToken);

  if (
    typeof equipmentId !== "string" ||
    !equipmentId.trim()
  ) {
    throw new Error("Equipment ID is required.");
  }

  if (
    decision !== "accept" &&
    decision !== "decline"
  ) {
    throw new Error("Invalid valuation decision.");
  }

  const equipmentRef = adminDb
    .collection("equipment")
    .doc(equipmentId);

  const status =
    decision === "accept"
      ? "approved"
      : "withdrawn";

  await adminDb.runTransaction(async (transaction) => {
    const equipmentSnapshot =
      await transaction.get(equipmentRef);

    if (!equipmentSnapshot.exists) {
      throw new Error("Equipment was not found.");
    }

    const equipment = equipmentSnapshot.data();

    if (
      equipment?.ownership !== "community" ||
      equipment?.ownerId !== uid ||
      equipment?.approvalStatus !==
        "awaiting_owner_approval"
    ) {
      throw new Error(
        "This equipment is not awaiting your valuation decision."
      );
    }

    const inspectionId =
      equipment.latestInspectionId;

    if (
      typeof inspectionId !== "string" ||
      !inspectionId
    ) {
      throw new Error(
        "Equipment inspection record is missing."
      );
    }

    const inspectionRef = adminDb
      .collection("equipmentInspections")
      .doc(inspectionId);

    const inspectionSnapshot =
      await transaction.get(inspectionRef);

    if (!inspectionSnapshot.exists) {
      throw new Error(
        "Inspection report was not found."
      );
    }

    const inspection = inspectionSnapshot.data();

    if (
      inspection?.equipmentId !== equipmentId ||
      inspection?.ownerDecision !== "pending" ||
      inspection?.functionalStatus !== "passed" ||
      inspection?.safetyStatus !== "passed"
    ) {
      throw new Error(
        "This inspection cannot be approved."
      );
    }

    if (
      inspection.grade !== "A" &&
      inspection.grade !== "B" &&
      inspection.grade !== "C"
    ) {
      throw new Error(
        "The inspection grade is invalid."
      );
    }

    const agreedPrice =
      inspection.proposedPricePence;

    if (
      !Number.isInteger(agreedPrice) ||
      agreedPrice < 0 ||
      agreedPrice > 50000
    ) {
      throw new Error(
        "The proposed equipment price is invalid."
      );
    }

    const now = FieldValue.serverTimestamp();

    transaction.update(inspectionRef, {
      ownerDecision:
        decision === "accept"
          ? "accepted"
          : "declined",

      ownerDecisionAt: now,
      ownerDecisionBy: uid,
    });

    if (decision === "accept") {
      transaction.update(equipmentRef, {
        approvalStatus: "approved",
        active: true,

        originalRequestedPricePence:
          equipment.dailyPricePence,

        dailyPricePence: agreedPrice,

        condition: inspection.grade,

        ownerApprovedAt: now,
        updatedAt: now,
      });
    } else {
      transaction.update(equipmentRef, {
        approvalStatus: "withdrawn",
        active: false,

        ownerDeclinedAt: now,
        updatedAt: now,
      });
    }
  });

  return {
    success: true,
    status,
  };
}