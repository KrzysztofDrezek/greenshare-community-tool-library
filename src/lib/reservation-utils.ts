import type {
  Equipment,
  ReservationDate,
} from "@/types";

// ======================================================
// GREENSHARE — RESERVATION UTILITIES
// ======================================================

// This module contains shared reservation calculations.
//
// IMPORTANT:
// These functions are not an authoritative reservation
// mechanism. Final availability and permissions must
// be verified by a trusted backend transaction.

// ------------------------------------------------------
// RESERVATION ITEMS
// ------------------------------------------------------

export interface ReservationItem {
  equipmentId: string;
  quantity: number;
}

export interface ReservationSelection {
  date: ReservationDate;
  pickupLocationId: string;
  returnLocationId: string;
  items: ReservationItem[];
}

// ------------------------------------------------------
// AVAILABILITY
// ------------------------------------------------------

export interface StockAvailability {
  equipmentId: string;
  totalStock: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export function getAvailableQuantity(
  totalStock: number,
  reservedQuantity: number
): number {
  if (
    !Number.isInteger(totalStock) ||
    !Number.isInteger(reservedQuantity) ||
    totalStock < 0 ||
    reservedQuantity < 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    totalStock - reservedQuantity
  );
}

export function hasEnoughStock(
  availableQuantity: number,
  requestedQuantity: number
): boolean {
  return (
    Number.isInteger(availableQuantity) &&
    Number.isInteger(requestedQuantity) &&
    availableQuantity >= 0 &&
    requestedQuantity > 0 &&
    requestedQuantity <= availableQuantity
  );
}

// ------------------------------------------------------
// BATTERY COMPATIBILITY
// ------------------------------------------------------

export function isCompatibleAccessory(
  tool: Equipment,
  accessory: Equipment
): boolean {
  // Only batteries and chargers can be accessories.
  if (accessory.category !== "batteries_chargers") {
    return false;
  }

  // The selected tool must support batteries.
  if (tool.powerSource !== "battery") {
    return false;
  }

  if (!tool.batteryPlatform) {
    return false;
  }

  if (!accessory.batteryPlatform) {
    return false;
  }

  return (
    tool.batteryPlatform ===
    accessory.batteryPlatform
  );
}

// ------------------------------------------------------
// PRICE CALCULATIONS
// ------------------------------------------------------

export function calculateItemDailyPrice(
  equipment: Equipment,
  quantity: number
): number {
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !Number.isInteger(equipment.dailyPricePence) ||
    equipment.dailyPricePence < 0
  ) {
    return 0;
  }

  return equipment.dailyPricePence * quantity;
}

export function calculateReservationDailyPrice(
  items: ReservationItem[],
  equipmentById: Map<string, Equipment>
): number {
  let total = 0;

  for (const item of items) {
    const equipment = equipmentById.get(
      item.equipmentId
    );

    if (!equipment) {
      continue;
    }

    total += calculateItemDailyPrice(
      equipment,
      item.quantity
    );
  }

  return total;
}

// ------------------------------------------------------
// RETURN LOCATION RULES
// ------------------------------------------------------

export function isReturnLocationAllowed(
  equipment: Equipment,
  pickupLocationId: string,
  returnLocationId: string
): boolean {
  if (!pickupLocationId || !returnLocationId) {
    return false;
  }

  // Community-owned equipment must return
  // to its original pickup location.
  if (equipment.ownership === "community") {
    return pickupLocationId === returnLocationId;
  }

  // GreenShare-owned equipment may return
  // to another GreenShare collection point.
  return equipment.ownership === "greenshare";
}

// ------------------------------------------------------
// EQUIPMENT ELIGIBILITY
// ------------------------------------------------------

export function canEquipmentBeReserved(
  equipment: Equipment
): boolean {
  return (
    equipment.active &&
    equipment.approvalStatus === "approved" &&
    equipment.totalStock > 0 &&
    Number.isInteger(equipment.totalStock) &&
    Number.isInteger(equipment.dailyPricePence) &&
    equipment.dailyPricePence >= 0
  );
}

// ------------------------------------------------------
// RESERVATION VALIDATION
// ------------------------------------------------------

export interface ReservationValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateReservationSelection(
  selection: ReservationSelection,
  equipmentById: Map<string, Equipment>,
  availabilityById: Map<string, number>,
  validLocationIds: Set<string>
): ReservationValidationResult {
  const errors: string[] = [];

  if (selection.items.length === 0) {
    errors.push("Select at least one equipment item.");
  }

  if (!validLocationIds.has(selection.pickupLocationId)) {
    errors.push("Invalid pickup location.");
  }

  if (!validLocationIds.has(selection.returnLocationId)) {
    errors.push("Invalid return location.");
  }

  const requestedByEquipmentId = new Map<string, number>();

  for (const item of selection.items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      errors.push(
        `Invalid quantity for ${item.equipmentId}.`
      );

      continue;
    }

    requestedByEquipmentId.set(
      item.equipmentId,
      (requestedByEquipmentId.get(item.equipmentId) ?? 0) +
        item.quantity
    );
  }

  for (const [
    equipmentId,
    quantity,
  ] of requestedByEquipmentId) {
    const equipment = equipmentById.get(equipmentId);

    if (!equipment) {
      errors.push(
        `Equipment ${equipmentId} was not found.`
      );

      continue;
    }

    if (!canEquipmentBeReserved(equipment)) {
      errors.push(
        `${equipment.name} is not available for reservation.`
      );
    }

    if (
      equipment.currentLocationId !==
      selection.pickupLocationId
    ) {
      errors.push(
        `${equipment.name} is not stored at the selected pickup location.`
      );
    }

    const availableQuantity =
      availabilityById.get(equipmentId) ?? 0;

    if (!hasEnoughStock(availableQuantity, quantity)) {
      errors.push(
        `Insufficient stock for ${equipment.name}.`
      );
    }

    if (
      !isReturnLocationAllowed(
        equipment,
        selection.pickupLocationId,
        selection.returnLocationId
      )
    ) {
      errors.push(
        `${equipment.name} must be returned to its pickup location.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}