import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { destinationSpots } from "../data/destinationSpots";
import { getDestinationGuide, getDestinationTimezone } from "../data/destinationGuides";
import DestinationTile from "../components/DestinationTile";
import {
  ConciergeEnquiryCard,
  GuideArticle,
  GuideAside,
  GuideFacts,
  GuideOverline,
  GuidePanorama,
} from "../components/DestinationGuide";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Pill from "../components/ui/Pill";

/**
 * Destination detail page — `/destinasi/:region/:slug`.
 *
 * Two shapes, chosen by whether a guide record exists:
 *
 *   Full    A destination with authored editorial copy renders the
 *           "definitive guide" layout: overline, headline, lead, four fact
 *           cards, panorama quote, Bagian 01-04, and a sticky enquiry aside.
 *   Lean    A destination without a guide yet renders the catalogue record
 *           and a concierge enquiry. It is a real page, not a placeholder.
 *
 * The 46 guides are being authored in reviewed batches, so Lean is the common
 * case on day one and is treated as a first-class layout rather than a stub.
 *
 * Nothing on this page is specific to any one destination: the headline comes
 * from the catalogue and the prose comes from the guide record. The Tumpak
 * Sewu design supplied the layout, not its content.
 */

const REGION_LABEL = {
  jawa: "Jawa",
  bali: "Bali",
  indonesia: "Indonesia",
  asean: "ASEAN",
};

/* Rough reading time from the guide's own word count, rounded to minutes. */
function estimateReadingMinutes(guide) {
  if (!guide) return null;
  const words = [
    guide.lead,
    guide.narrative?.title,
    ...(guide.narrative?.body || []),
    guide.narrative?.quote,
    guide.light?.intro,
    ...(guide.light?.timeline || []).flatMap((s) => [s.title, s.body]),
    guide.route?.body,
    guide.route?.note,
    guide.culinary?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/* ── Breadcrumb ────────────────────────────────────────────────────────── */

function Breadcrumb({ spot, region }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap font-label-sm uppercase tracking-wider text-c57-on-scrim/60"
    >
      <Link to="/" className="transition-colors hover:text-c57-on-scrim">
        Beranda
      </Link>
      <Icon name="chevron_right" size="sm" className="shrink-0" />
      <Link to="/discovery" className="transition-colors hover:text-c57-on-scrim">
        Discovery
      </Link>
      <Icon name="chevron_right" size="sm" className="shrink-0" />
      <Link
        to={`/discovery/${region}`}
        className="transition-colors hover:text-c57-on-scrim"
      >
        {REGION_LABEL[region]}
      </Link>
      <Icon name="chevron_right" size="sm" className="shrink-0" />
      <span className="truncate text-c57-on-scrim">{spot.name}</span>
    </nav>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────── */

function Hero({ spot, region, guide }) {
  const moods = Array.isArray(spot.mood) ? spot.mood : [];

  return (
    <section className="relative flex min-h-[70vh] items-end overflow-hidden pt-32 md:min-h-[80vh] md:pt-40">
      <img
        src={spot.image}
        alt={spot.name}
        className="heroKenBurns absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-c57-scrim/90 via-c57-scrim/30 to-c57-scrim/40"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-14 md:px-10 md:pb-20">
        <div className="mb-6">
          <Breadcrumb spot={spot} region={region} />
        </div>

        <div className="mb-5">
          <GuideOverline
            category={spot.category}
            region={REGION_LABEL[region]}
            city={spot.city}
            readingMinutes={estimateReadingMinutes(guide)}
          />
        </div>

        <h1 className="max-w-4xl font-headline-xl text-headline-xl-mobile leading-[0.95] text-c57-on-scrim md:text-headline-xl">
          {spot.name}
          {guide?.subtitle && (
            <em className="font-normal italic text-c57-surface-variant">
              {`: ${guide.subtitle}`}
            </em>
          )}
        </h1>

        {guide?.lead && (
          <p className="mt-5 max-w-3xl text-body-lg font-light leading-relaxed text-c57-surface-variant">
            {guide.lead}
          </p>
        )}

        {moods.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {moods.map((m) => (
              <Link key={m} to={`/discovery?mood=${encodeURIComponent(m)}`}>
                <Pill
                  variant="onScrim"
                  className="transition-colors hover:border-c57-on-scrim/40"
                >
                  {m}
                </Pill>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Lean layout: no authored guide for this slug yet ──────────────────── */

const LEAN_FACTS = (spot, region, timezone) => [
  ["Wilayah", REGION_LABEL[region] || region],
  ["Kategori", spot.category],
  ["Kota", spot.city],
  ["Zona Waktu", timezone || "WIB (UTC+7)"],
];

function LeanAbout({ spot, region, timezone }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
      <div className="grid items-start gap-10 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-7">
          <p className="mb-3 font-label-sm uppercase tracking-[0.3em] text-c57-primary">
            Tentang Destinasi
          </p>
          <h2 className="font-headline-md text-headline-md text-c57-on-surface">
            {spot.name}
          </h2>
          <p className="mt-6 max-w-2xl text-body-lg font-light leading-relaxed text-c57-on-surface-variant">
            {spot.name} di {spot.city} adalah salah satu destinasi paling memikat
            di {REGION_LABEL[region] || region}. Panduan editorial lengkap untuk
            destinasi ini sedang disiapkan &mdash; sementara itu, hubungi concierge
            kami untuk menyusun itinerary ke {spot.name}.
          </p>
          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-space-md">
            {LEAN_FACTS(spot, region, timezone).map(([label, value]) => (
              <Card key={label} variant="inset" className="p-5">
                <dt className="font-label-sm uppercase tracking-widest text-c57-outline">
                  {label}
                </dt>
                <dd className="mt-1 font-headline-sm text-body-lg text-c57-on-surface">
                  {value}
                </dd>
              </Card>
            ))}
          </dl>
        </div>

        {/* The enquiry is the page's conversion path whether or not a guide
            exists, so the lean layout carries it too. Without this the only
            calls to action were the generic Open Trip / Private Trip links in
            the footer, and a destination page had no way to ask about itself. */}
        <aside className="md:col-span-5">
          <ConciergeEnquiryCard spot={spot} />
        </aside>
      </div>
    </section>
  );
}

/* ── Related destinations ─────────────────────────────────────────────── */

function Related({ spot }) {
  const related = useMemo(() => {
    if (!spot) return [];
    return destinationSpots
      .filter((s) => s.slug !== spot.slug)
      .filter(
        (s) =>
          s.region === spot.region ||
          (Array.isArray(s.mood) &&
            Array.isArray(spot.mood) &&
            s.mood.some((m) => spot.mood.includes(m)))
      )
      .slice(0, 3);
  }, [spot]);

  if (related.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
      <div className="mb-8 flex items-end justify-between gap-space-md md:mb-12">
        <div>
          <p className="mb-2 font-label-sm uppercase tracking-[0.3em] text-c57-primary">
            Explore Lebih Jauh
          </p>
          <h2 className="font-headline-lg text-headline-lg-mobile text-c57-on-surface md:text-headline-lg">
            Tempat lain yang mungkin kamu suka
          </h2>
        </div>
        <Link
          to="/discovery"
          className="hidden shrink-0 items-center gap-space-sm font-label-sm uppercase tracking-[0.2em] text-c57-primary transition-colors hover:text-c57-primary-container md:inline-flex"
        >
          Lihat Semua
          <Icon name="north_east" size="sm" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((r, idx) => (
          <DestinationTile key={r.slug} spot={r} index={idx} />
        ))}
      </div>
    </section>
  );
}

/* ── Footer CTA ────────────────────────────────────────────────────────── */

function FooterCta({ spot }) {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
      <Card variant="scrim" className="p-10 text-center md:p-16">
        <Icon name="auto_awesome" size="lg" className="mx-auto text-c57-accent-line" />
        <h2 className="mt-space-md font-headline-lg text-headline-lg-mobile text-c57-on-scrim md:text-headline-lg">
          Siap menjelajah {spot.city}?
        </h2>
        <p className="mx-auto mt-space-md max-w-xl text-body-lg font-light text-c57-on-scrim/60">
          Rencanakan Open Trip atau Private Trip ke {spot.name} bersama Cakra
          Lima Tujuh.
        </p>
        <div className="mt-space-lg flex flex-wrap justify-center gap-space-md">
          <Button as={Link} to="/open-trip" size="lg">
            Open Trip
          </Button>
          <Button
            as={Link}
            to="/home?type=driver"
            variant="secondary"
            size="lg"
            className="border-c57-on-scrim/40 text-c57-on-scrim hover:border-c57-on-scrim hover:bg-c57-on-scrim hover:text-c57-scrim"
          >
            Private Trip
          </Button>
        </div>
      </Card>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function DestinationDetailPage() {
  const { region, slug } = useParams();

  const spot = useMemo(
    () => destinationSpots.find((s) => s.slug === slug && s.region === region),
    [region, slug]
  );

  // Not memoised on purpose: this is a single object lookup, and the guides map
  // is static, so a useMemo here would cost more than it saves.
  const guide = spot ? getDestinationGuide(spot.slug) : undefined;
  const timezone = spot ? getDestinationTimezone(spot.slug) : null;

  if (!spot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-c57-surface px-5 pt-36">
        <EmptyState
          icon="explore"
          title="Destinasi tidak ditemukan"
          description="Tautan yang kamu buka mungkin sudah berubah."
          action="Kembali ke Discovery"
          actionTo="/discovery"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface text-c57-on-surface">
      <Hero spot={spot} region={region} guide={guide} />

      {guide ? (
        <>
          <section className="mx-auto max-w-7xl px-5 pb-space-xl md:px-10">
            <GuideFacts facts={guide.facts} timezone={timezone} />
          </section>

          <section className="mx-auto max-w-7xl px-5 pb-space-xl md:px-10">
            <GuidePanorama image={spot.image} name={spot.name} panorama={guide.panorama} />
          </section>

          <section className="mx-auto max-w-7xl px-5 pb-16 md:px-10 md:pb-24">
            <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
              <GuideArticle guide={guide} />
              <GuideAside spot={spot} guide={guide} />
            </div>
          </section>
        </>
      ) : (
        <LeanAbout spot={spot} region={region} timezone={timezone} />
      )}

      <Related spot={spot} />
      <FooterCta spot={spot} />
    </div>
  );
}
