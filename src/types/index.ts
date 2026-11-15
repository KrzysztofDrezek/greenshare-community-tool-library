
import type { Timestamp } from "firebase/firestore";

// User roles
export type UserRole = "worker" | "admin";

// Equipment categories
export type EquipmentCategory = "tool" | "sustainability";

// Reservation status
export type ReservationStatus = "active" | "cancelled";

// Allowed reservation dates
export const ALLOWED_RESERVATION_DATES = [
  "2027-02-01",
  "2027-02-02",
  "2027-02-03",
] as const;

export type ReservationDate =
  (typeof ALLOWED_RESERVATION_DATES)[number];

// User profile
export interface User {
  id: string;
  uid: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp;
}

// Equipment library
export interface Library {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  active: boolean;
}

// Equipment inventory
export interface Equipment {
  id: string;
  libraryId: string;
  name: string;
  category: EquipmentCategory;
  description: string;
  totalStock: number;
  active: boolean;
}

// Equipment reservation
export interface Reservation {
  id: string;
  workerId: string;
  libraryId: string;
  equipmentId: string;
  date: ReservationDate;
  quantity: number;
  status: ReservationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Equipment availability for a specific date
export interface Availability {
  id: string;
  equipmentId: string;
  date: ReservationDate;
  reservedQuantity: number;
}

// Calculate remaining equipment stock
export function calculateAvailableStock(
  totalStock: number,
  reservedQuantity: number
): number {
  return Math.max(0, totalStock - reservedQuantity);
}

// Validate reservation date at runtime
export function isValidReservationDate(
  date: string
): date is ReservationDate {
  return ALLOWED_RESERVATION_DATES.some(
    (allowedDate) => allowedDate === date
  );
}
