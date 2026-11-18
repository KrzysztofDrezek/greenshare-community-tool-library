"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { User as FirebaseUser } from "firebase/auth";

import { useAuth } from "@/lib/auth-context";

import {
  getEquipmentSubmissions,
  reviewEquipmentSubmission,
  confirmEquipmentDeposit,
  completeEquipmentInspection,
  type AdminEquipmentSubmission,
  type SubmissionDecision,
  type EquipmentInspectionInput,
} from "@/actions/equipment-approvals";

// ======================================================
// GREENSHARE — ADMIN EQUIPMENT APPROVALS
// ======================================================

const STATUS_LABELS: Record<string, string> = {
  submitted: "New submission",
  awaiting_deposit: "Awaiting equipment deposit",
  under_inspection: "Under inspection",
  awaiting_owner_approval: "Awaiting owner approval",
};

type InspectionForm = {
  functionalStatus: "passed" | "failed";
  safetyStatus: "passed" | "failed";
  grade: "A" | "B" | "C";
  conditionNotes: string;
  proposedPrice: string;
};

function formatPrice(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function createInspectionForm(
  equipment: AdminEquipmentSubmission
): InspectionForm {
  return {
    functionalStatus: "passed",
    safetyStatus: "passed",
    grade: "B",
    conditionNotes: "",
    proposedPrice: (
      equipment.dailyPricePence / 100
    ).toFixed(2),
  };
}

// ======================================================
// PAGE COMPONENT
// ======================================================

export default function EquipmentApprovalsPage() {
  const {
    firebaseUser,
    profile,
    loading: authLoading,
    isAdmin,
  } = useAuth();

  const [submissions, setSubmissions] = useState<
    AdminEquipmentSubmission[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const [success, setSuccess] = useState<string | null>(
    null
  );

  const [reviewNotes, setReviewNotes] = useState<
    Record<string, string>
  >({});

  const [processingId, setProcessingId] = useState<
    string | null
  >(null);

  const [inspectionForms, setInspectionForms] = useState<
    Record<string, InspectionForm>
  >({});

  // ----------------------------------------------------
  // INSPECTION FORM HELPERS
  // ----------------------------------------------------

  function getInspectionForm(
    equipment: AdminEquipmentSubmission
  ): InspectionForm {
    return (
      inspectionForms[equipment.id] ??
      createInspectionForm(equipment)
    );
  }

  function updateInspectionForm(
    equipment: AdminEquipmentSubmission,
    updates: Partial<InspectionForm>
  ) {
    setInspectionForms((current) => ({
      ...current,
      [equipment.id]: {
        ...(
          current[equipment.id] ??
          createInspectionForm(equipment)
        ),
        ...updates,
      },
    }));
  }

  // ----------------------------------------------------
  // LOAD SUBMISSIONS
  // ----------------------------------------------------

  const loadSubmissions = useCallback(
    async (user: FirebaseUser) => {
      const token = await user.getIdToken();

      return getEquipmentSubmissions(token);
    },
    []
  );

  useEffect(() => {
    if (authLoading || !firebaseUser || !isAdmin) {
      return;
    }

    let cancelled = false;

    loadSubmissions(firebaseUser)
      .then((items) => {
        if (cancelled) {
          return;
        }

        setSubmissions(items);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    firebaseUser,
    isAdmin,
    loadSubmissions,
  ]);

  // ----------------------------------------------------
  // REFRESH SUBMISSIONS
  // ----------------------------------------------------

  async function handleRefresh() {
    if (!firebaseUser || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await loadSubmissions(
        firebaseUser
      );

      setSubmissions(items);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // REVIEW NEW SUBMISSION
  // ----------------------------------------------------

  async function handleDecision(
    equipment: AdminEquipmentSubmission,
    decision: SubmissionDecision
  ) {
    if (!firebaseUser || !isAdmin || processingId) {
      return;
    }

    const note = (
      reviewNotes[equipment.id] ?? ""
    ).trim();

    if (
      decision === "reject" &&
      note.length < 5
    ) {
      setError(
        "Please provide a reason for rejection."
      );

      return;
    }

    const confirmed = window.confirm(
      decision === "reject"
        ? `Reject "${equipment.name}"?`
        : `Request physical deposit of "${equipment.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(equipment.id);
    setError(null);
    setSuccess(null);

    try {
      const token = await firebaseUser.getIdToken();

      const result =
        await reviewEquipmentSubmission(
          token,
          equipment.id,
          decision,
          note
        );

      const updatedItems =
        await loadSubmissions(firebaseUser);

      setSubmissions(updatedItems);

      setSuccess(
        result.status === "rejected"
          ? `"${equipment.name}" has been rejected.`
          : `"${equipment.name}" is now awaiting physical deposit.`
      );
    } catch (reviewError) {
      setError(getErrorMessage(reviewError));
    } finally {
      setProcessingId(null);
    }
  }

  // ----------------------------------------------------
  // CONFIRM PHYSICAL DEPOSIT
  // ----------------------------------------------------

  async function handleConfirmDeposit(
    equipment: AdminEquipmentSubmission
  ) {
    if (!firebaseUser || !isAdmin || processingId) {
      return;
    }

    const confirmed = window.confirm(
      `Confirm that "${equipment.name}" has been physically received at the GreenShare collection point?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(equipment.id);
    setError(null);
    setSuccess(null);

    try {
      const token = await firebaseUser.getIdToken();

      await confirmEquipmentDeposit(
        token,
        equipment.id
      );

      const updatedItems =
        await loadSubmissions(firebaseUser);

      setSubmissions(updatedItems);

      setSuccess(
        `"${equipment.name}" has been received and is ready for inspection.`
      );
    } catch (depositError) {
      setError(getErrorMessage(depositError));
    } finally {
      setProcessingId(null);
    }
  }

  // ----------------------------------------------------
  // COMPLETE PHYSICAL INSPECTION
  // ----------------------------------------------------

  async function handleInspection(
    equipment: AdminEquipmentSubmission
  ) {
    if (!firebaseUser || !isAdmin || processingId) {
      return;
    }

    const form = getInspectionForm(equipment);

    const passed =
      form.functionalStatus === "passed" &&
      form.safetyStatus === "passed";

    if (form.conditionNotes.trim().length < 10) {
      setError(
        "Inspection notes must contain at least 10 characters."
      );

      return;
    }

    let proposedPricePence: number | null = null;

    if (passed) {
      const priceText = form.proposedPrice.trim();

      if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {
        setError(
          "Enter a valid GBP price with up to two decimal places."
        );

        return;
      }

      proposedPricePence = Math.round(
        Number(priceText) * 100
      );

      if (
        proposedPricePence < 0 ||
        proposedPricePence > 50000
      ) {
        setError(
          "The daily price must be between £0 and £500."
        );

        return;
      }
    }

    const confirmed = window.confirm(
      passed
        ? `Complete inspection of "${equipment.name}" and send the valuation to its owner?`
        : `Reject "${equipment.name}" because it failed inspection?`
    );

    if (!confirmed) {
      return;
    }

    const inspectionInput: EquipmentInspectionInput = {
      functionalStatus: form.functionalStatus,
      safetyStatus: form.safetyStatus,
      grade: passed ? form.grade : null,
      conditionNotes: form.conditionNotes.trim(),
      proposedPricePence,
    };

    setProcessingId(equipment.id);
    setError(null);
    setSuccess(null);

    try {
      const token = await firebaseUser.getIdToken();

      const result =
        await completeEquipmentInspection(
          token,
          equipment.id,
          inspectionInput
        );

      const updatedItems =
        await loadSubmissions(firebaseUser);

      setSubmissions(updatedItems);

      setSuccess(
        result.status === "rejected"
          ? `"${equipment.name}" failed inspection and has been rejected.`
          : `Inspection completed for "${equipment.name}". Awaiting owner approval.`
      );
    } catch (inspectionError) {
      setError(getErrorMessage(inspectionError));
    } finally {
      setProcessingId(null);
    }
  }

  // ----------------------------------------------------
  // AUTHENTICATION LOADING
  // ----------------------------------------------------

  if (authLoading) {
    return (
      <main className="min-h-screen bg-emerald-50 p-8">
        <p className="text-slate-700">
          Checking administrator access...
        </p>
      </main>
    );
  }

  // ----------------------------------------------------
  // ACCESS DENIED
  // ----------------------------------------------------

  if (!firebaseUser || !isAdmin) {
    return (
      <main className="min-h-screen bg-emerald-50 px-6 py-16">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Access restricted
          </h1>

          <p className="mt-4 text-slate-600">
            Equipment approval operations are
            available only to authorised GreenShare
            administrators.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block font-semibold text-emerald-700 hover:underline"
          >
            Back to GreenShare
          </Link>
        </section>
      </main>
    );
  }

  // ----------------------------------------------------
  // DASHBOARD DATA
  // ----------------------------------------------------

  const newSubmissions = submissions.filter(
    (item) => item.approvalStatus === "submitted"
  );

  const inProgress = submissions.filter(
    (item) => item.approvalStatus !== "submitted"
  );

  // ====================================================
  // DASHBOARD UI
  // ====================================================

  return (
    <main className="min-h-screen bg-emerald-50 px-5 py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to GreenShare
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              GreenShare Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Equipment Approvals
            </h1>

            <p className="mt-3 text-slate-600">
              Review equipment submitted by community
              members before it becomes available
              for borrowing.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Signed in as:{" "}
              <span className="font-semibold">
                {profile?.username ?? "Administrator"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || processingId !== null}
            className="rounded-xl border border-emerald-700 px-5 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              New submissions
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-700">
              {newSubmissions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              In progress
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-700">
              {inProgress.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total active reviews
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-800">
              {submissions.length}
            </p>
          </div>
        </section>

        {/* FEEDBACK */}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-emerald-900"
          >
            {success}
          </div>
        )}

        {/* NEW SUBMISSIONS */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            New Equipment Submissions
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Review each application and decide whether
            the owner should bring the equipment to
            a GreenShare collection point.
          </p>

          {loading ? (
            <p className="mt-6 text-slate-500">
              Loading equipment submissions...
            </p>
          ) : newSubmissions.length === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-6 text-slate-500">
              There are no new submissions awaiting
              initial review.
            </p>
          ) : (
            <div className="mt-6 grid gap-5">
              {newSubmissions.map((equipment) => (
                <article
                  key={equipment.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {equipment.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {equipment.brand}
                        {equipment.model
                          ? ` · ${equipment.model}`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      New submission
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
                    {equipment.description ||
                      "No description provided."}
                  </p>

                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-slate-500">
                        Category
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {equipment.category.replaceAll(
                          "_",
                          " "
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">
                        Quantity
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {equipment.totalStock}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">
                        Requested daily price
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatPrice(
                          equipment.dailyPricePence
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">
                        Owner UID
                      </dt>

                      <dd className="mt-1 break-all font-mono text-xs text-slate-700">
                        {equipment.ownerId}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <label
                      htmlFor={`note-${equipment.id}`}
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Administrator review note
                    </label>

                    <textarea
                      id={`note-${equipment.id}`}
                      value={
                        reviewNotes[equipment.id] ?? ""
                      }
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [equipment.id]:
                            event.target.value,
                        }))
                      }
                      maxLength={1000}
                      rows={3}
                      disabled={processingId !== null}
                      placeholder="Explain the next steps or reason for rejection..."
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-emerald-600 disabled:opacity-60"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        void handleDecision(
                          equipment,
                          "request_deposit"
                        )
                      }
                      disabled={processingId !== null}
                      className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Request Physical Deposit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDecision(
                          equipment,
                          "reject"
                        )
                      }
                      disabled={processingId !== null}
                      className="rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject Submission
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* REVIEWS IN PROGRESS */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Reviews in Progress
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Equipment awaiting deposit, inspection
            or an owner decision.
          </p>

          {loading ? (
            <p className="mt-6 text-slate-500">
              Loading...
            </p>
          ) : inProgress.length === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-6 text-slate-500">
              No equipment is currently under review.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {inProgress.map((equipment) => (
                <article
                  key={equipment.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <h3 className="font-bold text-slate-900">
                    {equipment.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {equipment.brand}
                  </p>

                  <p className="mt-3 text-sm font-semibold text-blue-700">
                    {STATUS_LABELS[
                      equipment.approvalStatus
                    ] ?? equipment.approvalStatus}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Requested price:{" "}
                    {formatPrice(
                      equipment.dailyPricePence
                    )}
                    /day
                  </p>

                  {/* CONFIRM DEPOSIT */}

                  {equipment.approvalStatus ===
                    "awaiting_deposit" && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleConfirmDeposit(
                          equipment
                        )
                      }
                      disabled={processingId !== null}
                      className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === equipment.id
                        ? "Confirming..."
                        : "Confirm Equipment Received"}
                    </button>
                  )}

                  {/* PHYSICAL INSPECTION */}

                  {equipment.approvalStatus ===
                    "under_inspection" && (
                    <div className="mt-5 rounded-xl bg-blue-50 p-4">
                      <h4 className="font-bold text-slate-900">
                        Physical Equipment Inspection
                      </h4>

                      <p className="mt-2 text-sm text-slate-600">
                        Assess functionality, safety
                        and physical condition.
                      </p>

                      <label
                        htmlFor={`functional-${equipment.id}`}
                        className="mt-5 block text-sm font-semibold text-slate-800"
                      >
                        Functional Test
                      </label>

                      <select
                        id={`functional-${equipment.id}`}
                        value={
                          getInspectionForm(equipment)
                            .functionalStatus
                        }
                        onChange={(event) =>
                          updateInspectionForm(
                            equipment,
                            {
                              functionalStatus:
                                event.target.value as
                                  "passed" | "failed",
                            }
                          )
                        }
                        disabled={processingId !== null}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
                      >
                        <option value="passed">
                          Pass
                        </option>
                        <option value="failed">
                          Fail
                        </option>
                      </select>

                      <label
                        htmlFor={`safety-${equipment.id}`}
                        className="mt-5 block text-sm font-semibold text-slate-800"
                      >
                        Safety Test
                      </label>

                      <select
                        id={`safety-${equipment.id}`}
                        value={
                          getInspectionForm(equipment)
                            .safetyStatus
                        }
                        onChange={(event) =>
                          updateInspectionForm(
                            equipment,
                            {
                              safetyStatus:
                                event.target.value as
                                  "passed" | "failed",
                            }
                          )
                        }
                        disabled={processingId !== null}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
                      >
                        <option value="passed">
                          Pass
                        </option>
                        <option value="failed">
                          Fail
                        </option>
                      </select>

                      <label
                        htmlFor={`grade-${equipment.id}`}
                        className="mt-5 block text-sm font-semibold text-slate-800"
                      >
                        Condition Grade
                      </label>

                      <select
                        id={`grade-${equipment.id}`}
                        value={
                          getInspectionForm(equipment)
                            .grade
                        }
                        onChange={(event) =>
                          updateInspectionForm(
                            equipment,
                            {
                              grade:
                                event.target.value as
                                  "A" | "B" | "C",
                            }
                          )
                        }
                        disabled={processingId !== null}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
                      >
                        <option value="A">
                          A — Excellent
                        </option>
                        <option value="B">
                          B — Good
                        </option>
                        <option value="C">
                          C — Fair
                        </option>
                      </select>

                      <label
                        htmlFor={`price-${equipment.id}`}
                        className="mt-5 block text-sm font-semibold text-slate-800"
                      >
                        Proposed Daily Price (£)
                      </label>

                      <input
                        id={`price-${equipment.id}`}
                        type="text"
                        inputMode="decimal"
                        value={
                          getInspectionForm(equipment)
                            .proposedPrice
                        }
                        onChange={(event) =>
                          updateInspectionForm(
                            equipment,
                            {
                              proposedPrice:
                                event.target.value,
                            }
                          )
                        }
                        disabled={processingId !== null}
                        placeholder="12.00"
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
                      />

                      <label
                        htmlFor={`inspection-notes-${equipment.id}`}
                        className="mt-5 block text-sm font-semibold text-slate-800"
                      >
                        Inspection Notes
                      </label>

                      <textarea
                        id={`inspection-notes-${equipment.id}`}
                        value={
                          getInspectionForm(equipment)
                            .conditionNotes
                        }
                        onChange={(event) =>
                          updateInspectionForm(
                            equipment,
                            {
                              conditionNotes:
                                event.target.value,
                            }
                          )
                        }
                        disabled={processingId !== null}
                        maxLength={2000}
                        rows={4}
                        placeholder="Describe the equipment condition, test results and price justification..."
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          void handleInspection(equipment)
                        }
                        disabled={processingId !== null}
                        className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === equipment.id
                          ? "Saving Inspection..."
                          : "Complete Inspection"}
                      </button>
                    </div>
                  )}

                  {/* OWNER APPROVAL */}

                  {equipment.approvalStatus ===
                    "awaiting_owner_approval" && (
                    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
                      Inspection completed. Waiting for
                      the owner&apos;s decision.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}