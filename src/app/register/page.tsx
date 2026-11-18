"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_USER_ROLE } from "@/types";

// ======================================================
// GREENSHARE — WORKER REGISTRATION
// ======================================================

export default function RegisterPage() {
  const router = useRouter();

  const {
    loading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------
  // AUTHENTICATED USER REDIRECT
  // ----------------------------------------------------

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // ----------------------------------------------------
  // REGISTRATION
  // ----------------------------------------------------

  async function handleRegister(
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

    setError("");

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 30
    ) {
      setError(
        "Username must contain between 3 and 30 characters."
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setError(
        "Username can contain only letters, numbers and underscores."
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      // Firebase Authentication creates the identity.
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      try {
        // The client requests ONLY Worker permissions.
        // Firestore rules must enforce these values.
        await setDoc(
          doc(db, "users", credential.user.uid),
          {
            uid: credential.user.uid,
            username: cleanUsername,
            role: DEFAULT_USER_ROLE,
            active: true,
            createdAt: serverTimestamp(),
          }
        );
      } catch (profileError) {
        // If profile creation fails, attempt to remove
        // the newly created Authentication account.
        try {
          await deleteUser(credential.user);
        } catch (cleanupError) {
          console.error(
            "Unable to remove incomplete account:",
            cleanupError
          );

          await signOut(auth);
        }

        throw profileError;
      }

      router.replace("/");
      router.refresh();
    } catch (registrationError: unknown) {
      console.error(
        "Registration failed:",
        registrationError
      );

      const firebaseError = registrationError as {
        code?: string;
      };

      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          setError(
            "An account with this email already exists."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setError(
            "Please choose a stronger password."
          );
          break;

        default:
          setError(
            "Unable to create your account. Please try again."
          );
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50">
        <p className="text-slate-600">
          Checking authentication...
        </p>
      </main>
    );
  }

  // ----------------------------------------------------
  // REGISTRATION FORM
  // ----------------------------------------------------

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-3xl font-bold tracking-tight text-emerald-700"
          >
            GreenShare
          </Link>

          <p className="mt-2 text-sm text-slate-600">
            Community Tool Library
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Create Account
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Join GreenShare and start sharing resources.
            </p>
          </div>

          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Choose a username"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repeat your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900">
                Your account will automatically receive
                standard Worker permissions.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || isAuthenticated}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Creating Account..."
                : "Create Account"}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-700 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-emerald-700"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}