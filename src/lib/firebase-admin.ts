import "server-only";

import {
  applicationDefault,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ======================================================
// GREENSHARE — FIREBASE ADMIN SDK
// ======================================================

// This module must only be imported by server-side code.
//
// Never import it into Client Components or expose
// Firebase Admin credentials through NEXT_PUBLIC_
// environment variables.

// ------------------------------------------------------
// FIREBASE PROJECT
// ------------------------------------------------------

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  );
}

// ------------------------------------------------------
// INITIALISE ADMIN APP
// ------------------------------------------------------

// Reuse an existing application during development.
// This prevents duplicate initialisation with
// Next.js hot reload.

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: applicationDefault(),
        projectId,
      });

// ------------------------------------------------------
// ADMIN SERVICES
// ------------------------------------------------------

export const adminAuth = getAuth(adminApp);

export const adminDb = getFirestore(adminApp);

// ------------------------------------------------------
// AUTHENTICATED USER VERIFICATION
// ------------------------------------------------------

// Client applications must provide a current Firebase
// ID token when requesting protected operations.
//
// The server verifies the token before accessing
// user-specific information.

export async function verifyUserToken(
  idToken: string
): Promise<string> {
  if (
    typeof idToken !== "string" ||
    idToken.trim().length === 0
  ) {
    throw new Error(
      "Authentication token is required."
    );
  }

  const decodedToken =
    await adminAuth.verifyIdToken(idToken, true);

  return decodedToken.uid;
}

// ------------------------------------------------------
// USER PROFILE VERIFICATION
// ------------------------------------------------------

export type VerifiedUserRole =
  | "worker"
  | "admin";

export interface VerifiedUser {
  uid: string;
  username: string;
  role: VerifiedUserRole;
}

export async function getVerifiedUser(
  idToken: string
): Promise<VerifiedUser> {
  const uid = await verifyUserToken(idToken);

  const profileSnapshot = await adminDb
    .collection("users")
    .doc(uid)
    .get();

  if (!profileSnapshot.exists) {
    throw new Error(
      "User profile was not found."
    );
  }

  const profile = profileSnapshot.data();

  if (
    !profile ||
    profile.uid !== uid ||
    profile.active !== true ||
    typeof profile.username !== "string" ||
    profile.username.trim().length === 0 ||
    (
      profile.role !== "worker" &&
      profile.role !== "admin"
    )
  ) {
    throw new Error(
      "User profile is invalid or inactive."
    );
  }

  return {
    uid,
    username: profile.username,
    role: profile.role,
  };
}

// ------------------------------------------------------
// RESERVATION PERMISSIONS
// ------------------------------------------------------

// Both Workers and Administrators may create their
// own reservations.
//
// The reservation owner must always be derived from
// the verified identity, never from client input.

export async function requireAuthenticatedUser(
  idToken: string
): Promise<VerifiedUser> {
  return getVerifiedUser(idToken);
}

// ------------------------------------------------------
// ADMINISTRATOR PERMISSIONS
// ------------------------------------------------------

export async function requireAdmin(
  idToken: string
): Promise<VerifiedUser> {
  const user = await getVerifiedUser(idToken);

  if (user.role !== "admin") {
    throw new Error(
      "Administrator permissions are required."
    );
  }

  return user;
}