"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

// ======================================================
// GREENSHARE — AUTHENTICATED NAVIGATION
// ======================================================

export default function AuthNavigation() {
  const router = useRouter();

  const {
    profile,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    logout,
  } = useAuth();

  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setLogoutError("");

    try {
      await logout();
      router.replace("/");
    } catch (err) {
      console.error("Sign out failed:", err);

      setLogoutError(
        "Unable to sign out. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

  if (loading) {
    return (
      <div
        role="status"
        className="text-sm text-slate-500"
      >
        Checking session...
      </div>
    );
  }

  // ----------------------------------------------------
  // NOT AUTHENTICATED
  // ----------------------------------------------------

  if (!isAuthenticated || !profile) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link
          href="/login"
          className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800"
        >
          Sign in
        </Link>

        {error && (
          <p
            role="alert"
            className="max-w-xs text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED USER
  // ----------------------------------------------------

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* USER PROFILE */}

        <div className="text-right">
          <p className="text-sm font-bold text-emerald-900">
            {profile.username}
          </p>

          <p className="text-xs text-slate-500">
            {isAdmin ? "Administrator" : "Worker"}
          </p>
        </div>

        {/* USER AVATAR */}

        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800"
        >
          {profile.username
            .charAt(0)
            .toUpperCase()}
        </div>

        {/* SIGN OUT */}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      {/* ERROR */}

      {logoutError && (
        <p
          role="alert"
          className="text-xs text-red-600"
        >
          {logoutError}
        </p>
      )}
    </div>
  );
}