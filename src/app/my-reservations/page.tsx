"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { cancelReservation } from "@/actions/cancel-reservation";
import {
  getMyReservations,
  type MyReservation,
} from "@/actions/my-reservations";

// ======================================================
// GREENSHARE — MY RESERVATIONS
// ======================================================

type Filter = "active" | "history" | "all";

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

function formatCalendarDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Not available";

  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatReturnDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function todayInLondon(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year ?? "0000"}-${month ?? "00"}-${day ?? "00"}`;
}

function statusLabel(value: string): string {
  switch (value) {
    case "active": return "Active";
    case "cancelled": return "Cancelled";
    case "completed": return "Completed";
    default: return value.replaceAll("_", " ");
  }
}

function canCancel(item: MyReservation): boolean {
  return (
    item.status === "active" &&
    item.returnStatus === "not_collected" &&
    item.rentalStartDate > todayInLondon()
  );
}

function ReservationCard({
  item,
  cancelling,
  onCancel,
}: {
  item: MyReservation;
  cancelling: boolean;
  onCancel: (item: MyReservation) => void;
}) {
  const isCancelled = item.status === "cancelled";
  const cancellationAllowed = canCancel(item);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {item.equipmentName}
          </h3>
          {item.equipmentBrand && (
            <p className="mt-1 text-sm text-slate-500">{item.equipmentBrand}</p>
          )}
          <p className="mt-2 break-all text-xs text-slate-500">
            Reference: {item.id}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
          isCancelled
            ? "bg-slate-100 text-slate-700"
            : item.status === "active"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-blue-100 text-blue-800"
        }`}>
          {statusLabel(item.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <p className="text-slate-500">Rental start</p>
          <p className="mt-1 font-semibold">{formatCalendarDate(item.rentalStartDate)}</p>
        </div>
        <div>
          <p className="text-slate-500">Final rental day</p>
          <p className="mt-1 font-semibold">{formatCalendarDate(item.rentalEndDate)}</p>
        </div>
        <div>
          <p className="text-slate-500">Rental duration</p>
          <p className="mt-1 font-semibold">
            {item.rentalDays} {item.rentalDays === 1 ? "day" : "days"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Quantity</p>
          <p className="mt-1 font-semibold">{item.quantity}</p>
        </div>
        <div>
          <p className="text-slate-500">Pickup location</p>
          <p className="mt-1 font-semibold">{item.pickupLocationName}</p>
        </div>
        <div>
          <p className="text-slate-500">Return location</p>
          <p className="mt-1 font-semibold">{item.returnLocationName}</p>
        </div>
        <div>
          <p className="text-slate-500">Daily price per unit</p>
          <p className="mt-1 font-semibold">{formatMoney(item.dailyPricePence)}</p>
        </div>
        <div>
          <p className="text-slate-500">Return status</p>
          <p className="mt-1 font-semibold capitalize">
            {item.returnStatus.replaceAll("_", " ")}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Return deadline</p>
        <p className="mt-1 text-lg font-bold text-amber-900">
          {formatReturnDeadline(item.returnDeadline)}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
        <div>
          <p className="text-sm text-slate-500">Total rental price</p>
          <p className="text-2xl font-bold text-emerald-800">
            {formatMoney(item.totalPricePence)}
          </p>
        </div>

        {cancellationAllowed && (
          <button
            type="button"
            disabled={cancelling}
            onClick={() => onCancel(item)}
            className="rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Reservation"}
          </button>
        )}
      </div>

      {item.status === "active" && !cancellationAllowed && (
        <p className="mt-3 text-xs text-slate-500">
          Online cancellation is available only before the rental start date
          and before the equipment has been collected.
        </p>
      )}
    </article>
  );
}

export default function MyReservationsPage() {
  const router = useRouter();
  const {
    firebaseUser,
    profile,
    loading: authLoading,
  } = useAuth();

  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReservations = useCallback(async (isRefresh = false) => {
    if (!firebaseUser) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const token = await firebaseUser.getIdToken();
      const results = await getMyReservations(token);
      setReservations(results);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load your reservations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser || !profile) {
      router.replace("/login");
      return;
    }

    // Start the asynchronous fetch after the effect finishes.
    // This avoids a synchronous setState chain during render.
    const timeoutId = window.setTimeout(() => {
      void loadReservations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading, firebaseUser, profile, router, loadReservations]);

  const activeCount = reservations.filter(
    (item) => item.status === "active"
  ).length;

  const historyCount = reservations.length - activeCount;

  const displayedReservations = useMemo(() => {
    if (filter === "all") return reservations;
    if (filter === "active") {
      return reservations.filter((item) => item.status === "active");
    }
    return reservations.filter((item) => item.status !== "active");
  }, [filter, reservations]);

  async function handleCancel(item: MyReservation) {
    if (cancellingId || !firebaseUser) return;

    const confirmed = window.confirm(
      `Cancel your reservation for ${item.equipmentName}?\n\n` +
      "This will release the reserved equipment for other members. " +
      "The cancellation cannot be undone."
    );

    if (!confirmed) return;

    setCancellingId(item.id);
    setError("");
    setSuccess("");

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again.");

      await cancelReservation(token, item.id);
      setSuccess(`Reservation ${item.id} has been cancelled.`);
      await loadReservations(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to cancel the reservation."
      );
    } finally {
      setCancellingId(null);
    }
  }

  if (authLoading || (!firebaseUser && !profile)) {
    return (
      <main className="min-h-screen bg-emerald-50 p-10 text-center text-slate-600">
        Checking your account...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Back to GreenShare
        </Link>

        <header className="mt-5 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              GreenShare Community Tool Library
            </p>
            <h1 className="mt-2 text-3xl font-bold">My Reservations</h1>
            <p className="mt-2 text-slate-600">
              Review your equipment bookings, return deadlines and rental history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || refreshing || cancellingId !== null}
              onClick={() => void loadReservations(true)}
              className="rounded-xl border border-emerald-700 px-5 py-3 font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/borrow"
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              + New Reservation
            </Link>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-emerald-900">
            {success}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active reservations</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">History</p>
            <p className="mt-2 text-3xl font-bold text-slate-700">{historyCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total reservations</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{reservations.length}</p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Reservation List</h2>

            <div className="flex flex-wrap gap-2">
              {([
                ["active", "Active"],
                ["history", "History"],
                ["all", "All"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    filter === value
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="mt-8 text-slate-600">Loading your reservations...</p>
          ) : displayedReservations.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-semibold text-slate-700">No reservations to display.</p>
              <p className="mt-2 text-sm text-slate-500">
                Your reservations will appear here after confirmation.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {displayedReservations.map((item) => (
                <ReservationCard
                  key={item.id}
                  item={item}
                  cancelling={cancellingId === item.id}
                  onCancel={(reservation) => void handleCancel(reservation)}
                />
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Cancellation is available before the rental begins and before equipment collection.
        </p>
      </div>
    </main>
  );
}
