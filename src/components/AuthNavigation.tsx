"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------
  // CLOSE MENU WHEN CLICKING OUTSIDE
  // ----------------------------------------------------

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // ----------------------------------------------------
  // SIGN OUT
  // ----------------------------------------------------

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setLogoutError("");
    setMenuOpen(false);

    try {
      await logout();

      router.replace("/");
      router.refresh();
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
        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Sign In
          </Link>
        </div>

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
      <div className="flex items-center justify-end gap-3">

        {/* ACCOUNT MENU */}

        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="greenshare-account-menu"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {/* USER DETAILS */}

            <div className="text-right">
              <p className="text-sm font-bold text-emerald-900">
                {profile.username}
              </p>

              <p className="text-xs text-slate-500">
                {isAdmin ? "Administrator" : "Worker"}
              </p>
            </div>

            {/* AVATAR */}

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
              {profile.username
                .charAt(0)
                .toUpperCase()}
            </div>

            <span
              aria-hidden="true"
              className="text-xs text-emerald-800"
            >
              {menuOpen ? "▲" : "▼"}
            </span>
          </button>

          {/* DROPDOWN MENU */}

          {menuOpen && (
            <div
              id="greenshare-account-menu"
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl"
            >
              {/* PROFILE HEADER */}

              <div className="border-b border-slate-100 px-3 py-3">
                <p className="font-bold text-slate-900">
                  {profile.username}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {isAdmin
                    ? "Equipment Library Administrator"
                    : "GreenShare Worker"}
                </p>
              </div>

              {/* COMMON OPTIONS */}

              <div className="py-2">
                <Link
                  href="/my-account"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  My Account
                </Link>

                {!isAdmin && (
                  <Link
                    href="/my-reservations"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                  >
                    My Reservations
                  </Link>
                )}
              </div>

              {/* WORKER OPTIONS */}

              {!isAdmin && (
                <div className="border-t border-slate-100 py-2">
                  <Link
                    href="/my-equipment"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                  >
                    My Equipment
                  </Link>

                  <Link
                    href="/my-equipment"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                  >
                    + Add Equipment
                  </Link>
                </div>
              )}

              {/* ADMIN OPTIONS */}

              {isAdmin && (
                <div className="border-t border-slate-100 py-2">
                  <Link
                    href="/admin/reservations"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                  >
                    All Reservations
                  </Link>

                  <Link
                    href="/admin/approvals"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                  >
                    Equipment Approvals
                  </Link>
                </div>
              )}

              {/* SIGN OUT */}

              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {signingOut
                    ? "Signing Out..."
                    : "Sign Out"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EXISTING SIGN OUT BUTTON */}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut
            ? "Signing out..."
            : "Sign out"}
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