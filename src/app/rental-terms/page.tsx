"use client";

import { useState } from "react";
import Link from "next/link";

import { RENTAL_TERMS_VERSION } from "@/lib/rental-constants";

// ======================================================
// GREENSHARE — RENTAL TERMS & CONDITIONS
// ======================================================

const RENTAL_DATES = [
  { value: "2027-02-01", label: "1 February 2027" },
  { value: "2027-02-02", label: "2 February 2027" },
  { value: "2027-02-03", label: "3 February 2027" },
];

interface TermsSection {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
}

interface CloseTermsButtonProps {
  onClick: () => void;
  compact?: boolean;
}

// ======================================================
// CLOSE TERMS BUTTON
// Declared outside the page component.
// ======================================================

function CloseTermsButton({
  onClick,
  compact = false,
}: CloseTermsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        compact
          ? "rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          : "inline-flex rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800"
      }
    >
      Close Terms &amp; Return to Reservation
    </button>
  );
}

// ======================================================
// RENTAL TERMS CONTENT
// ======================================================

const termsSections: TermsSection[] = [
  {
    id: "eligibility",
    title: "1. Eligibility and Reservations",
    paragraphs: [
      "GreenShare provides equipment rental services through its network of participating collection points.",
      "Customers must hold an active GreenShare account to reserve equipment.",
    ],
    items: [
      "Customers must provide accurate account and reservation information.",
      "Reservations are subject to equipment availability.",
      "Only approved and operational equipment may be rented.",
      "GreenShare may refuse to release equipment where a safety concern has been identified.",
      "Customers must not transfer their reservation to another person without permission.",
    ],
  },
  {
    id: "rental-period",
    title: "2. Rental Period",
    paragraphs: [
      "The rental period begins on the selected rental start date.",
      "Customers select the number of rental days when making a reservation.",
      "The total rental price is calculated using the equipment's daily rental rate, the number of units and the selected rental duration.",
    ],
    items: [
      "A rental day is a calendar day.",
      "The final rental day is included in the rental price.",
      "The return deadline falls on the following calendar day at 15:00.",
      "Customers must return equipment within the agreed rental period.",
      "Extensions require GreenShare approval and are subject to availability.",
    ],
  },
  {
    id: "collection",
    title: "3. Equipment Collection",
    paragraphs: [
      "Equipment must be collected from the location specified in the confirmed reservation.",
    ],
    items: [
      "Customers should inspect the equipment before accepting it.",
      "Visible damage or missing accessories should be reported immediately.",
      "GreenShare may record equipment condition at collection.",
      "Customers must follow the collection point's opening hours and instructions.",
      "Equipment must not be collected by an unauthorised person.",
    ],
  },
  {
    id: "returns",
    title: "4. Equipment Returns",
    paragraphs: [
      "Equipment must be returned by 15:00 UK local time on the calendar day following the final paid rental day.",
    ],
    items: [
      "GreenShare-owned equipment may be returned to the active collection point specified in the reservation.",
      "Community-owned equipment must be returned to its designated original collection point.",
      "All supplied accessories must be returned with the equipment.",
      "Equipment should be returned in a reasonably clean condition.",
      "The equipment remains the borrower's responsibility until its return has been acknowledged by GreenShare.",
      "A customer who cannot meet the deadline must contact GreenShare as soon as possible.",
    ],
  },
  {
    id: "late-returns",
    title: "5. Late Returns and Additional Charges",
    paragraphs: [
      "Late returns can prevent other customers from accessing equipment and may result in additional charges.",
    ],
    items: [
      "The agreed return deadline is 15:00 on the day following the final rental day.",
      "For each additional commenced 24-hour period after the return deadline, an additional charge equivalent to one daily rental rate may apply.",
      "For reservations containing multiple units, the additional charge is calculated using the daily rate multiplied by the number of overdue units.",
      "Any late-return charge must be reasonable and must not duplicate compensation for the same loss.",
      "GreenShare may waive or reduce charges where circumstances justify doing so.",
      "Repeated late returns may lead to temporary restrictions on future reservations.",
      "Any additional charges will be communicated to the customer and reviewed before collection.",
    ],
  },
  {
    id: "damage",
    title: "6. Equipment Damage",
    paragraphs: [
      "Customers are responsible for taking reasonable care of borrowed equipment.",
      "Customers may be responsible for damage resulting from misuse, negligence, improper storage or unauthorised modifications.",
    ],
    items: [
      "Normal wear and tear resulting from proper equipment use is not chargeable.",
      "Damage should be reported immediately after it is discovered.",
      "Customers must stop using equipment that becomes unsafe.",
      "GreenShare may inspect damaged equipment and document its condition.",
      "Where the customer is responsible, reasonable repair costs may be charged.",
      "If repair is not economically reasonable, compensation may be based on the equipment's fair replacement value, taking age and condition into account.",
      "Customers will have an opportunity to review and dispute proposed damage charges.",
      "GreenShare will not charge more than a reasonable amount necessary to address the proven loss.",
    ],
  },
  {
    id: "lost-equipment",
    title: "7. Lost or Stolen Equipment",
    paragraphs: [
      "Customers must take reasonable steps to prevent equipment from being lost or stolen.",
    ],
    items: [
      "Loss or theft must be reported to GreenShare promptly.",
      "Customers may be asked to provide relevant information about the incident.",
      "Where appropriate, theft should also be reported to the police.",
      "If the customer is responsible for the loss, reasonable compensation may be requested.",
      "Compensation will consider the equipment's age, condition and fair replacement value.",
      "GreenShare will consider the circumstances before determining responsibility.",
    ],
  },
  {
    id: "safety",
    title: "8. Safe Equipment Use",
    paragraphs: [
      "All equipment must be used safely and only for its intended purpose.",
    ],
    items: [
      "Read the manufacturer's operating instructions.",
      "Use appropriate protective equipment.",
      "Do not operate equipment while impaired by alcohol or drugs.",
      "Do not allow children or unauthorised persons to use borrowed equipment.",
      "Do not modify safety mechanisms.",
      "Do not attempt repairs without GreenShare's permission.",
      "Stop using equipment immediately if a safety defect is identified.",
      "Report accidents and safety concerns promptly.",
    ],
  },
  {
    id: "batteries",
    title: "9. Batteries, Chargers and Accessories",
    paragraphs: [
      "Certain tools require compatible batteries, chargers or accessories.",
    ],
    items: [
      "Customers must check accessory compatibility before use.",
      "Batteries and chargers may be rented separately.",
      "Customers must use compatible charging equipment.",
      "Damaged batteries must not be charged or operated.",
      "All rented accessories must be returned together with their associated equipment, unless separate reservations specify otherwise.",
      "Missing or damaged accessories may result in reasonable replacement charges where the customer is responsible.",
    ],
  },
  {
    id: "cancellation",
    title: "10. Reservation Cancellation",
    paragraphs: [
      "Customers should cancel reservations they no longer require.",
    ],
    items: [
      "Reservations may be cancelled before collection using the available GreenShare cancellation process.",
      "Cancellation after equipment collection may require direct assistance from GreenShare.",
      "Cancelling a reservation does not confirm the physical return of equipment.",
      "GreenShare may cancel reservations where equipment becomes unavailable or unsafe.",
      "Customers will be informed when a reservation is cancelled by GreenShare.",
    ],
  },
  {
    id: "pricing",
    title: "11. Rental Prices and Payments",
    paragraphs: [
      "Rental prices are displayed in pounds sterling (GBP).",
    ],
    items: [
      "The daily rental rate is displayed before confirmation.",
      "The total rental price reflects the selected rental duration and quantity.",
      "Additional charges may arise from late returns, loss or customer-responsible damage.",
      "Additional charges must be reasonable and supported by the relevant circumstances.",
      "The current reservation form does not collect online payments.",
      "No payment is automatically taken when a reservation is submitted.",
    ],
  },
  {
    id: "inspection",
    title: "12. Equipment Inspection",
    paragraphs: [
      "GreenShare may inspect equipment before collection and following its return.",
    ],
    items: [
      "Equipment condition may be recorded using photographs and inspection notes.",
      "Damage reported before collection will not automatically be attributed to the borrower.",
      "Customers may report disagreements with an inspection result.",
      "Equipment that fails safety checks may be withdrawn from circulation.",
      "Inspection findings may be used when assessing repair or replacement costs.",
    ],
  },
  {
    id: "disputes",
    title: "13. Complaints and Disputes",
    paragraphs: [
      "GreenShare aims to handle complaints fairly and transparently.",
    ],
    items: [
      "Customers may challenge a late-return, loss or damage assessment.",
      "GreenShare will review relevant reservation records and inspection evidence.",
      "Customers may provide additional information supporting their position.",
      "Disputed charges should be reviewed before any collection action is taken.",
      "Nothing in these terms removes rights provided by applicable consumer protection law.",
    ],
  },
  {
    id: "agreement",
    title: "14. Acceptance of Terms",
    paragraphs: [
      "Customers must read and accept these Rental Terms & Conditions before confirming a reservation.",
      "The reservation system records the accepted terms version.",
      "The terms applicable to a reservation are those accepted when that reservation was confirmed.",
    ],
  },
];

// ======================================================
// DATE HELPERS
// ======================================================

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getMaximumDuration(startDate: string): number {
  const index = RENTAL_DATES.findIndex(
    (item) => item.value === startDate
  );

  if (index < 0) {
    return 1;
  }

  return RENTAL_DATES.length - index;
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function RentalTermsPage() {
  const [startDate, setStartDate] = useState(
    "2027-02-01"
  );

  const [rentalDays, setRentalDays] = useState(1);

  const [showCloseHelp, setShowCloseHelp] =
    useState(false);

  const maximumDuration =
    getMaximumDuration(startDate);

  const start = parseDate(startDate);

  const finalRentalDay = addDays(
    start,
    rentalDays - 1
  );

  const returnDate = addDays(
    finalRentalDay,
    1
  );

  function handleStartDateChange(value: string) {
    setStartDate(value);

    const allowedDuration =
      getMaximumDuration(value);

    setRentalDays((current) =>
      Math.min(current, allowedDuration)
    );
  }

  // ----------------------------------------------------
  // CLOSE TERMS TAB
  // ----------------------------------------------------

  function handleCloseTerms() {
    window.close();

    // Display fallback guidance if the browser
    // does not allow this tab to close.
    setShowCloseHelp(true);
  }

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        {/* NAVIGATION */}

        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <CloseTermsButton
            compact
            onClick={handleCloseTerms}
          />

          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-emerald-700"
          >
            GreenShare Home
          </Link>
        </div>

        {/* CLOSE HELP */}

        {showCloseHelp && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
          >
            <p className="font-bold">
              Your browser may have blocked automatic
              tab closing.
            </p>

            <p className="mt-2 leading-7">
              Close this tab using{" "}
              <kbd className="rounded border border-amber-300 bg-white px-2 py-1 font-mono text-sm">
                Ctrl + W
              </kbd>
              . Your original reservation form will
              remain open in the previous tab.
            </p>
          </div>
        )}

        {/* DOCUMENT */}

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}

          <header className="border-b border-emerald-100 bg-emerald-50 px-6 py-8 sm:px-10">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              GreenShare Community Tool Library
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Rental Terms &amp; Conditions
            </h1>

            <p className="mt-4 leading-7 text-slate-700">
              Please read these terms carefully before
              renting equipment from GreenShare.
              They explain rental periods, return
              deadlines, additional charges and
              your responsibilities as a borrower.
            </p>

            <div className="mt-6 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
              Terms Version {RENTAL_TERMS_VERSION}
            </div>
          </header>

          {/* RETURN POLICY */}

          <section className="px-6 pt-8 sm:px-10">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <h2 className="text-xl font-bold text-amber-950">
                Important Return Policy
              </h2>

              <p className="mt-3 leading-7 text-amber-900">
                All equipment must be returned by{" "}
                <strong>15:00 (3:00 PM)</strong> on the
                calendar day following the final
                paid rental day.
              </p>

              <p className="mt-2 text-sm text-amber-900">
                Late returns may result in additional
                rental charges.
              </p>
            </div>
          </section>

          {/* INTERACTIVE DATE CALCULATOR */}

          <section className="px-6 pt-8 sm:px-10">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-bold">
                Rental Period Calculator
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Select a start date and rental duration
                to see how the return deadline is
                calculated.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {/* START DATE */}

                <label className="block text-sm font-semibold">
                  Rental Start Date

                  <select
                    value={startDate}
                    onChange={(event) =>
                      handleStartDateChange(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                  >
                    {RENTAL_DATES.map((date) => (
                      <option
                        key={date.value}
                        value={date.value}
                      >
                        {date.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* DURATION */}

                <label className="block text-sm font-semibold">
                  Rental Duration

                  <select
                    value={rentalDays}
                    onChange={(event) =>
                      setRentalDays(
                        Number(event.target.value)
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                  >
                    {Array.from(
                      { length: maximumDuration },
                      (_, index) => index + 1
                    ).map((days) => (
                      <option
                        key={days}
                        value={days}
                      >
                        {days}{" "}
                        {days === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* CALCULATED RESULTS */}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-slate-500">
                    Final Rental Day
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {formatDate(finalRentalDay)}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-800">
                    Return Deadline
                  </p>

                  <p className="mt-2 text-lg font-bold text-emerald-800">
                    {formatDate(returnDate)}
                  </p>

                  <p className="mt-1 font-bold text-emerald-800">
                    15:00
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                This calculator illustrates the return
                policy. Your confirmed reservation
                determines the actual rental period
                and return deadline.
              </p>
            </div>
          </section>

          {/* LATE RETURN CHARGES */}

          <section className="px-6 pt-8 sm:px-10">
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h2 className="text-xl font-bold text-red-900">
                Late Returns &amp; Damage Charges
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <h3 className="font-bold text-red-950">
                    Late Return
                  </h3>

                  <p className="mt-2 leading-7 text-red-900">
                    An additional charge equivalent
                    to the applicable daily rental
                    rate may be applied for each
                    commenced 24-hour period after
                    the agreed return deadline.
                    Charges will be assessed fairly
                    and will not exceed reasonable
                    compensation for the relevant loss.
                  </p>
                </div>

                <div className="border-t border-red-200 pt-5">
                  <h3 className="font-bold text-red-950">
                    Equipment Damage
                  </h3>

                  <p className="mt-2 leading-7 text-red-900">
                    Customers may be charged
                    reasonable repair costs for
                    damage caused by misuse or
                    negligence. Normal wear and tear
                    is excluded.
                  </p>
                </div>

                <div className="border-t border-red-200 pt-5">
                  <h3 className="font-bold text-red-950">
                    Equipment Loss
                  </h3>

                  <p className="mt-2 leading-7 text-red-900">
                    If equipment is lost and the
                    borrower is responsible,
                    compensation may be calculated
                    using its fair replacement value,
                    taking age and condition into
                    account.
                  </p>
                </div>

                <p className="border-t border-red-200 pt-4 text-sm text-red-800">
                  Additional charges are not
                  automatically collected by the
                  reservation form and require
                  separate assessment.
                </p>
              </div>
            </div>
          </section>

          {/* TERMS SECTIONS */}

          <div className="space-y-10 px-6 py-10 sm:px-10">
            {termsSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-8"
              >
                <h2 className="text-xl font-bold text-slate-950">
                  {section.title}
                </h2>

                {section.paragraphs?.map(
                  (paragraph, index) => (
                    <p
                      key={`${section.id}-p-${index}`}
                      className="mt-3 leading-7 text-slate-700"
                    >
                      {paragraph}
                    </p>
                  )
                )}

                {section.items && (
                  <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700 marker:text-emerald-700">
                    {section.items.map(
                      (item, index) => (
                        <li
                          key={`${section.id}-item-${index}`}
                        >
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </section>
            ))}

            {/* CONSUMER RIGHTS */}

            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-bold text-emerald-950">
                Consumer Rights
              </h2>

              <p className="mt-3 leading-7 text-emerald-900">
                Nothing in these terms limits
                or excludes any statutory rights
                that cannot lawfully be excluded.
                Any charges arising from damage,
                loss or late returns must be
                assessed fairly and reasonably.
              </p>
            </section>
          </div>

          {/* FOOTER */}

          <footer className="border-t border-slate-200 bg-slate-50 px-6 py-7 sm:px-10">
            <p className="text-sm font-semibold text-slate-700">
              GreenShare Rental Terms &amp; Conditions
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Version {RENTAL_TERMS_VERSION}
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              By confirming a reservation, you
              acknowledge that you have read
              and accepted these terms.
            </p>

            <div className="mt-6">
              <CloseTermsButton
                onClick={handleCloseTerms}
              />
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}