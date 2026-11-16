"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import type {
  UserRole,
} from "@/types";

// ======================================================
// GREENSHARE — AUTHENTICATION CONTEXT
// ======================================================

export interface AuthProfile {
  uid: string;
  username: string;
  role: UserRole;
  active: boolean;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: AuthProfile | null;

  loading: boolean;
  error: string | null;

  isAuthenticated: boolean;
  isAdmin: boolean;
  isWorker: boolean;

  logout: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

// ------------------------------------------------------
// PROFILE VALIDATION
// ------------------------------------------------------

function isValidProfile(
  value: unknown,
  authenticatedUid: string
): value is AuthProfile {
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
      profile.role === "worker" ||
      profile.role === "admin"
    ) &&
    profile.active === true
  );
}

// ------------------------------------------------------
// AUTH PROVIDER
// ------------------------------------------------------

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseUser | null>(null);

  const [profile, setProfile] =
    useState<AuthProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let authChangeVersion = 0;

    const unsubscribe = onAuthStateChanged(
      auth,

      async (user) => {
        const currentVersion =
          ++authChangeVersion;

        if (!active) {
          return;
        }

        setLoading(true);
        setError(null);
        setProfile(null);

        if (!user) {
          setFirebaseUser(null);
          setLoading(false);
          return;
        }

        try {
          const profileReference = doc(
            db,
            "users",
            user.uid
          );

          const profileSnapshot =
            await getDoc(profileReference);

          if (
            !active ||
            currentVersion !== authChangeVersion
          ) {
            return;
          }

          if (!profileSnapshot.exists()) {
            throw new Error(
              "User profile was not found."
            );
          }

          const profileData: unknown =
            profileSnapshot.data();

          if (
            !isValidProfile(
              profileData,
              user.uid
            )
          ) {
            throw new Error(
              "User profile is invalid or inactive."
            );
          }

          setFirebaseUser(user);
          setProfile(profileData);
        } catch (loadError) {
          if (
            !active ||
            currentVersion !== authChangeVersion
          ) {
            return;
          }

          console.error(
            "Authentication profile error:",
            loadError
          );

          setFirebaseUser(null);
          setProfile(null);

          setError(
            "Your account profile could not be verified."
          );

          // Invalid profiles must not retain an
          // authenticated Firebase session.
          try {
            await signOut(auth);
          } catch (signOutError) {
            console.error(
              "Failed to clear session:",
              signOutError
            );
          }
        } finally {
          if (
            active &&
            currentVersion === authChangeVersion
          ) {
            setLoading(false);
          }
        }
      },

      (authError) => {
        if (!active) {
          return;
        }

        console.error(
          "Authentication observer error:",
          authError
        );

        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);

        setError(
          "Unable to verify authentication status."
        );
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------

  async function logout(): Promise<void> {
    setError(null);

    try {
      await signOut(auth);

      setFirebaseUser(null);
      setProfile(null);
    } catch (logoutError) {
      console.error(
        "Logout failed:",
        logoutError
      );

      setError(
        "Unable to sign out. Please try again."
      );

      throw logoutError;
    }
  }

  // ----------------------------------------------------
  // CONTEXT VALUE
  // ----------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,

      loading,
      error,

      isAuthenticated:
        firebaseUser !== null &&
        profile !== null,

      isAdmin:
        profile?.active === true &&
        profile.role === "admin",

      isWorker:
        profile?.active === true &&
        profile.role === "worker",

      logout,
    }),
    [
      firebaseUser,
      profile,
      loading,
      error,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------------------
// CUSTOM HOOK
// ------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}