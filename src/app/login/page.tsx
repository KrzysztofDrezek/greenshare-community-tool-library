"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "@/lib/firebase";

import {
  useAuth,
} from "@/lib/auth-context";

import type {
  UserRole,
} from "@/types";

// ======================================================
// GREENSHARE — LOGIN PAGE
// ======================================================

// Academic demonstration accounts only.
// These credentials must not be reused in production.

const demoAccounts = [
  {
    label: "Administrator",
    username: "admin",
    email: "admin@greenshare.example",
    password: "admin123",
  },
  {
    label: "Worker 1",
    username: "worker1",
    email: "worker1@greenshare.example",
    password: "worker1123",
  },
  {
    label: "Worker 2",
    username: "worker2",
    email: "worker2@greenshare.example",
    password: "worker2123",
  },
] as const;

// ------------------------------------------------------
// PROFILE VALIDATION
// ------------------------------------------------------

interface LoginProfile {
  uid: string;
  username: string;
  role: UserRole;
  active: boolean;
}

function isValidProfile(
  value: unknown,
  authenticatedUid: string
): value is LoginProfile {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const profile = value as Record<
    string,
    unknown
  >;

  return (
    profile.uid === authenticatedUid &&
    typeof profile.username === "string" &&
    profile.username.trim().length > 0 &&
    (
      profile.role === "admin" ||
      profile.role === "worker"
    ) &&
    profile.active === true
  );
}

// ======================================================
// LOGIN COMPONENT
// ======================================================

export default function LoginPage() {
  const router = useRouter();

  const {
    loading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  // ----------------------------------------------------
  // REDIRECT ALREADY AUTHENTICATED USERS
  // ----------------------------------------------------

  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated
    ) {
      router.replace("/");
    }
  }, [
    authLoading,
    isAuthenticated,
    router,
  ]);

  // ----------------------------------------------------
  // DEMO ACCOUNT SELECTION
  // ----------------------------------------------------

  function selectDemoAccount(
    account: (typeof demoAccounts)[number]
  ) {
    if (
      submitting ||
      authLoading ||
      isAuthenticated
    ) {
      return;
    }

    setIdentifier(account.username);
    setPassword(account.password);
    setError("");
  }

  // ----------------------------------------------------
  // LOGIN
  // ----------------------------------------------------

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      submitting ||
      authLoading ||
      isAuthenticated
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const enteredIdentifier =
        identifier.trim().toLowerCase();

      const demoAccount =
        demoAccounts.find(
          (account) =>
            account.username ===
            enteredIdentifier
        );

      // Demo usernames are converted to email.
      // Other accounts can log in using email.
      const email =
        demoAccount?.email ??
        enteredIdentifier;

      // Firebase Authentication.
      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const authenticatedUid =
        credential.user.uid;

      // Retrieve the matching Firestore profile.
      const profileReference = doc(
        db,
        "users",
        authenticatedUid
      );

      const profileSnapshot =
        await getDoc(
          profileReference
        );

      if (!profileSnapshot.exists()) {
        throw new Error(
          "User profile not found."
        );
      }

      const profileData: unknown =
        profileSnapshot.data();

      if (
        !isValidProfile(
          profileData,
          authenticatedUid
        )
      ) {
        throw new Error(
          "Invalid or inactive user profile."
        );
      }

      // Authentication succeeded.
      // AuthProvider will retain and monitor
      // the authenticated Firebase session.
      router.replace("/");
    } catch (loginError) {
      console.error(
        "Login failed:",
        loginError
      );

      // Clear any partially authenticated session.
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(
          "Failed to clear session:",
          signOutError
        );
      }

      setError(
        "Unable to sign in. Please check your credentials and account status."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // WAIT FOR FIREBASE SESSION CHECK
  // ----------------------------------------------------

  if (
    authLoading ||
    isAuthenticated
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 px-4">
        <div
          role="status"
          className="rounded-2xl bg-white px-10 py-8 text-center shadow-lg"
        >
          <div
            className="mb-4 text-4xl"
            aria-hidden="true"
          >
            🌿
          </div>

          <h1 className="text-xl font-bold text-emerald-800">
            GreenShare
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            {isAuthenticated
              ? "Redirecting to homepage..."
              : "Checking your session..."}
          </p>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // LOGIN FORM
  // ----------------------------------------------------

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* BRANDING */}

        <header className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex flex-col items-center"
          >
            <span
              className="mb-3 text-4xl"
              aria-hidden="true"
            >
              🌿
            </span>

            <h1 className="text-3xl font-bold text-emerald-800">
              GreenShare
            </h1>
          </Link>

          <p className="mt-2 text-sm text-slate-500">
            Community Tool Library
          </p>

          <p className="mt-4 text-sm text-slate-600">
            Sign in to manage your account and
            equipment reservations.
          </p>
        </header>

        {/* FORM */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium"
            >
              Username or email
            </label>

            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) =>
                setIdentifier(
                  event.target.value
                )
              }
              autoComplete="username"
              placeholder="Enter username or email"
              required
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
              placeholder="Enter password"
              required
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {/* DEMO ACCOUNTS */}

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-center text-sm font-semibold">
            Demo accounts
          </h2>

          <p className="mt-1 text-center text-xs text-slate-500">
            Choose an account to fill in its credentials.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {demoAccounts.map(
              (account) => (
                <button
                  key={account.username}
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    selectDemoAccount(
                      account
                    )
                  }
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-3 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  {account.label}
                </button>
              )
            )}
          </div>
        </section>

        {/* BACK LINK */}

        <div className="mt-7 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Back to homepage
          </Link>
        </div>

        {/* FOOTER */}

        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Academic demonstration environment only
          </p>
        </footer>
      </section>
    </main>
  );
}