import { useState } from "react";

import Button from "./ui/Button";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Icon from "./ui/Icon";
import Input from "./ui/Input";
import Pill from "./ui/Pill";
import SectionHeading from "./ui/SectionHeading";
import Select from "./ui/Select";
import Textarea from "./ui/Textarea";
import {
  BUDGET_OPTIONS,
  CATEGORIES,
  CONCIERGE_DESK,
  FILTER_CONTROLS,
  HERO,
  PERIOD_OPTIONS,
  PILLARS_SECTION,
  POPULAR_DESTINATIONS,
  REGION_OPTIONS,
  SERVICE_PILLARS,
  UI_COPY,
  conciergeEnquiryHref,
  openTripEnquiryHref,
  privateJourneyEnquiryHref,
  formatRupiah,
  occupancy,
} from "../data/tourCatalogue";

/**
 * Presentation for the curated tour catalogue, per the design in
 * `stitch_cakra57_travel_web_redesign/.../code.html`.
 *
 * Every string rendered here comes from `src/data/tourCatalogue.js`, which is
 * held to the design by `src/__tests__/tourCatalogue.test.js`. There is
 * deliberately no editorial copy in this file: adding a headline here would put
 * it outside the verbatim check, which is the only thing standing between the
 * design and a plausible-looking typo.
 *
 * The page keeps the admin-managed Firestore catalogue as a separate section
 * below; this file has no opinion about it.
 */

/* ── Hero ──────────────────────────────────────────────────────────────── */

export function TourHero() {
  return (
    <header className="relative overflow-hidden">
      {/* Ambient warmth behind the headline, as in the design's glow layer. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-c57-primary/10 blur-3xl"
      />

      <div className="relative max-w-4xl">
        <p className="flex items-center gap-space-sm font-label-sm uppercase tracking-[0.28em] text-c57-primary">
          <span className="accent-line" aria-hidden="true" />
          {HERO.overline}
        </p>

        <h1 className="mt-space-md font-display text-headline-xl-mobile leading-[1.08] text-c57-on-surface md:text-headline-xl">
          {HERO.headline}
        </h1>

        <p className="mt-space-md max-w-2xl text-body-lg font-light leading-relaxed text-c57-on-surface-variant">
          {HERO.lead}
        </p>
      </div>

      <ul className="relative mt-space-xl grid grid-cols-2 gap-gutter-mobile lg:grid-cols-4 sm:gap-gutter">
        {HERO.badges.map((badge) => (
          <li key={badge.title}>
            <Card variant="inset" className="h-full p-space-md">
              <Icon name={badge.icon} size="lg" className="text-c57-primary" />
              <p className="mt-space-sm font-label-md uppercase tracking-wider text-c57-on-surface">
                {badge.title}
              </p>
              <p className="mt-space-xs text-body-sm text-c57-on-surface-variant">
                {badge.body}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </header>
  );
}

/* ── Filter bar ────────────────────────────────────────────────────────── */

/**
 * The design presents filters as controls plus a "Tampilkan Jadwal" button, so
 * the selects are staged in local state and only applied on submit. Category
 * tabs switch immediately, which is how a tab strip is expected to behave.
 */
export function TourFilterBar({ category, onCategoryChange, filters, onApply }) {
  const [draft, setDraft] = useState(filters);

  // Keep the staged copy in step when the page resets filters.
  const [seenFilters, setSeenFilters] = useState(filters);
  if (filters !== seenFilters) {
    setSeenFilters(filters);
    setDraft(filters);
  }

  /* A control with nothing to choose between is worse than no control: it reads
     as a working filter and silently does nothing. The design's only period
     choices were 2025 departure dates, which the catalogue deliberately does
     not ship (see `PERIOD_OPTIONS`), so `period` arrives here as a single
     "all" entry and `filterOpenTrips` never reads it. Dropping the panel until
     real options exist keeps the filter bar honest, and it comes back on its
     own the day PERIOD_OPTIONS grows. */
  const selects = [
    {
      control: FILTER_CONTROLS.region,
      value: draft.region,
      onChange: (region) => setDraft((d) => ({ ...d, region })),
      options: REGION_OPTIONS,
    },
    {
      control: FILTER_CONTROLS.period,
      value: draft.period,
      onChange: (period) => setDraft((d) => ({ ...d, period })),
      options: PERIOD_OPTIONS,
    },
    {
      control: FILTER_CONTROLS.budget,
      value: draft.budget,
      onChange: (budget) => setDraft((d) => ({ ...d, budget })),
      options: BUDGET_OPTIONS,
    },
  ].filter((select) => select.options.length > 1);

  return (
    <section aria-label="Filter paket" className="mt-space-2xl md:mt-space-3xl">
      <div className="flex flex-wrap gap-space-sm" role="tablist">
        {CATEGORIES.map((label) => {
          const active = label === category;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(label)}
              className={[
                "rounded-full px-space-lg py-2.5 font-label-sm uppercase tracking-wider transition-colors duration-300",
                active
                  ? "bg-c57-primary-container text-c57-on-primary"
                  : "bg-c57-surface-container text-c57-on-surface-variant hover:bg-c57-surface-container-high hover:text-c57-on-surface",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Card variant="flat" className="mt-space-lg p-space-lg">
        <div
          className={[
            "grid gap-space-md",
            selects.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2",
          ].join(" ")}
        >
          {selects.map((select) => (
            <FilterSelect key={select.control.caption} {...select} />
          ))}
        </div>

        <Button
          type="submit"
          size="lg"
          icon={FILTER_CONTROLS.submit.icon}
          className="mt-space-lg w-full"
          onClick={() => onApply(draft)}
        >
          {FILTER_CONTROLS.submit.label}
        </Button>
      </Card>

      <div className="mt-space-md flex flex-wrap items-center gap-space-sm">
        {POPULAR_DESTINATIONS.map((label) => (
          <Pill key={label} variant="outline">
            {label}
          </Pill>
        ))}
      </div>
    </section>
  );
}

/** A labelled filter panel: uppercase caption, glyph, and a native select. */
function FilterSelect({ control, value, onChange, options }) {
  return (
    <div className="flex flex-col rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md transition-colors hover:bg-c57-surface-container">
      <div className="mb-space-xs flex items-center justify-between">
        <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
          {control.caption}
        </span>
        <Icon name={control.icon} className="text-c57-primary" />
      </div>
      <Select
        aria-label={control.caption}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="!border-0 !bg-transparent !px-0 !py-1 font-headline-sm text-headline-sm font-semibold !text-c57-on-surface focus:!shadow-none"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/* ── Open trips ────────────────────────────────────────────────────────── */

export function OpenTripCard({ trip, index = 0 }) {
  const copy = UI_COPY.openTrip;
  const filled = occupancy(trip);

  /* These cards are enquiry surfaces, not detail surfaces: there is no modal
     behind them, only the WhatsApp deep link on the CTA. `interactive` would
     put a cursor-pointer and a hover lift on a card that does nothing on click,
     so the CTA carries the affordance on its own instead of the whole card
     pretending to be pressable. */
  return (
    <Card
      className="group flex animate-fadeInUp flex-col overflow-hidden"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-72 overflow-hidden">
        <img
          src={trip.image}
          alt={trip.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-c57-scrim/80 via-transparent to-c57-scrim/20"
        />
        <div className="absolute left-space-md top-space-md">
          <span className="rounded-full bg-c57-surface-container-lowest px-space-sm py-1 font-label-sm uppercase tracking-wider text-c57-on-surface shadow-c57-card backdrop-blur-md">
            {trip.durationBadge}
          </span>
        </div>
        <div className="absolute right-space-md top-space-md">
          <Pill variant="signature">{trip.seatsLeftLabel}</Pill>
        </div>
        <div className="absolute inset-x-space-md bottom-space-md text-c57-on-scrim">
          <span className="font-label-sm uppercase tracking-wider text-c57-tertiary-fixed-dim">
            {trip.schedule}
          </span>
          <p className="mt-space-xs font-headline-sm text-headline-sm leading-tight drop-shadow-sm">
            {trip.title}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-space-lg p-space-lg">
        <div className="space-y-space-md">
          <div className="space-y-space-sm">
            <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              {copy.highlightsCaption}
            </span>
            <ul className="space-y-space-sm text-body-sm text-c57-secondary">
              {trip.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-space-sm">
                  <Icon
                    name={copy.checkIcon}
                    size="sm"
                    className="shrink-0 text-c57-primary"
                  />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-space-sm pt-space-sm">
            <div className="flex justify-between font-label-sm text-c57-secondary">
              <span>{copy.availabilityLabel}</span>
              <span className="font-semibold text-c57-primary">
                {copy.availabilityFormat
                  .replace("{filled}", String(trip.seatsFilled))
                  .replace("{total}", String(trip.seatsTotal))}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={copy.availabilityLabel}
              aria-valuenow={filled}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full overflow-hidden rounded-full bg-c57-surface-container"
            >
              <div
                className="h-full rounded-full bg-c57-primary-container"
                style={{ width: `${filled}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-space-sm pt-space-sm">
          <div className="flex items-baseline justify-between gap-space-sm">
            <span className="font-label-sm uppercase tracking-wider text-c57-on-surface-variant">
              {copy.priceCaption}
            </span>
            <div className="text-right">
              <span className="font-headline-md text-headline-md font-semibold text-c57-primary">
                {formatRupiah(trip.pricePerPax)}
              </span>
              <span className="-mt-space-xs block text-body-sm text-c57-on-surface-variant">
                {copy.priceSuffix}
              </span>
            </div>
          </div>
          <Button
            as="a"
            href={openTripEnquiryHref(trip)}
            target="_blank"
            rel="noopener noreferrer"
            size="md"
            className="w-full"
          >
            {copy.ctaLabel}
            <span className="font-normal normal-case tracking-normal text-c57-on-primary/80">
              {copy.ctaNote}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Private journeys ──────────────────────────────────────────────────── */

export function PrivateJourneyCard({ journey, index = 0 }) {
  const copy = UI_COPY.privateJourney;

  /* These cards are enquiry surfaces, not detail surfaces: there is no modal
     behind them, only the WhatsApp deep link on the CTA. `interactive` would
     put a cursor-pointer and a hover lift on a card that does nothing on click,
     so the CTA carries the affordance on its own instead of the whole card
     pretending to be pressable. */
  return (
    <Card
      className="group flex animate-fadeInUp flex-col overflow-hidden"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={journey.image}
          alt={journey.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-c57-scrim/75 via-transparent to-transparent"
        />
        <div className="absolute left-space-md top-space-md">
          <span className="rounded-full bg-c57-surface-container-lowest px-space-sm py-1 font-label-sm uppercase tracking-wider text-c57-on-surface shadow-c57-card backdrop-blur-md">
            {journey.durationBadge}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-space-md p-space-lg">
        <div>
          <p className="font-label-sm uppercase tracking-widest text-c57-primary">
            {journey.eyebrow}
          </p>
          <h3 className="mt-space-sm font-headline-sm text-headline-sm leading-tight text-c57-on-surface">
            {journey.title}
          </h3>
          <p className="mt-space-sm text-body-sm leading-relaxed text-c57-on-surface-variant">
            {journey.summary}
          </p>
        </div>

        <dl className="space-y-space-sm">
          <SpecRow
            icon={copy.vehicleIcon}
            label={copy.vehicleLabel}
            value={journey.vehicle}
          />
          <SpecRow
            icon={copy.stayIcon}
            label={copy.stayLabel}
            value={journey.stay}
          />
        </dl>

        <div>
          <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
            {copy.highlightsCaption}
          </span>
          <ul className="mt-space-sm space-y-space-sm text-body-sm text-c57-secondary">
            {journey.highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-space-sm">
                <Icon
                  name={UI_COPY.openTrip.checkIcon}
                  size="sm"
                  className="shrink-0 text-c57-primary"
                />
                {highlight}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-space-sm pt-space-sm">
          <div className="flex items-baseline justify-between gap-space-sm">
            <span className="font-label-sm uppercase tracking-wider text-c57-on-surface-variant">
              {copy.priceLabel}
            </span>
            <div className="text-right">
              <span className="font-headline-md text-headline-md font-semibold text-c57-primary">
                {formatRupiah(journey.priceFrom)}
              </span>
              <span className="-mt-space-xs block text-body-sm text-c57-on-surface-variant">
                {copy.priceSuffix.replace("{minPax}", String(journey.minPax))}
              </span>
            </div>
          </div>
          <Button
            as="a"
            href={privateJourneyEnquiryHref(journey)}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="md"
            className="w-full"
          >
            {copy.ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SpecRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-space-sm">
      <Icon name={icon} className="mt-space-xs shrink-0 text-c57-primary" />
      <div className="min-w-0">
        <dt className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
          {label}
        </dt>
        <dd className="text-body-sm text-c57-on-surface">{value}</dd>
      </div>
    </div>
  );
}

/* ── Service pillars ───────────────────────────────────────────────────── */

export function ServicePillars() {
  return (
    <section className="mt-space-2xl md:mt-space-3xl">
      <SectionHeading
        eyebrow={PILLARS_SECTION.eyebrow}
        title={PILLARS_SECTION.title}
        description={PILLARS_SECTION.lead}
      />

      <ul className="mt-space-xl grid gap-gutter md:grid-cols-2 lg:grid-cols-4">
        {SERVICE_PILLARS.map((pillar) => (
          <li key={pillar.title}>
            <Card variant="inset" className="h-full p-space-lg">
              <Icon name={pillar.icon} size="2xl" className="text-c57-primary" />
              <h3 className="mt-space-md font-headline-sm text-headline-sm text-c57-on-surface">
                {pillar.title}
              </h3>
              <p className="mt-space-sm text-body-sm leading-relaxed text-c57-on-surface-variant">
                {pillar.body}
              </p>
              <Pill variant="sand" className="mt-space-md">
                {pillar.tag}
              </Pill>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Bespoke request desk ──────────────────────────────────────────────── */

/**
 * The form composes a WhatsApp message rather than posting anywhere, which is
 * why it asks for no email: the conversation happens on WhatsApp. Submit is a
 * link built from the current state, so the form works without JS state
 * surviving a reload and there is no second backend to keep alive.
 */
export function ConciergeDesk() {
  const [form, setForm] = useState({
    destination: "",
    dates: "",
    pax: CONCIERGE_DESK.paxOptions[0],
    fleet: CONCIERGE_DESK.fleetOptions[0],
    notes: "",
  });

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const fields = CONCIERGE_DESK.fields;

  return (
    <section className="mt-space-2xl md:mt-space-3xl">
      <div className="grid gap-gutter lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow={CONCIERGE_DESK.eyebrow}
            title={CONCIERGE_DESK.title}
            description={CONCIERGE_DESK.lead}
          />
          <ul className="mt-space-lg space-y-space-sm">
            {CONCIERGE_DESK.promises.map((promise) => (
              <li key={promise} className="flex items-start gap-space-sm">
                <Icon
                  name={UI_COPY.openTrip.checkIcon}
                  size="sm"
                  className="shrink-0 text-c57-primary"
                />
                <span className="text-body-sm text-c57-on-surface-variant">
                  {promise}
                </span>
              </li>
            ))}
          </ul>
          <Pill variant="available" icon="group" className="mt-space-lg">
            {CONCIERGE_DESK.staffNote}
          </Pill>
        </div>

        <Card variant="flat" className="p-space-lg">
          <form
            className="space-y-space-md"
            onSubmit={(event) => event.preventDefault()}
          >
            <Field label={fields.destination.label}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={form.destination}
                  onChange={set("destination")}
                  placeholder={fields.destination.placeholder}
                />
              )}
            </Field>

            <Field label={fields.dates.label}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={form.dates}
                  onChange={set("dates")}
                  placeholder={fields.dates.placeholder}
                />
              )}
            </Field>

            <Field label={fields.pax.label}>
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={form.pax}
                  onChange={set("pax")}
                >
                  {CONCIERGE_DESK.paxOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={fields.fleet.label}>
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={form.fleet}
                  onChange={set("fleet")}
                >
                  {CONCIERGE_DESK.fleetOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={fields.notes.label}>
              {(controlProps) => (
                <Textarea
                  {...controlProps}
                  rows={2}
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder={fields.notes.placeholder}
                />
              )}
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              onClick={() => {
                window.open(conciergeEnquiryHref(form), "_blank", "noopener");
              }}
            >
              {CONCIERGE_DESK.submitLabel}
            </Button>

            <p className="text-center font-label-sm uppercase tracking-wider text-c57-on-surface-variant">
              {CONCIERGE_DESK.responseNote}
            </p>
          </form>
        </Card>
      </div>
    </section>
  );
}
