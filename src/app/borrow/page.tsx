
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { createReservation } from "@/actions/reservations";

import { RENTAL_TERMS_VERSION } from "@/lib/rental-constants";

import { auth, db } from "@/lib/firebase";

// ======================================================
// GREENSHARE — BORROW EQUIPMENT
// ======================================================

type EquipmentOption = {
  id: string;
  name: string;
  brand: string;
  model: string;
  ownership: string;
  currentLocationId: string;
  totalStock: number | null;
  dailyPricePence: number;
};

type LibraryOption = {
  id: string;
  name: string;
  city: string;
};

const RESERVATION_DATES = [
  {
    value: "2027-02-01",
    label: "1 February 2027",
  },
  {
    value: "2027-02-02",
    label: "2 February 2027",
  },
  {
    value: "2027-02-03",
    label: "3 February 2027",
  },
] as const;

const MAX_RENTAL_DAYS = 3;
const MAX_QUANTITY = 50;

// ------------------------------------------------------
// FORMATTING
// ------------------------------------------------------

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

function formatDate(date: string): string {
  const parsed = new Date(
    `${date}T12:00:00.000Z`
  );

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function addDays(
  date: string,
  days: number
): string {
  const parsed = new Date(
    `${date}T00:00:00.000Z`
  );

  parsed.setUTCDate(
    parsed.getUTCDate() + days
  );

  return parsed.toISOString().slice(0, 10);
}

function readString(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function readInteger(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value)
  ) {
    return value;
  }

  return null;
}

function getMaximumRentalDays(
  startDate: string
): number {
  const index = RESERVATION_DATES.findIndex(
    (item) => item.value === startDate
  );

  if (index === -1) {
    return 1;
  }

  return Math.min(
    MAX_RENTAL_DAYS,
    RESERVATION_DATES.length - index
  );
}

// ------------------------------------------------------
// PAGE
// ------------------------------------------------------

export default function BorrowPage() {
  const [equipment, setEquipment] = useState<
    EquipmentOption[]
  >([]);

  const [libraries, setLibraries] = useState<
    LibraryOption[]
  >([]);

  const [equipmentId, setEquipmentId] =
    useState("");

  const [date, setDate] = useState(
    "2027-02-01"
  );

  const [rentalDays, setRentalDays] =
    useState(1);

  const [quantity, setQuantity] = useState(1);

  const [
    returnLocationId,
    setReturnLocationId,
  ] = useState("");

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----------------------------------------------------
  // SELECTED EQUIPMENT
  // ----------------------------------------------------

  const selectedEquipment = equipment.find(
    (item) => item.id === equipmentId
  );

  const pickupLocationId =
    selectedEquipment?.currentLocationId ?? "";

  const pickupLocation = libraries.find(
    (item) => item.id === pickupLocationId
  );

  const isCommunity =
    selectedEquipment?.ownership === "community";

  const resolvedReturnLocationId = isCommunity
    ? pickupLocationId
    : returnLocationId;

  // ----------------------------------------------------
  // RENTAL PERIOD
  // ----------------------------------------------------

  const maximumRentalDays =
    getMaximumRentalDays(date);

  const effectiveRentalDays = Math.min(
    rentalDays,
    maximumRentalDays
  );

  const rentalEndDate = addDays(
    date,
    effectiveRentalDays - 1
  );

  // Return is due by 15:00 on the next day.
  const returnDate = addDays(
    rentalEndDate,
    1
  );

  const dailyPricePence =
    selectedEquipment?.dailyPricePence ?? 0;

  const totalPricePence =
    dailyPricePence *
    quantity *
    effectiveRentalDays;

  // ----------------------------------------------------
  // LOAD APPROVED CATALOGUE
  // ----------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogue() {
      try {
        const equipmentQuery = query(
          collection(db, "equipment"),
          where("active", "==", true),
          where(
            "approvalStatus",
            "==",
            "approved"
          )
        );

        const librariesQuery = query(
          collection(db, "libraries"),
          where("active", "==", true)
        );

        const [
          equipmentSnapshot,
          librariesSnapshot,
        ] = await Promise.all([
          getDocs(equipmentQuery),
          getDocs(librariesQuery),
        ]);

        const equipmentItems: EquipmentOption[] =
          equipmentSnapshot.docs.map(
            (document) => {
              const data = document.data();

              return {
                id: document.id,

                name: readString(
                  data.name,
                  "Equipment"
                ),

                brand: readString(data.brand),

                model: readString(data.model),

                ownership: readString(
                  data.ownership
                ),

                currentLocationId:
                  readString(
                    data.currentLocationId,
                    readString(data.libraryId)
                  ),

                totalStock: readInteger(
                  data.totalStock
                ),

                dailyPricePence:
                  readInteger(
                    data.dailyPricePence
                  ) ?? 0,
              };
            }
          );

        const libraryItems: LibraryOption[] =
          librariesSnapshot.docs.map(
            (document) => {
              const data = document.data();

              return {
                id: document.id,

                name: readString(
                  data.name,
                  document.id
                ),

                city: readString(data.city),
              };
            }
          );

        equipmentItems.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        libraryItems.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        if (!cancelled) {
          setEquipment(equipmentItems);
          setLibraries(libraryItems);

          // Preselect the equipment clicked in the public catalogue.
          const requestedEquipmentId = new URLSearchParams(
            window.location.search
          ).get("equipmentId");

          const requestedEquipment = equipmentItems.find(
            (item) => item.id === requestedEquipmentId
          );

          if (requestedEquipment) {
            setEquipmentId(requestedEquipment.id);
            setReturnLocationId(
              requestedEquipment.currentLocationId
            );
          } else if (requestedEquipmentId) {
            setError(
              "The selected equipment is no longer available. Please choose another item."
            );
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load equipment."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------
  // FIELD HANDLERS
  // ----------------------------------------------------

  function handleEquipmentChange(
    selectedId: string
  ) {
    const item = equipment.find(
      (entry) => entry.id === selectedId
    );

    setEquipmentId(selectedId);

    setReturnLocationId(
      item?.currentLocationId ?? ""
    );

    setQuantity(1);
    setTermsAccepted(false);

    setError("");
    setSuccess("");
  }

  function handleDateChange(
    selectedDate: string
  ) {
    setDate(selectedDate);

    setRentalDays(1);
    setSuccess("");
    setError("");
  }

  function handleDurationChange(
    selectedDays: number
  ) {
    setRentalDays(selectedDays);

    setSuccess("");
    setError("");
  }

  // ----------------------------------------------------
  // SUBMIT RESERVATION
  // ----------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSuccess("");

    const user = auth.currentUser;

    if (!user) {
      setError(
        "Please sign in before reserving equipment."
      );
      return;
    }

    if (!selectedEquipment) {
      setError(
        "Please select equipment."
      );
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      setError(
        "Please enter a valid quantity."
      );
      return;
    }

    if (
      !Number.isSafeInteger(rentalDays) ||
      rentalDays < 1 ||
      rentalDays > maximumRentalDays
    ) {
      setError(
        "Please select a valid rental duration."
      );
      return;
    }

    if (
      !pickupLocationId ||
      !resolvedReturnLocationId
    ) {
      setError(
        "Please select valid pickup and return locations."
      );
      return;
    }

    if (!termsAccepted) {
      setError(
        "You must accept the Rental Terms & Conditions."
      );
      return;
    }

    setSubmitting(true);

    try {
      const idToken =
        await user.getIdToken();

      const result =
        await createReservation(
          idToken,
          {
            equipmentId:
              selectedEquipment.id,

            date,

            rentalDays,

            quantity,

            pickupLocationId,

            returnLocationId:
              resolvedReturnLocationId,

            termsAccepted: true,
          }
        );

      const confirmedReturnDate =
        result.returnDeadline.slice(0, 10);

      setSuccess(
        "Reservation confirmed! " +
          `Reference: ${result.reservationId}. ` +
          `Total: ${formatMoney(
            result.totalPricePence
          )}. ` +
          "Return by 15:00 on " +
          formatDate(confirmedReturnDate) +
          "."
      );

      setQuantity(1);
      setTermsAccepted(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to complete reservation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to GreenShare
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              GreenShare Community Tool Library
            </p>

            <h1 className="text-3xl font-bold">
              Borrow Equipment
            </h1>

            <p className="mt-3 text-slate-600">
              Select equipment, rental duration
              and collection details.
            </p>
          </header>

          {loading ? (
            <p className="text-slate-600">
              Loading available equipment...
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* EQUIPMENT */}

              <section>
                <label
                  htmlFor="equipment"
                  className="mb-2 block font-semibold"
                >
                  Equipment
                </label>

                <select
                  id="equipment"
                  required
                  value={equipmentId}
                  onChange={(event) =>
                    handleEquipmentChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-3"
                >
                  <option value="">
                    Select equipment
                  </option>

                  {equipment.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                      {item.brand
                        ? ` — ${item.brand}`
                        : ""}
                      {item.model
                        ? ` ${item.model}`
                        : ""}
                    </option>
                  ))}
                </select>

                {equipment.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    No approved equipment found.
                  </p>
                )}
              </section>

              {/* EQUIPMENT DETAILS */}

              {selectedEquipment && (
                <section className="rounded-xl bg-emerald-50 p-4">
                  <h2 className="font-semibold text-emerald-900">
                    {selectedEquipment.name}
                  </h2>

                  <p className="mt-2 text-sm text-emerald-800">
                    Daily rate:{" "}
                    {formatMoney(
                      dailyPricePence
                    )}
                  </p>

                  <p className="mt-1 text-sm text-emerald-800">
                    Ownership:{" "}
                    {isCommunity
                      ? "Community"
                      : "GreenShare"}
                  </p>

                  <p className="mt-1 text-sm text-emerald-800">
                    Total inventory:{" "}
                    {selectedEquipment.totalStock ??
                      "Not reported"}
                  </p>

                  <p className="mt-2 text-xs text-emerald-700">
                    Date-specific availability is
                    checked securely when booking.
                  </p>
                </section>
              )}

              {/* RENTAL DATES */}

              <section className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block font-semibold"
                  >
                    Rental start date
                  </label>

                  <select
                    id="date"
                    value={date}
                    onChange={(event) =>
                      handleDateChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-3"
                  >
                    {RESERVATION_DATES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rentalDays"
                    className="mb-2 block font-semibold"
                  >
                    Rental duration
                  </label>

                  <select
                    id="rentalDays"
                    value={effectiveRentalDays}
                    onChange={(event) =>
                      handleDurationChange(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-3"
                  >
                    {Array.from(
                      {
                        length: maximumRentalDays,
                      },
                      (_, index) => {
                        const days = index + 1;

                        return (
                          <option
                            key={days}
                            value={days}
                          >
                            {days}{" "}
                            {days === 1
                              ? "day"
                              : "days"}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-2 block font-semibold"
                  >
                    Quantity
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    max={MAX_QUANTITY}
                    step={1}
                    required
                    value={quantity}
                    onChange={(event) => {
                      setQuantity(
                        Number(
                          event.target.value
                        )
                      );
                      setSuccess("");
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3"
                  />
                </div>

                <div>
                  <p className="mb-2 font-semibold">
                    Final rental day
                  </p>

                  <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-slate-700">
                    {formatDate(
                      rentalEndDate
                    )}
                  </div>
                </div>
              </section>

              {/* LOCATIONS */}

              <section className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 font-semibold">
                    Pickup location
                  </p>

                  <div className="min-h-12 rounded-lg border border-slate-200 bg-slate-100 p-3 text-slate-700">
                    {pickupLocation
                      ? `${pickupLocation.name}, ${pickupLocation.city}`
                      : "Select equipment first"}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="returnLocation"
                    className="mb-2 block font-semibold"
                  >
                    Return location
                  </label>

                  <select
                    id="returnLocation"
                    value={
                      resolvedReturnLocationId
                    }
                    disabled={
                      !selectedEquipment ||
                      isCommunity
                    }
                    onChange={(event) => {
                      setReturnLocationId(
                        event.target.value
                      );
                      setSuccess("");
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 disabled:bg-slate-100"
                  >
                    {!selectedEquipment && (
                      <option value="">
                        Select equipment first
                      </option>
                    )}

                    {libraries.map((library) => (
                      <option
                        key={library.id}
                        value={library.id}
                      >
                        {library.name} —{" "}
                        {library.city}
                      </option>
                    ))}
                  </select>

                  {isCommunity && (
                    <p className="mt-2 text-sm text-slate-500">
                      Community equipment must
                      return to its pickup location.
                    </p>
                  )}
                </div>
              </section>

              {/* RETURN DEADLINE */}

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="font-semibold text-amber-900">
                  Return deadline
                </h2>

                <p className="mt-2 text-lg font-bold text-amber-900">
                  {formatDate(returnDate)}
                  {" — "}
                  15:00
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Equipment must be returned by
                  3:00 PM on the day following
                  the final rental day.
                </p>
              </section>

              {/* PRICE SUMMARY */}

              <section className="rounded-xl border border-slate-200 p-4">
                <h2 className="mb-4 font-semibold">
                  Rental summary
                </h2>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3">
                    <span>Daily rate</span>
                    <span>
                      {formatMoney(
                        dailyPricePence
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Rental duration</span>
                    <span>
                      {effectiveRentalDays}{" "}
                      {effectiveRentalDays === 1
                        ? "day"
                        : "days"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Quantity</span>
                    <span>{quantity}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="font-semibold">
                    Total rental price
                  </span>

                  <span className="text-2xl font-bold text-emerald-700">
                    {formatMoney(
                      totalPricePence
                    )}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Prices are informational.
                  No online payment is collected.
                </p>
              </section>

              {/* RENTAL TERMS */}

              <section className="rounded-xl border border-slate-200 p-4">
                <h2 className="mb-3 font-semibold">
                  Rental Terms & Conditions
                </h2>

                <p className="mb-4 text-sm text-slate-600">
                  Please read the borrowing rules,
                  including responsibilities for
                  equipment damage, loss and
                  late returns.
                </p>

                <Link
                  href="/rental-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
                >
                  Read Rental Terms & Conditions
                </Link>

                <label className="mt-5 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => {
                      setTermsAccepted(
                        event.target.checked
                      );
                      setSuccess("");
                    }}
                    className="mt-1 h-5 w-5 accent-emerald-700"
                  />

                  <span className="text-sm text-slate-700">
                    I confirm that I have read
                    and agree to the GreenShare
                    Rental Terms & Conditions
                    (version{" "}
                    {RENTAL_TERMS_VERSION}).
                  </span>
                </label>
              </section>

              {/* MESSAGES */}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                  {success}
                </div>
              )}

              {/* CONFIRMATION */}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedEquipment ||
                  !pickupLocationId ||
                  !termsAccepted ||
                  quantity < 1 ||
                  quantity > MAX_QUANTITY ||
                  !Number.isInteger(quantity)
                }
                className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Checking availability..."
                  : "Confirm Reservation"}
              </button>

              <p className="text-center text-xs text-slate-500">
                Your reservation will be
                confirmed only after secure
                availability validation.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
