"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

// ======================================================
// GREENSHARE — MY ACCOUNT (READ-ONLY PROFILE)
// Place this file at: src/app/my-account/page.tsx
// ======================================================

function formatAccountDate(value: string | undefined): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-5">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="wrap-break-word text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

export default function MyAccountPage() {
  const router = useRouter();

  const {
    firebaseUser,
    profile,
    loading,
    isAdmin,
  } = useAuth();

  useEffect(() => {
    if (!loading && (!firebaseUser || !profile)) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, profile, router]);

  if (loading || !firebaseUser || !profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div
          role="status"
          className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm"
        >
          {loading ? "Loading account..." : "Redirecting to sign in..."}
        </div>
      </main>
    );
  }

  const role = isAdmin ? "Administrator" : "Worker";
  const username = profile.username || "GreenShare user";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← GreenShare Home
          </Link>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Signed in
          </span>
        </div>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-emerald-100 bg-emerald-50 px-6 py-8 sm:px-10">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              GreenShare Community Tool Library
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              My Account
            </h1>

            <p className="mt-3 text-slate-700">
              Your GreenShare profile and account information.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-2xl font-bold text-white"
              >
                {username.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="wrap-break-word text-xl font-bold text-slate-950">
                  {username}
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  GreenShare {role}
                </p>
              </div>
            </div>
          </header>

          <section className="px-6 py-8 sm:px-10">
            <h2 className="text-xl font-bold text-slate-950">
              Account Details
            </h2>

            <dl className="mt-4">
              <DetailRow label="Username" value={username} />
              <DetailRow
                label="Email address"
                value={firebaseUser.email || "Not available"}
              />
              <DetailRow label="Account role" value={role} />
              <DetailRow
                label="Member since"
                value={formatAccountDate(firebaseUser.metadata.creationTime)}
              />
              <DetailRow
                label="Last sign-in"
                value={formatAccountDate(firebaseUser.metadata.lastSignInTime)}
              />
            </dl>

            <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Account information is currently read-only. Profile editing
              will be available in a future update.
            </p>
          </section>

          <section className="border-t border-slate-200 px-6 py-8 sm:px-10">
            <h2 className="text-xl font-bold text-slate-950">
              Quick Links
            </h2>

            {isAdmin ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/admin/approvals"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900 transition hover:bg-emerald-100"
                >
                  Equipment Approvals →
                  <span className="mt-1 block text-sm font-normal text-emerald-800">
                    Review submissions, inspections and owner valuations.
                  </span>
                </Link>

                <div
                  aria-label="Users and permissions management, planned"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">Users &amp; Permissions</span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                      Planned
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Manage user accounts and administrator access.
                  </p>
                </div>

                <div
                  aria-label="Library and inventory management, planned"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">Library &amp; Inventory</span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                      Planned
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Manage collection points, equipment and stock.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/my-reservations"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900 transition hover:bg-emerald-100"
                >
                  My Reservations →
                  <span className="mt-1 block text-sm font-normal text-emerald-800">
                    View active bookings and reservation history.
                  </span>
                </Link>

                <Link
                  href="/my-equipment"
                  className="rounded-xl border border-slate-200 p-4 font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  My Equipment →
                  <span className="mt-1 block text-sm font-normal text-slate-600">
                    Manage your equipment listings.
                  </span>
                </Link>
              </div>
            )}
          </section>
        </article>
      </div>
    </main>
  );
}
