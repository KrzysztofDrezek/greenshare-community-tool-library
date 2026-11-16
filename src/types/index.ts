import type { GeoPoint, Timestamp } from "firebase/firestore";

// ======================================================
// GREENSHARE — SHARED DATA TYPES
// ======================================================

// ------------------------------------------------------
// USER ACCOUNTS
// ------------------------------------------------------

export type UserRole = "worker" | "admin";

export interface User {
  id: string;
  uid: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp;
}

// New accounts always receive Worker permissions.
// Administrative privileges must be assigned securely.
export const DEFAULT_USER_ROLE: UserRole = "worker";

// ------------------------------------------------------
// EQUIPMENT CATEGORIES
// ------------------------------------------------------

export type EquipmentCategory =
  | "power_tools"
  | "garden"
  | "generators"
  | "compressors"
  | "batteries_chargers"
  | "solar_energy";

// Equipment subcategories are stored as strings.
// This allows new product types to be introduced
// without changing the entire application.
export type EquipmentSubcategory = string;

// ------------------------------------------------------
// EQUIPMENT POWER SOURCES
// ------------------------------------------------------

export type EquipmentPowerSource =
  | "battery"
  | "corded"
  | "petrol"
  | "diesel"
  | "solar"
  | "manual";

// ------------------------------------------------------
// EQUIPMENT OWNERSHIP
// ------------------------------------------------------

export type EquipmentOwnership =
  | "greenshare"
  | "community";

// ------------------------------------------------------
// EQUIPMENT CONDITION
// ------------------------------------------------------

// A = Excellent condition
// B = Good condition
// C = Functional with visible wear
export type EquipmentCondition = "A" | "B" | "C";

// ------------------------------------------------------
// EQUIPMENT LOCATIONS
// ------------------------------------------------------

export interface Library {
  id: string;

  name: string;
  address: string;

  city: string;
  postcode: string;

  location: GeoPoint;

  active: boolean;
}

export interface EquipmentLocation {
  equipmentId: string;
  currentLocationId: string;
  updatedAt: Timestamp;
}

// ------------------------------------------------------
// EQUIPMENT APPROVAL
// ------------------------------------------------------

export type EquipmentApprovalStatus =
  | "submitted"
  | "awaiting_deposit"
  | "under_inspection"
  | "awaiting_owner_approval"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "inactive";

// ------------------------------------------------------
// EQUIPMENT INVENTORY
// ------------------------------------------------------

export interface Equipment {
  id: string;

  // Basic information
  name: string;
  description: string;

  brand: string;
  model: string;

  // Classification
  category: EquipmentCategory;
  subcategory: EquipmentSubcategory;

  // Power supply
  powerSource: EquipmentPowerSource;

  // Identifies a compatible battery system.
  // Example: makiro_18v
  // Null for equipment without a battery platform.
  batteryPlatform: string | null;

  // Whether a battery is included in the basic price.
  batteryIncluded: boolean;

  // Ownership
  ownership: EquipmentOwnership;

  // Firebase UID of the private equipment owner.
  // Null for equipment owned by GreenShare.
  ownerId: string | null;

  // Physical condition
  condition: EquipmentCondition | null;

  // Inventory
  libraryId: string;
  currentLocationId: string;

  totalStock: number;

  // Price stored in integer pence.
  dailyPricePence: number;

  // Listing status
  approvalStatus: EquipmentApprovalStatus;
  active: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ------------------------------------------------------
// BATTERY COMPATIBILITY
// ------------------------------------------------------

export function areBatteryPlatformsCompatible(
  equipment: Equipment,
  accessory: Equipment
): boolean {
  if (!equipment.batteryPlatform) {
    return false;
  }

  if (!accessory.batteryPlatform) {
    return false;
  }

  return (
    equipment.batteryPlatform ===
    accessory.batteryPlatform
  );
}

// ------------------------------------------------------
// BATTERIES AND CHARGERS
// ------------------------------------------------------

export function isBattery(
  equipment: Equipment
): boolean {
  return (
    equipment.category === "batteries_chargers" &&
    equipment.subcategory === "batteries"
  );
}

export function isBatteryCharger(
  equipment: Equipment
): boolean {
  return (
    equipment.category === "batteries_chargers" &&
    equipment.subcategory === "chargers"
  );
}

export function requiresBattery(
  equipment: Equipment
): boolean {
  return (
    equipment.powerSource === "battery" &&
    equipment.category !== "batteries_chargers"
  );
}

// ------------------------------------------------------
// EQUIPMENT INSPECTIONS
// ------------------------------------------------------

export type InspectionResult =
  | "pending"
  | "passed"
  | "failed";

export type OwnerDecision =
  | "pending"
  | "accepted"
  | "declined";

export interface EquipmentInspection {
  id: string;

  equipmentId: string;
  inspectedBy: string;

  inspectionDate: Timestamp;

  functionalStatus: InspectionResult;
  safetyStatus: InspectionResult;

  grade: EquipmentCondition | null;

  conditionNotes: string;

  requestedPricePence: number;
  proposedPricePence: number | null;

  ownerDecision: OwnerDecision;

  photos: string[];
}

// ------------------------------------------------------
// RESERVATION DATES
// ------------------------------------------------------

// Dates required by the academic assessment brief.
export const ALLOWED_RESERVATION_DATES = [
  "2027-02-01",
  "2027-02-02",
  "2027-02-03",
] as const;

export type ReservationDate =
  (typeof ALLOWED_RESERVATION_DATES)[number];

export function isValidReservationDate(
  date: string
): date is ReservationDate {
  return ALLOWED_RESERVATION_DATES.some(
    (allowedDate) => allowedDate === date
  );
}

// ------------------------------------------------------
// RESERVATIONS
// ------------------------------------------------------

export type ReservationStatus =
  | "active"
  | "cancelled";

export type EquipmentReturnStatus =
  | "not_collected"
  | "collected"
  | "returned"
  | "inspection_required";

export interface Reservation {
  id: string;

  workerId: string;

  libraryId: string;
  equipmentId: string;

  date: ReservationDate;

  quantity: number;

  status: ReservationStatus;

  // Collection and return points
  pickupLocationId: string;
  returnLocationId: string;

  returnStatus: EquipmentReturnStatus;

  // Snapshot of the agreed daily rental price.
  dailyPricePence: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ------------------------------------------------------
// EQUIPMENT AVAILABILITY
// ------------------------------------------------------

export interface Availability {
  id: string;

  equipmentId: string;
  date: ReservationDate;

  reservedQuantity: number;
}

export function calculateAvailableStock(
  totalStock: number,
  reservedQuantity: number
): number {
  return Math.max(
    0,
    totalStock - reservedQuantity
  );
}

// ------------------------------------------------------
// PRICE UTILITIES
// ------------------------------------------------------

export function formatPriceGBP(
  pricePence: number
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pricePence / 100);
}

// ------------------------------------------------------
// EQUIPMENT VALIDATION
// ------------------------------------------------------

export function isEquipmentApproved(
  equipment: Equipment
): boolean {
  return (
    equipment.active &&
    equipment.approvalStatus === "approved"
  );
}

export function canReturnToDifferentLocation(
  equipment: Equipment
): boolean {
  return equipment.ownership === "greenshare";
}

export function isValidEquipmentGrade(
  grade: string
): grade is EquipmentCondition {
  return ["A", "B", "C"].includes(grade);
}

// ------------------------------------------------------
// CATEGORY HELPERS
// ------------------------------------------------------

export const EQUIPMENT_CATEGORY_LABELS: Record<
  EquipmentCategory,
  string
> = {
  power_tools: "Power Tools",
  garden: "Garden Equipment",
  generators: "Generators",
  compressors: "Compressors",
  batteries_chargers: "Batteries & Chargers",
  solar_energy: "Solar & Energy",
};

export function getEquipmentCategoryLabel(
  category: EquipmentCategory
): string {
  return EQUIPMENT_CATEGORY_LABELS[category];
}

// ------------------------------------------------------
// USER PERMISSION HELPERS
// ------------------------------------------------------

// These helpers support UI presentation only.
// Authoritative permissions must be enforced
// through server-side checks and Firestore rules.

export function isAdmin(
  user: User
): boolean {
  return (
    user.active &&
    user.role === "admin"
  );
}

export function isWorker(
  user: User
): boolean {
  return (
    user.active &&
    user.role === "worker"
  );
}