
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Category = "All" | "Tools" | "Gardening" | "Sustainability";

type EquipmentOffer = {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  icon: string;
  description: string;
  condition: string;
  pricePerDay: number;
};

const offers: EquipmentOffer[] = [
  {
    id: 1,
    name: "Cordless Drill",
    category: "Tools",
    icon: "🔩",
    description: "Perfect for DIY and home improvements.",
    condition: "Good",
    pricePerDay: 5,
  },
  {
    id: 2,
    name: "Professional Drill",
    category: "Tools",
    icon: "🛠️",
    description: "Professional equipment for demanding jobs.",
    condition: "Excellent",
    pricePerDay: 15,
  },
  {
    id: 3,
    name: "Garden Tool Set",
    category: "Gardening",
    icon: "🌱",
    description: "Everything you need for garden maintenance.",
    condition: "Very Good",
    pricePerDay: 7,
  },
  {
    id: 4,
    name: "Electric Lawn Mower",
    category: "Gardening",
    icon: "🌿",
    description: "Make maintaining your garden easier.",
    condition: "Good",
    pricePerDay: 12,
  },
  {
    id: 5,
    name: "Energy Monitor",
    category: "Sustainability",
    icon: "⚡",
    description: "Understand your household energy usage.",
    condition: "Excellent",
    pricePerDay: 4,
  },
  {
    id: 6,
    name: "Portable Solar Charger",
    category: "Sustainability",
    icon: "☀️",
    description: "Explore practical renewable energy solutions.",
    condition: "Very Good",
    pricePerDay: 8,
  },
];

const promotions = [
  {
    title: "Tools for every project",
    description:
      "From small DIY repairs to bigger home improvements.",
    category: "Tools" as Category,
    icon: "🛠️",
    background: "from-emerald-800 to-green-600",
  },
  {
    title: "Give your garden some love",
    description:
      "Find gardening equipment without buying everything.",
    category: "Gardening" as Category,
    icon: "🌱",
    background: "from-lime-700 to-emerald-600",
  },
  {
    title: "Make sustainable choices",
    description:
      "Explore equipment that helps reduce waste and energy use.",
    category: "Sustainability" as Category,
    icon: "☀️",
    background: "from-teal-800 to-cyan-700",
  },
];

const categories: Category[] = [
  "All",
  "Tools",
  "Gardening",
  "Sustainability",
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getPriceRange(category: Category) {
  const matchingOffers =
    category === "All"
      ? offers
      : offers.filter((offer) => offer.category === category);

  if (matchingOffers.length === 0) {
    return "No prices available";
  }

  const prices = matchingOffers.map((offer) => offer.pricePerDay);

  return `${formatPrice(Math.min(...prices))}–${formatPrice(
    Math.max(...prices)
  )}/day`;
}

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveSlide((previous) => (previous + 1) % promotions.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [paused]);

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.name.toLowerCase().includes(search.toLowerCase()) ||
      offer.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || offer.category === category;

    return matchesSearch && matchesCategory;
  });

  const promotion = promotions[activeSlide];

  function selectPromotion(index: number) {
    setActiveSlide(index);
    setPaused(true);
  }

  function browseCategory(selectedCategory: Category) {
    setCategory(selectedCategory);
    setSearch("");

    document
      .getElementById("equipment")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold text-emerald-800"
          >
            <span aria-hidden="true">🌿</span>
            GreenShare
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 md:flex"
          >
            <a href="#equipment" className="hover:text-emerald-700">
              Browse Equipment
            </a>
            <a href="#how-it-works" className="hover:text-emerald-700">
              How It Works
            </a>
            <a href="#about" className="hover:text-emerald-700">
              About
            </a>
            <a href="#contact" className="hover:text-emerald-700">
              Contact
            </a>
            <Link
              href="/login"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800"
            >
              Sign in
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-lg border border-emerald-200 px-3 py-2 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
              ["Browse Equipment", "#equipment"],
              ["How It Works", "#how-it-works"],
              ["About", "#about"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}

            <Link
              href="/login"
              className="font-semibold text-emerald-700"
            >
              Sign in
            </Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-100 via-green-50 to-stone-100">
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
              Borrow the equipment you need, save money and make
              sustainable choices together with your community.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#equipment"
                className="rounded-xl bg-emerald-700 px-7 py-4 font-semibold text-white shadow-md hover:bg-emerald-800"
              >
                Explore equipment
              </a>

              <a
                href="#how-it-works"
                className="rounded-xl border border-emerald-700 px-7 py-4 font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white/60 p-8 shadow-xl">
            <div className="text-center">
              <div className="text-8xl" aria-hidden="true">
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

      {/* Promotional carousel */}
      <section
        aria-label="Featured equipment categories"
        className="mx-auto max-w-7xl px-5 py-16"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-semibold text-emerald-700">
              Discover GreenShare
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Featured categories
            </h2>
          </div>

          <span className="rounded-full bg-amber-100 px-3 py-2 text-xs text-amber-900">
            Illustrative demo prices
          </span>
        </div>

        <div
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${promotion.background} p-8 text-white shadow-lg md:p-14`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
        >
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
                Featured collection
              </p>

              <h3 className="mt-4 text-3xl font-bold md:text-4xl">
                {promotion.title}
              </h3>

              <p className="mt-4 text-white/85">
                {promotion.description}
              </p>

              <p className="mt-6 text-2xl font-bold">
                {getPriceRange(promotion.category)}
              </p>

              <button
                type="button"
                onClick={() => browseCategory(promotion.category)}
                className="mt-7 rounded-lg bg-white px-6 py-3 font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                Browse offers
              </button>
            </div>

            <div
              className="text-center text-8xl md:text-9xl"
              aria-hidden="true"
            >
              {promotion.icon}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-3">
            {promotions.map((slide, index) => (
              <button
                key={slide.category}
                type="button"
                onClick={() => selectPromotion(index)}
                aria-label={`Show promotion ${index + 1}`}
                aria-current={activeSlide === index ? "true" : undefined}
                className={`h-3 rounded-full transition-all ${
                  activeSlide === index
                    ? "w-9 bg-white"
                    : "w-3 bg-white/50"
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setPaused(!paused)}
              className="text-xs text-white/80 underline hover:text-white"
            >
              {paused ? "Resume slideshow" : "Pause slideshow"}
            </button>
          </div>
        </div>
      </section>

      {/* Equipment catalogue */}
      <section id="equipment" className="bg-white py-20 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-10 text-center">
            <p className="font-semibold text-emerald-700">
              Find what you need
            </p>

            <h2 className="mt-2 text-4xl font-bold">
              Explore equipment
            </h2>

            <p className="mt-4 text-slate-500">
              Browse example listings without creating an account.
            </p>
          </div>

          <div className="mx-auto mb-8 max-w-3xl">
            <label htmlFor="equipment-search" className="sr-only">
              Search equipment
            </label>

            <input
              id="equipment-search"
              type="search"
              placeholder="Search for drills, gardening tools, energy monitors..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-5 py-4 shadow-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  category === item
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOffers.map((offer) => (
              <article
                key={offer.id}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-emerald-50 to-stone-100 text-7xl">
                  <span aria-hidden="true">{offer.icon}</span>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {offer.category}
                    </span>

                    <span className="text-xs text-slate-500">
                      {offer.condition}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold">
                    {offer.name}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm text-slate-500">
                    {offer.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold text-emerald-800">
                        {formatPrice(offer.pricePerDay)}
                      </p>
                      <p className="text-xs text-slate-500">
                        per day · example price
                      </p>
                    </div>

                    <Link
                      href="/login"
                      className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Sign in to borrow
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredOffers.length === 0 && (
            <div className="rounded-xl bg-slate-50 p-10 text-center">
              <h3 className="text-lg font-semibold">
                No matching equipment
              </h3>
              <p className="mt-2 text-slate-500">
                Try another search term or category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="mt-5 font-semibold text-emerald-700 underline"
              >
                Clear filters
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Demonstration catalogue. Live inventory, availability and
            approved community listings will be integrated later.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-24 bg-emerald-50 py-20"
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
                  "Browse equipment and compare available borrowing options.",
              },
              {
                icon: "📅",
                title: "2. Reserve",
                description:
                  "Sign in and select an available item and borrowing date.",
              },
              {
                icon: "🤝",
                title: "3. Borrow",
                description:
                  "Arrange collection through the equipment library.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-2xl bg-white p-8 text-center shadow-sm"
              >
                <div className="text-5xl" aria-hidden="true">
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

      {/* About */}
      <section id="about" className="scroll-mt-24 bg-white py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 md:grid-cols-2">
          <div>
            <p className="font-semibold text-emerald-700">
              About our community
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              Better access. Less waste.
            </h2>

            <p className="mt-6 leading-relaxed text-slate-600">
              GreenShare is a community tool library concept that
              encourages people to borrow equipment instead of
              purchasing items they may only need occasionally.
            </p>

            <p className="mt-4 leading-relaxed text-slate-600">
              Community members will also be able to submit equipment
              listings for administrator approval, helping expand
              the range of items available to borrow.
            </p>
          </div>

          <div className="rounded-3xl bg-emerald-100 p-12 text-center">
            <span className="text-8xl" aria-hidden="true">
              ♻️
            </span>
            <h3 className="mt-6 text-2xl font-bold text-emerald-900">
              Share resources.
            </h3>
            <p className="mt-3 text-emerald-800">
              Build a more sustainable community.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="scroll-mt-24 bg-slate-900 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl px-5 text-center">
          <h2 className="text-4xl font-bold">
            Get in touch
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Have questions about GreenShare, equipment borrowing or
            community listings? Contact information and the enquiry
            service will be added during the next development stages.
          </p>

          <div className="mt-9 flex justify-center gap-4">
            <a
              href="#equipment"
              className="rounded-lg bg-emerald-600 px-7 py-3 font-semibold hover:bg-emerald-700"
            >
              Explore equipment
            </a>

            <Link
              href="/login"
              className="rounded-lg border border-slate-400 px-7 py-3 font-semibold hover:bg-slate-800"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 px-5 py-8 text-center text-sm text-slate-400">
        <p className="font-semibold text-white">
          🌿 GreenShare Community Tool Library
        </p>
        <p className="mt-2">
          Academic demonstration project · 2026
        </p>
        <p className="mt-2">
          Equipment and prices shown are illustrative.
        </p>
      </footer>
    </div>
  );
}
