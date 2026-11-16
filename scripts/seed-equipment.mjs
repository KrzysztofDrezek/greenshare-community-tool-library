import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "greenshare-community-library";

const applyChanges = process.argv.includes("--apply");

const equipment = [
  {
    id: "EQ-DEMO-001",
    name: "Makiro 18V Cordless Drill",
    brand: "Makiro",
    model: "MX18-CD",
    category: "power_tools",
    subcategory: "cordless_drills",
    powerSource: "battery",
    batteryPlatform: "makiro_18v",
    batteryIncluded: false,
    dailyPricePence: 500,
    totalStock: 5,
    currentLocationId: "LDS-001",
  },
  {
    id: "EQ-DEMO-002",
    name: "Borsh 18V Hammer Drill",
    brand: "Borsh",
    model: "BX18-HD",
    category: "power_tools",
    subcategory: "cordless_drills",
    powerSource: "battery",
    batteryPlatform: "borsh_18v",
    batteryIncluded: false,
    dailyPricePence: 700,
    totalStock: 3,
    currentLocationId: "LDS-002",
  },
  {
    id: "EQ-DEMO-003",
    name: "DeVolt 20V Impact Driver",
    brand: "DeVolt",
    model: "DV20-ID",
    category: "power_tools",
    subcategory: "impact_drivers",
    powerSource: "battery",
    batteryPlatform: "devolt_20v",
    batteryIncluded: false,
    dailyPricePence: 600,
    totalStock: 4,
    currentLocationId: "MAN-001",
  },
  {
    id: "EQ-DEMO-004",
    name: "Millwork Corded Angle Grinder",
    brand: "Millwork",
    model: "MW125-AG",
    category: "power_tools",
    subcategory: "angle_grinders",
    powerSource: "corded",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 800,
    totalStock: 3,
    currentLocationId: "MAN-002",
  },
  {
    id: "EQ-DEMO-005",
    name: "Borsh Corded SDS Hammer",
    brand: "Borsh",
    model: "BX-SDS28",
    category: "power_tools",
    subcategory: "rotary_hammers",
    powerSource: "corded",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 1100,
    totalStock: 2,
    currentLocationId: "SHF-001",
  },
  {
    id: "EQ-DEMO-006",
    name: "Ryoba Electric Lawn Mower",
    brand: "Ryoba",
    model: "RY1400-LM",
    category: "garden",
    subcategory: "lawn_mowers",
    powerSource: "corded",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 1200,
    totalStock: 3,
    currentLocationId: "LDS-003",
  },
  {
    id: "EQ-DEMO-007",
    name: "Stillo Petrol Grass Trimmer",
    brand: "Stillo",
    model: "ST45-GT",
    category: "garden",
    subcategory: "grass_trimmers",
    powerSource: "petrol",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 1400,
    totalStock: 2,
    currentLocationId: "MAN-003",
  },
  {
    id: "EQ-DEMO-008",
    name: "Einhart 2500W Inverter Generator",
    brand: "Einhart",
    model: "EH2500-IG",
    category: "generators",
    subcategory: "inverter_generators",
    powerSource: "petrol",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 2200,
    totalStock: 2,
    currentLocationId: "LDS-001",
  },
  {
    id: "EQ-DEMO-009",
    name: "Stanwell 24L Air Compressor",
    brand: "Stanwell",
    model: "SW24-AC",
    category: "compressors",
    subcategory: "portable_compressors",
    powerSource: "corded",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 1300,
    totalStock: 2,
    currentLocationId: "MAN-001",
  },
  {
    id: "EQ-DEMO-010",
    name: "Makiro 18V 5Ah Battery",
    brand: "Makiro",
    model: "MX18-B50",
    category: "batteries_chargers",
    subcategory: "batteries",
    powerSource: "battery",
    batteryPlatform: "makiro_18v",
    batteryIncluded: false,
    dailyPricePence: 300,
    totalStock: 8,
    currentLocationId: "LDS-001",
  },
  {
    id: "EQ-DEMO-011",
    name: "Makiro 18V Battery Charger",
    brand: "Makiro",
    model: "MX18-CH",
    category: "batteries_chargers",
    subcategory: "chargers",
    powerSource: "corded",
    batteryPlatform: "makiro_18v",
    batteryIncluded: false,
    dailyPricePence: 200,
    totalStock: 5,
    currentLocationId: "LDS-001",
  },
  {
    id: "EQ-DEMO-012",
    name: "Solario Portable Solar Charger",
    brand: "Solario",
    model: "SOL120",
    category: "solar_energy",
    subcategory: "solar_chargers",
    powerSource: "solar",
    batteryPlatform: null,
    batteryIncluded: false,
    dailyPricePence: 900,
    totalStock: 3,
    currentLocationId: "SHF-001",
  },
];

async function main() {
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${applyChanges ? "WRITE" : "PREVIEW"}`);
  console.log(`Products: ${equipment.length}`);

  const ids = equipment.map((item) => item.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate equipment IDs detected.");
  }

  for (const item of equipment) {
    if (
      !Number.isInteger(item.dailyPricePence) ||
      item.dailyPricePence < 0 ||
      !Number.isInteger(item.totalStock) ||
      item.totalStock < 0
    ) {
      throw new Error(`Invalid price or stock: ${item.id}`);
    }

    console.log(
      `${item.id} | ${item.name} | ` +
      `${item.currentLocationId} | ` +
      `£${(item.dailyPricePence / 100).toFixed(2)}/day`
    );
  }

  if (!applyChanges) {
    console.log("\nPREVIEW ONLY — no Firestore writes performed.");
    console.log("Use --apply to import the products.");
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set."
    );
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });

  const db = getFirestore();

  const collection = db.collection("equipment");

  // Prevent accidental overwriting of any existing document.
  const references = equipment.map((item) =>
    collection.doc(item.id)
  );

  const existing = await db.getAll(...references);

  const conflicts = existing.filter((snapshot) => snapshot.exists);

  if (conflicts.length > 0) {
    throw new Error(
      "Import cancelled. These IDs already exist: " +
      conflicts.map((snapshot) => snapshot.id).join(", ")
    );
  }

  const batch = db.batch();

  for (const item of equipment) {
    const { id, ...data } = item;

    batch.create(collection.doc(id), {
      ...data,

      libraryId: data.currentLocationId,

      description: `Demonstration listing: ${data.name}`,

      ownership: "greenshare",
      ownerId: null,

      condition: "B",

      approvalStatus: "approved",
      active: true,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  console.log(
    `\nSUCCESS: Imported ${equipment.length} products.`
  );
}

main().catch((error) => {
  console.error("IMPORT FAILED:", error.message);
  process.exitCode = 1;
});