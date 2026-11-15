
"use client";

import { useState, type FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@/types";

// Academic demonstration accounts only.
// Never use these credentials in a production application.
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

type Profile = {
  uid: string;
  username: string;
  role: UserRole;
  active: boolean;
};

function isValidProfile(
  value: unknown,
  authenticatedUid: string
): value is Profile {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    profile.uid === authenticatedUid &&
    typeof profile.username === "string" &&
    profile.username.length > 0 &&
    (profile.role === "admin" || profile.role === "worker") &&
    profile.active === true
  );
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetLoginState() {
    setSignedIn(false);
    setUsername("");
    setUserRole(null);
    setMessage("");
    setError("");
  }

  function selectDemoAccount(
    account: (typeof demoAccounts)[number]
  ) {
    setIdentifier(account.username);
    setPassword(account.password);

    resetLoginState();
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    resetLoginState();

    try {
      const enteredIdentifier = identifier.trim().toLowerCase();

      // Username resolution is restricted to predefined
      // academic demonstration accounts.
      const demoAccount = demoAccounts.find(
        (account) => account.username === enteredIdentifier
      );

      const email = demoAccount?.email ?? enteredIdentifier;

      // 1. Authenticate the user.
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const authenticatedUid = credential.user.uid;

      // 2. Read the matching Firestore profile.
      const profileReference = doc(
        db,
        "users",
        authenticatedUid
      );

      const profileSnapshot = await getDoc(profileReference);

      if (!profileSnapshot.exists()) {
        throw new Error("User profile does not exist.");
      }

      const profileData: unknown = profileSnapshot.data();

      // 3. Validate the profile and its UID.
      if (!isValidProfile(profileData, authenticatedUid)) {
        throw new Error("Invalid or inactive user profile.");
      }

      // 4. Update the interface.
      setUsername(profileData.username);
      setUserRole(profileData.role);
      setSignedIn(true);

      setMessage(
        `Successfully signed in as ${profileData.username}.`
      );
    } catch (loginError) {
      // Clear any partially authenticated session.
      await signOut(auth).catch(() => undefined);

      console.error("Authentication error:", loginError);

      resetLoginState();

      setError(
        "Unable to sign in. Please check your credentials and account status."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);

    try {
      await signOut(auth);

      setIdentifier("");
      setPassword("");

      resetLoginState();

      setMessage("You have been signed out successfully.");
    } catch (logoutError) {
      console.error("Logout error:", logoutError);

      setError("Unable to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* Application branding */}
        <header className="mb-8 text-center">
          <div className="mb-3 text-4xl" aria-hidden="true">
            🌿
          </div>

          <h1 className="text-3xl font-bold text-emerald-800">
            GreenShare
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Community Tool Library
          </p>
        </header>

        {!signedIn ? (
          <>
            {/* Login form */}
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
                    setIdentifier(event.target.value)
                  }
                  autoComplete="username"
                  placeholder="Enter username or email"
                  required
                  disabled={loading}
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
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  placeholder="Enter password"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-center text-sm font-semibold">
                Demo accounts
              </h2>

              <p className="mt-1 text-center text-xs text-slate-500">
                Select an account to fill in the credentials.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    disabled={loading}
                    onClick={() => selectDemoAccount(account)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-3 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Authenticated user information */
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-xl font-semibold text-emerald-800">
                Welcome, {username}!
              </h2>

              <p className="mt-2 text-sm text-emerald-700">
                You have successfully authenticated.
              </p>

              <div className="mt-4 rounded-lg bg-white p-3">
                <p className="text-xs text-slate-500">
                  Account role
                </p>

                <p className="mt-1 font-semibold text-emerald-800">
                  {userRole === "admin"
                    ? "Administrator"
                    : "Worker"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        )}

        {/* Feedback messages */}
        {message && (
          <div
            role="status"
            className="mt-5 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Academic demonstration environment only
          </p>
        </footer>
      </section>
    </main>
  );
}
