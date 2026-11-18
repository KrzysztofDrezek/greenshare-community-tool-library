"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

import {
  getOwnerValuations,
  respondToOwnerValuation,
  type OwnerValuation,
  type ValuationDecision,
} from "@/actions/owner-valuation";

import type {
  EquipmentCategory,
  EquipmentPowerSource,
  EquipmentApprovalStatus,
} from "@/types";

// ======================================================
// GREENSHARE — MY EQUIPMENT
// ======================================================

interface LibraryOption {
  id: string;
  name: string;
  city: string;
}

interface MyEquipmentItem {
  id: string;
  name: string;
  brand: string;
  category: EquipmentCategory;
  totalStock: number;
  dailyPricePence: number;
  approvalStatus: EquipmentApprovalStatus;
}

const categories: {
  value: EquipmentCategory;
  label: string;
}[] = [
  { value: "power_tools", label: "Power Tools" },
  { value: "garden", label: "Garden Equipment" },
  { value: "generators", label: "Generators" },
  { value: "compressors", label: "Compressors" },
  {
    value: "batteries_chargers",
    label: "Batteries & Chargers",
  },
  {
    value: "solar_energy",
    label: "Solar & Energy",
  },
];

const powerSources: {
  value: EquipmentPowerSource;
  label: string;
}[] = [
  { value: "battery", label: "Battery" },
  { value: "corded", label: "Corded" },
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "solar", label: "Solar" },
  { value: "manual", label: "Manual" },
];

const statusLabels: Record<
  EquipmentApprovalStatus,
  string
> = {
  submitted: "Submitted",
  awaiting_deposit: "Awaiting Deposit",
  under_inspection: "Under Inspection",
  awaiting_owner_approval: "Awaiting Owner Approval",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  inactive: "Inactive",
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

// ======================================================
// COMPONENT
// ======================================================

export default function MyEquipmentPage() {
  const router = useRouter();

  const {
    firebaseUser,
    profile,
    loading: authLoading,
    isWorker,
  } = useAuth();

  const [libraries, setLibraries] = useState<
    LibraryOption[]
  >([]);

  const [equipment, setEquipment] = useState<
    MyEquipmentItem[]
  >([]);

  const [loadingEquipment, setLoadingEquipment] =
    useState(true);

  const [valuations, setValuations] = useState<
    OwnerValuation[]
  >([]);

  const [loadingValuations, setLoadingValuations] =
    useState(true);

  const [processingValuationId, setProcessingValuationId] =
    useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----------------------------------------------------
  // FORM STATE
  // ----------------------------------------------------

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  const [category, setCategory] =
    useState<EquipmentCategory>("power_tools");

  const [subcategory, setSubcategory] = useState("");

  const [powerSource, setPowerSource] =
    useState<EquipmentPowerSource>("corded");

  const [batteryPlatform, setBatteryPlatform] =
    useState("");

  const [batteryIncluded, setBatteryIncluded] =
    useState(false);

  const [libraryId, setLibraryId] = useState("");

  const [totalStock, setTotalStock] = useState("1");
  const [dailyPrice, setDailyPrice] = useState("5.00");

  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!firebaseUser || !profile) {
      router.replace("/login");
    }
  }, [
    authLoading,
    firebaseUser,
    profile,
    router,
  ]);

  // ----------------------------------------------------
  // LOAD LIBRARIES
  // ----------------------------------------------------

  useEffect(() => {
    if (!isWorker) {
      return;
    }

    let active = true;

    async function loadLibraries() {
      try {
        const librariesQuery = query(
          collection(db, "libraries"),
          where("active", "==", true)
        );

        const snapshot = await getDocs(
          librariesQuery
        );

        if (!active) {
          return;
        }

        const results: LibraryOption[] =
          snapshot.docs.map((libraryDoc) => {
            const data = libraryDoc.data();

            return {
              id: libraryDoc.id,
              name: String(data.name ?? ""),
              city: String(data.city ?? ""),
            };
          });

        results.sort(
          (a, b) =>
            a.city.localeCompare(b.city) ||
            a.name.localeCompare(b.name)
        );

        setLibraries(results);
      } catch (loadError) {
        console.error(
          "Unable to load libraries:",
          loadError
        );

        if (active) {
          setError(
            "Unable to load collection points."
          );
        }
      }
    }

    void loadLibraries();

    return () => {
      active = false;
    };
  }, [isWorker]);

  // ----------------------------------------------------
  // LOAD WORKER EQUIPMENT
  // ----------------------------------------------------

  useEffect(() => {
    if (!firebaseUser || !isWorker) {
      return;
    }

    const equipmentQuery = query(
      collection(db, "equipment"),
      where("ownerId", "==", firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(
      equipmentQuery,

      (snapshot) => {
        const results: MyEquipmentItem[] =
          snapshot.docs.map((equipmentDoc) => {
            const data = equipmentDoc.data();

            return {
              id: equipmentDoc.id,
              name: String(data.name ?? ""),
              brand: String(data.brand ?? ""),
              category:
                data.category as EquipmentCategory,
              totalStock: Number(
                data.totalStock ?? 0
              ),
              dailyPricePence: Number(
                data.dailyPricePence ?? 0
              ),
              approvalStatus:
                data.approvalStatus as EquipmentApprovalStatus,
            };
          });

        results.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setEquipment(results);
        setLoadingEquipment(false);
      },

      (snapshotError) => {
        console.error(
          "Unable to load worker equipment:",
          snapshotError
        );

        setError(
          "Unable to load your equipment listings."
        );

        setLoadingEquipment(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, isWorker]);

  // ----------------------------------------------------
  // LOAD OWNER VALUATIONS
  // ----------------------------------------------------

  useEffect(() => {
    if (!firebaseUser || !isWorker) {
      return;
    }

    let active = true;

    firebaseUser
      .getIdToken()
      .then((token) => getOwnerValuations(token))
      .then((results) => {
        if (!active) {
          return;
        }

        setValuations(results);
        setLoadingValuations(false);
      })
      .catch((loadError: unknown) => {
        console.error(
          "Unable to load valuations:",
          loadError
        );

        if (active) {
          setError(
            "Unable to load equipment valuations."
          );

          setLoadingValuations(false);
        }
      });

    return () => {
      active = false;
    };
  }, [firebaseUser, isWorker]);

  // ----------------------------------------------------
  // OWNER VALUATION DECISION
  // ----------------------------------------------------

  async function handleValuationDecision(
    valuation: OwnerValuation,
    decision: ValuationDecision
  ) {
    if (
      !firebaseUser ||
      !isWorker ||
      processingValuationId
    ) {
      return;
    }

    const confirmed = window.confirm(
      decision === "accept"
        ? `Accept the proposed daily price of ${formatPrice(
            valuation.proposedPricePence
          )} for "${valuation.equipmentName}"? This will publish your equipment listing.`
        : `Decline the proposed valuation for "${valuation.equipmentName}"? The listing will be withdrawn.`
    );

    if (!confirmed) {
      return;
    }

    setProcessingValuationId(
      valuation.equipmentId
    );

    setError("");
    setSuccess("");

    try {
      const token = await firebaseUser.getIdToken();

      const result =
        await respondToOwnerValuation(
          token,
          valuation.equipmentId,
          decision
        );

      const updatedValuations =
        await getOwnerValuations(token);

      setValuations(updatedValuations);

      if (result.status === "approved") {
        setSuccess(
          `"${valuation.equipmentName}" has been approved and published at ${formatPrice(
            valuation.proposedPricePence
          )} per day.`
        );
      } else {
        setSuccess(
          `"${valuation.equipmentName}" has been withdrawn.`
        );
      }
    } catch (decisionError) {
      setError(getErrorMessage(decisionError));
    } finally {
      setProcessingValuationId(null);
    }
  }

  // ----------------------------------------------------
  // RESET FORM
  // ----------------------------------------------------

  function resetForm() {
    setName("");
    setDescription("");
    setBrand("");
    setModel("");
    setCategory("power_tools");
    setSubcategory("");
    setPowerSource("corded");
    setBatteryPlatform("");
    setBatteryIncluded(false);
    setLibraryId("");
    setTotalStock("1");
    setDailyPrice("5.00");
  }

  // ----------------------------------------------------
  // SUBMIT EQUIPMENT
  // ----------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      submitting ||
      !firebaseUser ||
      !isWorker
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanBrand = brand.trim();
    const cleanModel = model.trim();
    const cleanSubcategory = subcategory.trim();
    const cleanPlatform = batteryPlatform.trim();

    const quantity = Number(totalStock);
    const pricePence = Math.round(
      Number(dailyPrice) * 100
    );

    if (
      cleanName.length < 3 ||
      cleanName.length > 100
    ) {
      setError(
        "Equipment name must contain 3–100 characters."
      );
      return;
    }

    if (cleanDescription.length > 2000) {
      setError(
        "Description cannot exceed 2000 characters."
      );
      return;
    }

    if (!cleanSubcategory) {
      setError(
        "Please enter an equipment subcategory."
      );
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 50
    ) {
      setError(
        "Quantity must be between 1 and 50."
      );
      return;
    }

    if (
      !Number.isFinite(Number(dailyPrice)) ||
      !Number.isInteger(pricePence) ||
      pricePence < 0 ||
      pricePence > 50000
    ) {
      setError(
        "Daily price must be between £0 and £500."
      );
      return;
    }

    if (
      !libraries.some(
        (library) => library.id === libraryId
      )
    ) {
      setError(
        "Please select a valid GreenShare collection point."
      );
      return;
    }

    setSubmitting(true);

    try {
      const equipmentReference = doc(
        collection(db, "equipment")
      );

      await setDoc(equipmentReference, {
        id: equipmentReference.id,

        name: cleanName,
        description: cleanDescription,

        brand: cleanBrand,
        model: cleanModel,

        category,
        subcategory: cleanSubcategory,

        powerSource,

        batteryPlatform:
          cleanPlatform || null,

        batteryIncluded,

        ownership: "community",
        ownerId: firebaseUser.uid,

        condition: null,

        libraryId,
        currentLocationId: libraryId,

        totalStock: quantity,
        dailyPricePence: pricePence,

        approvalStatus: "submitted",
        active: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(
        "Your equipment has been submitted for review."
      );

      resetForm();
      setShowForm(false);
    } catch (submitError) {
      console.error(
        "Equipment submission failed:",
        submitError
      );

      setError(
        "Unable to submit equipment. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

  if (authLoading) {
    return (
      <main className="min-h-screen bg-emerald-50 p-8">
        <p className="text-center text-slate-600">
          Checking your account...
        </p>
      </main>
    );
  }

  if (!firebaseUser || !profile) {
    return null;
  }

  // ----------------------------------------------------
  // ADMINISTRATOR NOTICE
  // ----------------------------------------------------

  if (!isWorker) {
    return (
      <main className="min-h-screen bg-emerald-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">
            Worker Area
          </h1>

          <p className="mt-4 text-slate-600">
            This page is available to Worker accounts.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  // ====================================================
  // PAGE
  // ====================================================

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              ← Back to GreenShare
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              My Equipment
            </h1>

            <p className="mt-2 text-slate-600">
              Manage equipment you have submitted
              to the GreenShare community.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setSuccess("");
            }}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            {showForm
              ? "Close Form"
              : "+ Add Equipment"}
          </button>
        </header>

        {/* FEEDBACK */}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-emerald-800"
          >
            {success}
          </div>
        )}

        {/* OWNER VALUATIONS */}

        {(loadingValuations ||
          valuations.length > 0) && (
          <section className="mb-8 rounded-2xl border border-amber-200 bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-slate-900">
              Equipment Valuations
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Review the inspection results and
              proposed borrowing prices before
              your equipment is published.
            </p>

            {loadingValuations ? (
              <p className="mt-5 text-slate-500">
                Loading valuations...
              </p>
            ) : (
              <div className="mt-6 grid gap-5">
                {valuations.map((valuation) => (
                  <article
                    key={valuation.inspectionId}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {valuation.equipmentName}
                        </h3>

                        <p className="mt-1 text-sm text-slate-600">
                          {valuation.brand}
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                        Awaiting Your Decision
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-sm text-slate-500">
                          Your requested price
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {formatPrice(
                            valuation.requestedPricePence
                          )}
                          <span className="text-sm font-normal">
                            /day
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm text-emerald-800">
                          Administrator proposed price
                        </p>

                        <p className="mt-2 text-2xl font-bold text-emerald-900">
                          {formatPrice(
                            valuation.proposedPricePence
                          )}
                          <span className="text-sm font-normal">
                            /day
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-slate-500">
                          Functional Test
                        </p>

                        <p className="mt-1 font-semibold text-emerald-700">
                          Pass
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3">
                        <p className="text-slate-500">
                          Safety Test
                        </p>

                        <p className="mt-1 font-semibold text-emerald-700">
                          Pass
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3">
                        <p className="text-slate-500">
                          Condition Grade
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {valuation.grade}
                          {valuation.grade === "A"
                            ? " — Excellent"
                            : valuation.grade === "B"
                              ? " — Good"
                              : " — Fair"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl bg-white p-4">
                      <h4 className="font-semibold text-slate-900">
                        Administrator Inspection Notes
                      </h4>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {valuation.conditionNotes}
                      </p>
                    </div>

                    <p className="mt-5 text-sm text-amber-900">
                      Accepting this valuation will
                      publish your listing at the
                      proposed daily price. Declining
                      will withdraw the listing.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={
                          processingValuationId !== null
                        }
                        onClick={() =>
                          void handleValuationDecision(
                            valuation,
                            "accept"
                          )
                        }
                        className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingValuationId ===
                        valuation.equipmentId
                          ? "Processing..."
                          : "Accept Valuation"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          processingValuationId !== null
                        }
                        onClick={() =>
                          void handleValuationDecision(
                            valuation,
                            "decline"
                          )
                        }
                        className="rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Decline Valuation
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ADD EQUIPMENT FORM */}

        {showForm && (
          <section className="mb-8 rounded-2xl bg-white p-6 shadow-md">
            <h2 className="mb-5 text-xl font-bold">
              Submit Equipment
            </h2>

            <p className="mb-6 text-sm text-slate-600">
              Your listing will be reviewed before
              becoming publicly available.
            </p>

            <form
              onSubmit={handleSubmit}
              className="grid gap-5 md:grid-cols-2"
            >
              <label className="block text-sm font-medium">
                Equipment Name
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Brand
                <input
                  maxLength={100}
                  value={brand}
                  onChange={(event) =>
                    setBrand(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Model
                <input
                  maxLength={100}
                  value={model}
                  onChange={(event) =>
                    setModel(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Category
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value as EquipmentCategory
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  {categories.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Subcategory
                <input
                  required
                  maxLength={100}
                  placeholder="e.g. cordless_drills"
                  value={subcategory}
                  onChange={(event) =>
                    setSubcategory(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Power Source
                <select
                  value={powerSource}
                  onChange={(event) =>
                    setPowerSource(
                      event.target.value as EquipmentPowerSource
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  {powerSources.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Battery Platform (optional)
                <input
                  maxLength={100}
                  placeholder="e.g. makiro_18v"
                  value={batteryPlatform}
                  onChange={(event) =>
                    setBatteryPlatform(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Collection Point
                <select
                  required
                  value={libraryId}
                  onChange={(event) =>
                    setLibraryId(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  <option value="">
                    Select collection point
                  </option>

                  {libraries.map((library) => (
                    <option
                      key={library.id}
                      value={library.id}
                    >
                      {library.name} — {library.city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Quantity
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  required
                  value={totalStock}
                  onChange={(event) =>
                    setTotalStock(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Proposed Daily Price (£)
                <input
                  type="number"
                  min={0}
                  max={500}
                  step="0.01"
                  required
                  value={dailyPrice}
                  onChange={(event) =>
                    setDailyPrice(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
                <input
                  type="checkbox"
                  checked={batteryIncluded}
                  onChange={(event) =>
                    setBatteryIncluded(event.target.checked)
                  }
                  className="h-4 w-4 accent-emerald-700"
                />
                Battery included with equipment
              </label>

              <label className="block text-sm font-medium md:col-span-2">
                Description
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </label>

              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 md:col-span-2">
                Equipment must pass GreenShare inspection
                before it can be rented.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60 md:col-span-2"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Equipment"}
              </button>
            </form>
          </section>
        )}

        {/* EQUIPMENT LIST */}

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-5 text-xl font-bold">
            My Listings
          </h2>

          {loadingEquipment ? (
            <p className="text-slate-600">
              Loading your equipment...
            </p>
          ) : equipment.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-medium text-slate-700">
                You have not submitted any equipment yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Use Add Equipment to create your first listing.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {equipment.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {item.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.brand}
                      </p>
                    </div>

                    <span
                      className={
                        item.approvalStatus === "approved"
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                          : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                      }
                    >
                      {statusLabels[item.approvalStatus] ??
                        item.approvalStatus}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">
                        Quantity
                      </p>

                      <p className="font-semibold">
                        {item.totalStock}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Daily Price
                      </p>

                      <p className="font-semibold">
                        {formatPrice(
                          item.dailyPricePence
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}