"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { getAdminReservations, type AdminReservationItem } from "@/actions/admin-reservations";
import {
  adminCancelReservation,
  adminEditReservation,
} from "@/actions/admin-manage-reservations";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";

// GREENSHARE — ADMIN RESERVATIONS
// Server Actions enforce administrator role and transactional stock updates.

type StatusFilter = "all" | "active" | "cancelled" | "other";
type EditState = {
  reservationId: string;
  equipmentName: string;
  rentalStartDate: string;
  rentalDays: number;
  quantity: number;
};

const BOOKING_DATES = ["2027-02-01", "2027-02-02", "2027-02-03"] as const;

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function formatDate(date: string): string {
  if (!date) return "Not recorded";
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(parsed);
}

function formatDeadline(value: string): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London",
  }).format(parsed);
}

function todayLondon(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (part: string) => parts.find((item) => item.type === part)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function canManage(item: AdminReservationItem): boolean {
  return item.status === "active" &&
    item.returnStatus === "not_collected" &&
    item.rentalStartDate > todayLondon();
}

function statusStyle(status: string): string {
  if (status === "active") return "bg-emerald-100 text-emerald-900";
  if (status === "cancelled") return "bg-rose-100 text-rose-900";
  return "bg-slate-100 text-slate-700";
}

export default function AdminReservationsPage() {
  const { loading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const [items, setItems] = useState<AdminReservationItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<EditState | null>(null);

  const fetchReservations = useCallback(async (isCancelled: () => boolean) => {
    setIsFetching(true);
    setError("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You need to sign in again.");
      const token = await currentUser.getIdToken();
      const result = await getAdminReservations(token);
      if (!isCancelled()) setItems(result);
    } catch (cause) {
      if (!isCancelled()) {
        setError(cause instanceof Error ? cause.message : "Unable to load reservations.");
      }
    } finally {
      if (!isCancelled()) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !isAdmin) return;
    let cancelled = false;
    // Schedule async loading outside the synchronous effect body.
    void Promise.resolve().then(() => {
      if (!cancelled) return fetchReservations(() => cancelled);
    });
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, isAdmin, fetchReservations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "other"
          ? item.status !== "active" && item.status !== "cancelled"
          : item.status === statusFilter);
      const matchesSearch = !term || [
        item.id, item.workerName, item.workerId,
        item.equipmentName, item.equipmentId,
        item.pickupLocationName, item.returnLocationName,
      ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const activeCount = items.filter((item) => item.status === "active").length;
  const cancelledCount = items.filter((item) => item.status === "cancelled").length;
  const maxDays = editing ? 4 - Number(editing.rentalStartDate.slice(-2)) : 0;
  // For 1, 2, 3 February, max rental days are respectively 3, 2, 1.
  const maximumRentalDays = editing
    ? Math.max(1, Math.min(3, maxDays)) : 1;

  function beginEdit(item: AdminReservationItem) {
    if (!canManage(item) || saving) return;
    setEditing({
      reservationId: item.id,
      equipmentName: item.equipmentName,
      rentalStartDate: item.rentalStartDate,
      rentalDays: item.rentalDays,
      quantity: item.quantity,
    });
    setError("");
    setMessage("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Please sign in again.");
      const token = await currentUser.getIdToken();
      await adminEditReservation(token, {
        reservationId: editing.reservationId,
        rentalStartDate: editing.rentalStartDate,
        rentalDays: editing.rentalDays,
        quantity: editing.quantity,
      });
      setEditing(null);
      setMessage("Reservation updated successfully. Inventory has been recalculated.");
      await fetchReservations(() => false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update reservation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(item: AdminReservationItem) {
    if (!canManage(item) || saving) return;
    const confirmed = window.confirm(
      `Cancel reservation ${item.id} for ${item.workerName}?\n\nThis will release its reserved inventory for all occupied dates. This action cannot be undone.`
    );
    if (!confirmed) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Please sign in again.");
      const token = await currentUser.getIdToken();
      await adminCancelReservation(token, item.id);
      setEditing(null);
      setMessage(`Reservation ${item.id} cancelled. Reserved inventory has been released.`);
      await fetchReservations(() => false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel reservation.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Checking your session...</main>;
  }
  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Administrator access required</h1>
          <p className="mt-3 text-slate-600">Only a GreenShare administrator can manage reservations.</p>
          <Link href={isAuthenticated ? "/" : "/login"} className="mt-6 inline-block font-semibold text-emerald-700 underline">
            {isAuthenticated ? "Back to GreenShare" : "Sign in"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link href="/my-account" className="text-sm font-semibold text-emerald-700 hover:underline">← Back to My Account</Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">GreenShare Administration</p>
            <h1 className="mt-2 text-3xl font-bold">All Reservations</h1>
            <p className="mt-2 text-slate-600">Review, edit and cancel future reservations. Inventory updates are checked securely.</p>
          </div>
          <button type="button" onClick={() => void fetchReservations(() => false)} disabled={isFetching || saving}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {isFetching ? "Refreshing..." : "Refresh list"}
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total reservations", value: items.length },
            { label: "Active", value: activeCount },
            { label: "Cancelled", value: cancelledCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6" aria-label="Reservation filters">
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div>
              <label htmlFor="reservation-search" className="mb-2 block text-sm font-semibold">Search reservations</label>
              <input id="reservation-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Worker, equipment, location or reference..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600" />
            </div>
            <div>
              <label htmlFor="reservation-status" className="mb-2 block text-sm font-semibold">Status</label>
              <select id="reservation-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="other">Other statuses</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Showing {filtered.length} of {items.length} reservations</p>
        </section>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {message && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div>}
        {isFetching ? (
          <p role="status" className="mt-8 text-slate-600">Loading reservations...</p>
        ) : !error && filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center text-slate-600">
            {items.length === 0 ? "No reservations have been recorded yet." : "No reservations match your filters."}
          </div>
        ) : !error && (
          <div className="mt-6 space-y-4">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">{item.equipmentName}</h2>
                    <p className="mt-1 text-sm text-slate-600">Booked by <strong>{item.workerName}</strong></p>
                    <p className="mt-2 wrap-break-word font-mono text-xs text-slate-500">Reference: {item.id}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyle(item.status)}`}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-slate-500">Rental period</dt><dd className="mt-1 font-semibold">{formatDate(item.rentalStartDate)} – {formatDate(item.rentalEndDate)}</dd></div>
                  <div><dt className="text-slate-500">Return deadline</dt><dd className="mt-1 font-semibold">{formatDeadline(item.returnDeadline)}</dd></div>
                  <div><dt className="text-slate-500">Quantity</dt><dd className="mt-1 font-semibold">{item.quantity}</dd></div>
                  <div><dt className="text-slate-500">Total rental value</dt><dd className="mt-1 font-semibold">{formatMoney(item.totalPricePence)}</dd></div>
                  <div><dt className="text-slate-500">Pickup</dt><dd className="mt-1 font-semibold">{item.pickupLocationName}</dd></div>
                  <div><dt className="text-slate-500">Return location</dt><dd className="mt-1 font-semibold">{item.returnLocationName}</dd></div>
                  <div><dt className="text-slate-500">Return status</dt><dd className="mt-1 font-semibold capitalize">{item.returnStatus.replaceAll("_", " ")}</dd></div>
                  <div><dt className="text-slate-500">Rental days</dt><dd className="mt-1 font-semibold">{item.rentalDays}</dd></div>
                </dl>
                {canManage(item) && (
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                    <button type="button" onClick={() => beginEdit(item)} disabled={saving || isFetching}
                      className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Edit reservation</button>
                    <button type="button" onClick={() => void handleCancel(item)} disabled={saving || isFetching}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Cancel reservation</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="edit-reservation-heading"
              className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
              <h2 id="edit-reservation-heading" className="text-xl font-bold">Edit Reservation</h2>
              <p className="mt-2 text-sm text-slate-600">{editing.equipmentName}</p>
              <p className="mt-2 wrap-break-word font-mono text-xs text-slate-500">{editing.reservationId}</p>
              <form onSubmit={(event) => void handleSave(event)} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="edit-start-date" className="mb-2 block text-sm font-semibold">Rental start date</label>
                  <select id="edit-start-date" required value={editing.rentalStartDate}
                    onChange={(event) => setEditing((previous) => previous ? {
                      ...previous, rentalStartDate: event.target.value, rentalDays: 1,
                    } : null)} disabled={saving}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3">
                    {BOOKING_DATES.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-rental-days" className="mb-2 block text-sm font-semibold">Rental duration</label>
                  <select id="edit-rental-days" required value={editing.rentalDays}
                    onChange={(event) => setEditing((previous) => previous ? {
                      ...previous, rentalDays: Number(event.target.value),
                    } : null)} disabled={saving}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3">
                    {Array.from({ length: maximumRentalDays }, (_, index) => index + 1).map((days) => (
                      <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-quantity" className="mb-2 block text-sm font-semibold">Quantity</label>
                  <input id="edit-quantity" type="number" required min={1} max={50} step={1}
                    value={editing.quantity} disabled={saving}
                    onChange={(event) => setEditing((previous) => previous ? {
                      ...previous, quantity: Number(event.target.value),
                    } : null)}
                    className="w-full rounded-lg border border-slate-300 p-3" />
                </div>
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Saving will recalculate inventory and the reservation total. Changes are recorded in Firestore.
                </p>
                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" disabled={saving} onClick={() => setEditing(null)}
                    className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Close</button>
                  <button type="submit" disabled={saving || editing.rentalDays > maximumRentalDays || !Number.isInteger(editing.quantity) || editing.quantity < 1 || editing.quantity > 50}
                    className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
