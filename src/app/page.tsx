"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthNavigation from "@/components/AuthNavigation";

import type {
  Equipment,
  EquipmentCategory,
  Library,
} from "@/types";

import {
  EQUIPMENT_CATEGORY_LABELS,
  formatPriceGBP,
} from "@/types";

// ======================================================
// GREENSHARE — PUBLIC HOMEPAGE
// ======================================================

type CategoryFilter = EquipmentCategory | "all";

interface Promotion {
  title: string;
  description: string;
  icon: string;
  category: CategoryFilter;
  background: string;
}

const promotions: Promotion[] = [
  {
    title: "Power Tools for Every Project",
    description:
      "Explore cordless drills, impact drivers, grinders and more.",
    icon: "🛠️",
    category: "power_tools",
    background: "from-emerald-800 to-green-600",
  },
  {
    title: "Garden Equipment",
    description:
      "Find equipment for maintaining and improving your garden.",
    icon: "🌿",
    category: "garden",
    background: "from-lime-700 to-emerald-600",
  },
  {
    title: "Generators and Compressors",
    description:
      "Discover practical equipment for demanding projects.",
    icon: "⚡",
    category: "generators",
    background: "from-teal-800 to-cyan-700",
  },
  {
    title: "Batteries and Chargers",
    description:
      "Rent compatible batteries and chargers separately.",
    icon: "🔋",
    category: "batteries_chargers",
    background: "from-green-800 to-teal-600",
  },
];

const ALL_CITIES = "all";
const ALL_LOCATIONS = "all";

// ======================================================
// HELPERS
// ======================================================

function getConditionLabel(
  condition: Equipment["condition"]
): string {
  switch (condition) {
    case "A":
      return "Grade A — Excellent";
    case "B":
      return "Grade B — Good";
    case "C":
      return "Grade C — Used";
    default:
      return "Not graded";
  }
}

function getPowerSourceLabel(
  powerSource: Equipment["powerSource"]
): string {
  switch (powerSource) {
    case "battery":
      return "Battery powered";
    case "corded":
      return "Corded";
    case "petrol":
      return "Petrol";
    case "diesel":
      return "Diesel";
    case "solar":
      return "Solar";
    case "manual":
      return "Manual";
    default:
      return "Other";
  }
}

function getCategoryIcon(
  category: EquipmentCategory
): string {
  const icons: Record<EquipmentCategory, string> = {
    power_tools: "🛠️",
    garden: "🌿",
    generators: "⚡",
    compressors: "🔧",
    batteries_chargers: "🔋",
    solar_energy: "☀️",
  };

  return icons[category] ?? "📦";
}

function getPriceRange(
  equipment: Equipment[],
  category: CategoryFilter
): string {
  const matching = equipment.filter(
    (item) =>
      category === "all" ||
      item.category === category
  );

  if (matching.length === 0) {
    return "Explore our catalogue";
  }

  const prices = matching.map(
    (item) => item.dailyPricePence
  );

  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);

  if (minimum === maximum) {
    return `${formatPriceGBP(minimum)}/day`;
  }

  return (
    `${formatPriceGBP(minimum)}–` +
    `${formatPriceGBP(maximum)}/day`
  );
}

// ======================================================
// HOMEPAGE
// ======================================================

export default function HomePage() {
  const {
    loading: authLoading,
    isAuthenticated,
    profile,
  } = useAuth();

  const [libraries, setLibraries] =
    useState<Library[]>([]);

  const [equipment, setEquipment] =
    useState<Equipment[]>([]);

  const [selectedCity, setSelectedCity] =
    useState(ALL_CITIES);

  const [selectedLocation, setSelectedLocation] =
    useState(ALL_LOCATIONS);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");

  const [search, setSearch] = useState("");

  const [activeSlide, setActiveSlide] = useState(0);

  const [carouselPaused, setCarouselPaused] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ----------------------------------------------------
  // FIRESTORE DATA
  // ----------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const librariesQuery = query(
          collection(db, "libraries"),
          where("active", "==", true)
        );

        const equipmentQuery = query(
          collection(db, "equipment"),
          where("active", "==", true),
          where("approvalStatus", "==", "approved")
        );

        const [
          librariesSnapshot,
          equipmentSnapshot,
        ] = await Promise.all([
          getDocs(librariesQuery),
          getDocs(equipmentQuery),
        ]);

        if (cancelled) return;

        const loadedLibraries: Library[] =
          librariesSnapshot.docs.map((document) => ({
            ...(document.data() as Omit<Library, "id">),
            id: document.id,
          }));

        const loadedEquipment: Equipment[] =
          equipmentSnapshot.docs.map((document) => ({
            ...(document.data() as Omit<Equipment, "id">),
            id: document.id,
          }));

        loadedLibraries.sort(
          (a, b) =>
            a.city.localeCompare(b.city) ||
            a.name.localeCompare(b.name)
        );

        loadedEquipment.sort(
          (a, b) => a.name.localeCompare(b.name)
        );

        setLibraries(loadedLibraries);
        setEquipment(loadedEquipment);
      } catch (err) {
        console.error(
          "Firestore loading error:",
          err
        );

        if (!cancelled) {
          setError(
            "Unable to load the catalogue. Please try again later."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------
  // PROMOTIONAL CAROUSEL
  // ----------------------------------------------------

  useEffect(() => {
    if (carouselPaused) return;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSlide(
        (previous) =>
          (previous + 1) % promotions.length
      );
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [carouselPaused]);

  // ----------------------------------------------------
  // FILTERS
  // ----------------------------------------------------

  const cities = useMemo(
    () =>
      Array.from(
        new Set(libraries.map((item) => item.city))
      ).sort(),
    [libraries]
  );

  const availableLocations = useMemo(
    () =>
      libraries.filter(
        (item) =>
          selectedCity === ALL_CITIES ||
          item.city === selectedCity
      ),
    [libraries, selectedCity]
  );

  const locationsById = useMemo(
    () =>
      new Map(
        libraries.map((library) => [
          library.id,
          library,
        ])
      ),
    [libraries]
  );

  const filteredEquipment = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const matchingLocationIds = new Set(
      availableLocations.map((item) => item.id)
    );

    return equipment.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm) ||
        item.description
          .toLowerCase()
          .includes(searchTerm) ||
        item.brand.toLowerCase().includes(searchTerm) ||
        item.model.toLowerCase().includes(searchTerm);

      const matchesCategory =
        selectedCategory === "all" ||
        item.category === selectedCategory;

      const matchesCity =
        selectedCity === ALL_CITIES ||
        matchingLocationIds.has(
          item.currentLocationId
        );

      const matchesLocation =
        selectedLocation === ALL_LOCATIONS ||
        item.currentLocationId ===
          selectedLocation;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCity &&
        matchesLocation
      );
    });
  }, [
    equipment,
    search,
    selectedCategory,
    selectedCity,
    selectedLocation,
    availableLocations,
  ]);

  const selectedPromotion = promotions[activeSlide];

  function browseCategory(category: CategoryFilter) {
    setSelectedCategory(category);

    document
      .getElementById("equipment")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory("all");
    setSelectedCity(ALL_CITIES);
    setSelectedLocation(ALL_LOCATIONS);
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      {/* NAVIGATION */}

      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold text-emerald-800"
          >
            <span aria-hidden="true">🌿</span>
            GreenShare
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-6 md:flex"
          >
            <a
              href="#equipment"
              className="hover:text-emerald-700"
            >
              Equipment
            </a>

            <a
              href="#locations"
              className="hover:text-emerald-700"
            >
              Locations
            </a>

            <a
              href="#how-it-works"
              className="hover:text-emerald-700"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="hover:text-emerald-700"
            >
              About
            </a>

            <a
              href="#contact"
              className="hover:text-emerald-700"
            >
              Contact
            </a>
          </nav>

          <div className="hidden md:block">
            <AuthNavigation />
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((previous) => !previous)
            }
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            className="rounded-lg border border-emerald-200 px-3 py-2 md:hidden"
          >
            ☰
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-4 border-t bg-white px-5 py-5 md:hidden"
          >
            {[
              ["Equipment", "#equipment"],
              ["Locations", "#locations"],
              ["How It Works", "#how-it-works"],
              ["About", "#about"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() =>
                  setMobileMenuOpen(false)
                }
              >
                {label}
              </a>
            ))}

            <div className="border-t border-slate-100 pt-4">
              <AuthNavigation />
            </div>
          </nav>
        )}
      </header>

      {/* HERO */}

      <section className="bg-linear-to-br from-emerald-100 via-green-50 to-stone-100">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2">
          <div>
            <span className="rounded-full bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-900">
              Community Tool Library
            </span>

            <h1 className="mt-7 text-5xl font-bold leading-tight text-emerald-950 md:text-6xl">
              Share more.
              <br />
              Waste less.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Borrow equipment, save money and make
              sustainable choices together with your community.
            </p>

            {!authLoading && isAuthenticated && profile && (
              <p className="mt-5 rounded-xl border border-emerald-200 bg-white/70 px-5 py-3 text-emerald-900">
                Welcome back,{" "}
                <strong>{profile.username}</strong>!
              </p>
            )}

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#equipment"
                className="rounded-xl bg-emerald-700 px-7 py-4 font-semibold text-white shadow-md hover:bg-emerald-800"
              >
                Browse equipment
              </a>

              <a
                href="#locations"
                className="rounded-xl border border-emerald-700 px-7 py-4 font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Find a location
              </a>
            </div>
          </div>

          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white/60 p-8 shadow-xl">
            <div className="text-center">
              <div
                className="text-8xl"
                aria-hidden="true"
              >
                🛠️
              </div>

              <h2 className="mt-6 text-2xl font-bold text-emerald-900">
                Tools for everyone
              </h2>

              <p className="mt-3 text-slate-600">
                Find it. Borrow it. Share it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROMOTIONS */}

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-7">
          <p className="font-semibold text-emerald-700">
            Discover GreenShare
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Featured categories
          </h2>
        </div>

        <div
          className={`rounded-3xl bg-linear-to-r ${selectedPromotion.background} p-8 text-white shadow-lg md:p-14`}
          onMouseEnter={() =>
            setCarouselPaused(true)
          }
          onMouseLeave={() =>
            setCarouselPaused(false)
          }
          onFocusCapture={() =>
            setCarouselPaused(true)
          }
        >
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-3xl font-bold md:text-4xl">
                {selectedPromotion.title}
              </h3>

              <p className="mt-4 text-white/85">
                {selectedPromotion.description}
              </p>

              <p className="mt-6 text-2xl font-bold">
                {getPriceRange(
                  equipment,
                  selectedPromotion.category
                )}
              </p>

              <button
                type="button"
                onClick={() =>
                  browseCategory(
                    selectedPromotion.category
                  )
                }
                className="mt-7 rounded-lg bg-white px-6 py-3 font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                Browse offers
              </button>
            </div>

            <div
              className="text-center text-8xl md:text-9xl"
              aria-hidden="true"
            >
              {selectedPromotion.icon}
            </div>
          </div>

          <div className="mt-10 flex justify-center gap-3">
            {promotions.map((promotion, index) => (
              <button
                key={promotion.title}
                type="button"
                onClick={() => {
                  setActiveSlide(index);
                  setCarouselPaused(true);
                }}
                aria-label={`Show promotion ${index + 1}`}
                aria-current={
                  activeSlide === index
                    ? "true"
                    : undefined
                }
                className={`h-3 rounded-full ${
                  activeSlide === index
                    ? "w-9 bg-white"
                    : "w-3 bg-white/50"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setCarouselPaused(
                (previous) => !previous
              )
            }
            className="mt-5 block w-full text-center text-xs text-white/80 underline"
          >
            {carouselPaused
              ? "Resume slideshow"
              : "Pause slideshow"}
          </button>
        </div>
      </section>

      {/* EQUIPMENT CATALOGUE */}

      <section
        id="equipment"
        className="scroll-mt-24 bg-white py-20"
      >
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-10 text-center">
            <p className="font-semibold text-emerald-700">
              Equipment catalogue
            </p>

            <h2 className="mt-2 text-4xl font-bold">
              Explore equipment
            </h2>

            <p className="mt-4 text-slate-500">
              Browse approved equipment without signing in.
            </p>
          </div>

          {/* FILTERS */}

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="equipment-search"
                className="mb-2 block text-sm font-semibold"
              >
                Search equipment
              </label>

              <input
                id="equipment-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search tools, brands, models..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="city-filter"
                className="mb-2 block text-sm font-semibold"
              >
                City
              </label>

              <select
                id="city-filter"
                value={selectedCity}
                onChange={(event) => {
                  setSelectedCity(event.target.value);
                  setSelectedLocation(ALL_LOCATIONS);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value={ALL_CITIES}>
                  All cities
                </option>

                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="location-filter"
                className="mb-2 block text-sm font-semibold"
              >
                Collection point
              </label>

              <select
                id="location-filter"
                value={selectedLocation}
                onChange={(event) =>
                  setSelectedLocation(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value={ALL_LOCATIONS}>
                  All locations
                </option>

                {availableLocations.map((library) => (
                  <option
                    key={library.id}
                    value={library.id}
                  >
                    {library.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CATEGORY BUTTONS */}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedCategory("all")
              }
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                selectedCategory === "all"
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              All equipment
            </button>

            {(
              Object.entries(
                EQUIPMENT_CATEGORY_LABELS
              ) as [EquipmentCategory, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setSelectedCategory(value)
                }
                className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                  selectedCategory === value
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* LOADING AND ERRORS */}

          {loading && (
            <p
              role="status"
              className="mt-10 text-center text-slate-500"
            >
              Loading equipment...
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-10 rounded-xl bg-red-50 p-5 text-center text-red-700"
            >
              {error}
            </p>
          )}

          {/* PRODUCT CARDS */}

          {!loading && !error && (
            <>
              <p className="mt-8 text-sm text-slate-500">
                Showing {filteredEquipment.length} of{" "}
                {equipment.length} approved products
              </p>

              <div className="mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEquipment.map((item) => {
                  const library = locationsById.get(
                    item.currentLocationId
                  );

                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex h-44 items-center justify-center bg-linear-to-br from-emerald-50 to-stone-100 text-7xl">
                        <span aria-hidden="true">
                          {getCategoryIcon(
                            item.category
                          )}
                        </span>
                      </div>

                      <div className="p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {
                            EQUIPMENT_CATEGORY_LABELS[
                              item.category
                            ]
                          }
                        </p>

                        <h3 className="mt-3 text-xl font-bold">
                          {item.name}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {item.description}
                        </p>

                        <div className="mt-5 space-y-2 text-sm">
                          <p>
                            <strong>Condition:</strong>{" "}
                            {getConditionLabel(
                              item.condition
                            )}
                          </p>

                          <p>
                            <strong>Power:</strong>{" "}
                            {getPowerSourceLabel(
                              item.powerSource
                            )}
                          </p>

                          <p>
                            <strong>Stock:</strong>{" "}
                            {item.totalStock}
                          </p>

                          <p>
                            <strong>Location:</strong>{" "}
                            {library?.name ??
                              item.currentLocationId}
                          </p>

                          {item.batteryPlatform &&
                            item.category ===
                              "power_tools" && (
                              <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
                                Battery platform:{" "}
                                {item.batteryPlatform}
                                {!item.batteryIncluded &&
                                  ". Battery and charger rented separately."}
                              </p>
                            )}
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-2xl font-bold text-emerald-800">
                              {formatPriceGBP(
                                item.dailyPricePence
                              )}
                            </p>

                            <p className="text-xs text-slate-500">
                              per day
                            </p>
                          </div>

                          {authLoading ? (
                            <span className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
                              Checking session...
                            </span>
                          ) : isAuthenticated ? (
                            <Link
                              href={`/borrow?equipmentId=${encodeURIComponent(item.id)}`}
                              className="rounded-lg bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-800"
                            >
                              Reserve Equipment
                            </Link>
                          ) : (
                            <Link
                              href="/login"
                              className="rounded-lg bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                              Sign in to borrow
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredEquipment.length === 0 && (
                <div className="mt-8 rounded-xl bg-slate-50 p-10 text-center">
                  <h3 className="text-lg font-semibold">
                    No matching equipment
                  </h3>

                  <p className="mt-2 text-slate-500">
                    Try another category, city or search term.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 font-semibold text-emerald-700 underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* LOCATIONS */}

      <section
        id="locations"
        className="scroll-mt-24 bg-emerald-50 py-20"
      >
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-center text-4xl font-bold">
            GreenShare collection points
          </h2>

          <p className="mt-4 text-center text-slate-600">
            Explore our demonstration network.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {libraries.map((library) => (
              <article
                key={library.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  {library.city} · {library.id}
                </p>

                <h3 className="mt-3 text-xl font-bold">
                  {library.name}
                </h3>

                <p className="mt-3 text-sm text-slate-600">
                  {library.address}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {library.postcode}
                </p>

                {library.location && (
                  <a
                    href={
                      `https://www.openstreetmap.org/?` +
                      `mlat=${library.location.latitude}` +
                      `&mlon=${library.location.longitude}` +
                      `#map=15/${library.location.latitude}` +
                      `/${library.location.longitude}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline"
                  >
                    View approximate location
                  </a>
                )}
              </article>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Fictional collection points for academic
            demonstration purposes only.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section
        id="how-it-works"
        className="scroll-mt-24 bg-white py-20"
      >
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-center text-4xl font-bold">
            How GreenShare works
          </h2>

          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {[
              {
                icon: "🔎",
                title: "1. Find",
                description:
                  "Search equipment and select a collection point.",
              },
              {
                icon: "📅",
                title: "2. Reserve",
                description:
                  "Sign in and choose an available borrowing date.",
              },
              {
                icon: "🤝",
                title: "3. Borrow",
                description:
                  "Collect the equipment from your selected location.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-2xl bg-emerald-50 p-8 text-center"
              >
                <div
                  className="text-5xl"
                  aria-hidden="true"
                >
                  {step.icon}
                </div>

                <h3 className="mt-6 text-xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-3 text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}

      <section
        id="about"
        className="scroll-mt-24 bg-emerald-50 py-20"
      >
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-4xl font-bold">
            Better access. Less waste.
          </h2>

          <p className="mt-6 leading-relaxed text-slate-600">
            GreenShare is an academic community tool library
            project designed to encourage equipment sharing.
          </p>

          <p className="mt-4 leading-relaxed text-slate-600">
            Community-owned equipment will be inspected,
            graded and approved before appearing in the
            public catalogue.
          </p>
        </div>
      </section>

      {/* CONTACT */}

      <section
        id="contact"
        className="scroll-mt-24 bg-slate-900 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl px-5 text-center">
          <h2 className="text-4xl font-bold">
            Get in touch
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Have questions about GreenShare?
            Contact functionality will be added
            during a later development stage.
          </p>

          <div className="mt-9">
            {authLoading ? (
              <span className="text-slate-300">
                Checking session...
              </span>
            ) : isAuthenticated ? (
              <a
                href="#equipment"
                className="inline-block rounded-lg bg-emerald-600 px-7 py-3 font-semibold hover:bg-emerald-700"
              >
                Browse equipment
              </a>
            ) : (
              <Link
                href="/login"
                className="inline-block rounded-lg bg-emerald-600 px-7 py-3 font-semibold hover:bg-emerald-700"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="bg-slate-950 px-5 py-8 text-center text-sm text-slate-400">
        <p className="font-semibold text-white">
          🌿 GreenShare Community Tool Library
        </p>

        <p className="mt-2">
          Academic demonstration project · 2026
        </p>

        <p className="mt-2">
          All brands, products and locations are fictional.
        </p>
      </footer>
    </div>
  );
}
