import Button from "./ui/Button";
import Card from "./ui/Card";
import Icon from "./ui/Icon";
import Pill from "./ui/Pill";

/**
 * Presentation for the destination editorial layer.
 *
 * Split out of `DestinationDetailPage` because the page is then just data
 * lookup and composition, and these blocks — which follow the Tumpak Sewu
 * "definitive guide" editorial layout — can be read (and corrected) on their
 * own.
 *
 * Every block here takes its copy as props and renders nothing that is not in
 * the guide record. That is deliberate: the page must never fall back to
 * inventing editorial prose for a destination whose guide is missing. Missing
 * copy means the whole guide layout is skipped, not half-rendered.
 */

/* The public hotline, not the reservations line. Matches ConciergeCta. */
const CONCIERGE_WHATSAPP = "6281257570057";

/**
 * Build a WhatsApp deep link with the destination already named in the
 * message, so the first thing the concierge receives is a real enquiry rather
 * than a blank "hi".
 */
function enquiryHref(spot) {
  const message =
    `Halo Concierge Cakra Lima Tujuh, saya tertarik dengan ${spot.name} ` +
    `di ${spot.city}. Boleh minta info lebih lanjut?`;
  return `https://wa.me/${CONCIERGE_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * "Bagian 01 — …" style section label with the short crimson rule in front of
 * it, as used throughout the mockup.
 */
export function PartLabel({ children }) {
  return (
    <p className="flex items-center gap-2 font-label-sm uppercase tracking-[0.28em] text-c57-primary">
      <span
        className="h-0.5 w-6 shrink-0 bg-c57-primary"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

/* ── Key metadata strip: the four fact cards ──────────────────────────── */

export function GuideFacts({ facts, timezone }) {
  return (
    <dl className="mt-space-md grid grid-cols-2 gap-gutter-mobile rounded-c57-lg bg-c57-surface-container-low px-space-md py-space-md md:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1">
          <dt className="font-label-sm uppercase tracking-wider text-c57-secondary">
            {fact.label}
          </dt>
          <dd className="flex items-start gap-1.5 font-label-lg text-label-lg font-semibold text-c57-on-surface">
            <Icon
              name={fact.icon}
              size="lg"
              className="mt-0.5 shrink-0 text-c57-primary"
            />
            <span>{fact.value}</span>
          </dd>
        </div>
      ))}

      {/* Not a `fact` — it is derived from the slug's timezone entry, and only
          the international guides find it useful. */}
      {timezone && (
        <div className="flex flex-col gap-1">
          <dt className="font-label-sm uppercase tracking-wider text-c57-secondary">
            Zona Waktu
          </dt>
          <dd className="flex items-start gap-1.5 font-label-lg text-label-lg font-semibold text-c57-on-surface">
            <Icon
              name="schedule"
              size="lg"
              className="mt-0.5 shrink-0 text-c57-primary"
            />
            <span>{timezone}</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

/* ── Panorama photograph frame with the curator quote ─────────────────── */

export function GuidePanorama({ image, name, panorama }) {
  return (
    <figure className="relative h-[65vh] min-h-[420px] max-h-[720px] w-full overflow-hidden rounded-c57-2xl shadow-xl">
      <img
        src={image}
        alt={name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-c57-inverse-surface/80 via-transparent to-transparent p-space-lg text-c57-inverse-on-surface md:p-space-xl">
        <figcaption className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-label-sm uppercase tracking-widest text-c57-secondary-fixed">
              {panorama.label}
            </span>
            <p className="mt-1 font-headline-sm text-headline-sm italic text-c57-surface-container-lowest">
              &ldquo;{panorama.quote}&rdquo;
            </p>
          </div>
          <span className="shrink-0 font-label-sm text-label-sm text-c57-surface-variant">
            Kurasi Fotografi: Cakra Discovery Journal
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

/* ── Bagian 01 — narrative ─────────────────────────────────────────────── */

function NarrativeSection({ narrative }) {
  return (
    <section className="flex flex-col gap-space-md">
      <PartLabel>Bagian 01 — Narasi Destinasi</PartLabel>
      <h2 className="font-headline-lg text-headline-lg text-c57-on-surface">
        {narrative.title}
      </h2>
      {narrative.body.map((paragraph, i) => (
        <p
          key={i}
          className="text-body-md leading-relaxed text-c57-on-surface-variant"
        >
          {paragraph}
        </p>
      ))}

      <Card variant="inset" className="mt-space-sm flex items-start gap-space-md p-space-lg">
        <Icon name="format_quote" size="2xl" className="shrink-0 text-c57-primary" />
        <div className="flex flex-col gap-1">
          <p className="font-headline-sm text-headline-sm italic text-c57-on-surface">
            &ldquo;{narrative.quote}&rdquo;
          </p>
          <span className="font-label-sm uppercase tracking-wider text-c57-secondary">
            &mdash; {narrative.quoteBy}
          </span>
        </div>
      </Card>
    </section>
  );
}

/* ── Bagian 02 — timing and light ──────────────────────────────────────── */

function LightSection({ light }) {
  return (
    <section className="flex flex-col gap-space-md">
      <PartLabel>Bagian 02 — Waktu &amp; Cahaya</PartLabel>
      <h2 className="font-headline-lg text-headline-lg text-c57-on-surface">
        {light.title}
      </h2>
      <p className="text-body-md leading-relaxed text-c57-on-surface-variant">
        {light.intro}
      </p>

      <ol className="mt-space-xs flex flex-col gap-space-sm">
        {light.timeline.map((stop, i) => (
          <li
            key={`${stop.time}-${i}`}
            className="flex items-start gap-space-md rounded-c57-lg bg-c57-surface-container-lowest p-space-md shadow-c57-card"
          >
            {/* The anchor stop of the day is filled; the rest are outlined. */}
            <span
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-label-lg text-label-lg",
                stop.active
                  ? "bg-c57-primary-container font-bold text-c57-on-primary"
                  : "bg-c57-surface-container font-bold text-c57-primary",
              ].join(" ")}
            >
              {stop.time}
            </span>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg font-semibold text-c57-on-surface">
                {stop.title}
              </span>
              <p className="text-body-sm text-c57-secondary">{stop.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Bagian 03 — gear and safety ───────────────────────────────────────── */

function GearSection({ gear }) {
  return (
    <section className="flex flex-col gap-space-md">
      <PartLabel>Bagian 03 — Perlengkapan &amp; Keselamatan</PartLabel>
      <h2 className="font-headline-lg text-headline-lg text-c57-on-surface">
        Kurasi Gear Wajib
      </h2>
      {/* No invented intro paragraph here on purpose. The mockup's Bagian 03
          lead-in is specific to one destination's hazards, and the guide
          schema has no field for it — so rather than write generic filler
          that reads as editorial, the section opens straight onto the cards. */}

      <div className="mt-space-xs grid grid-cols-1 gap-space-md sm:grid-cols-2">
        {gear.map((item) => (
          <Card
            key={item.title}
            variant="inset"
            className="flex items-start gap-space-sm p-space-md"
          >
            <Icon name={item.icon} size="xl" className="shrink-0 text-c57-primary" />
            <div>
              <h3 className="font-label-lg text-label-lg font-bold text-c57-on-surface">
                {item.title}
              </h3>
              <p className="text-body-sm text-c57-secondary">{item.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ── Bagian 04 — how to get there ──────────────────────────────────────── */

function RouteSection({ route }) {
  return (
    <section className="flex flex-col gap-space-md">
      <PartLabel>Bagian 04 — Rute &amp; Akses</PartLabel>
      <h2 className="font-headline-lg text-headline-lg text-c57-on-surface">
        {route.title}
      </h2>
      <p className="text-body-md leading-relaxed text-c57-on-surface-variant">
        {route.body}
      </p>
      <Card variant="inset" className="flex items-start gap-space-sm p-space-md">
        <Icon name="info" size="lg" className="shrink-0 text-c57-primary" />
        <p className="text-body-sm leading-relaxed text-c57-secondary">
          {route.note}
        </p>
      </Card>
    </section>
  );
}

/** Bagian 01–04, the long-form reading column. */
export function GuideArticle({ guide }) {
  return (
    <article className="flex flex-col gap-space-xl lg:col-span-7">
      <NarrativeSection narrative={guide.narrative} />
      <LightSection light={guide.light} />
      <GearSection gear={guide.gear} />
      <RouteSection route={guide.route} />
    </article>
  );
}

/* ── Sticky aside ──────────────────────────────────────────────────────── */

/**
 * The booking card, minus the booking.
 *
 * The Tumpak Sewu mockup fills this slot with a price, a 50% deposit, an
 * inclusions list and a "Bayar DP 50%" button. No commercial terms are
 * approved for any destination, so this is the neutral enquiry that replaces
 * it: a WhatsApp deep link with the destination pre-filled, plus the two
 * service promises that are actually true today.
 *
 * `commercial` is a documented seam — when real rates exist they render here
 * and this component becomes the fallback rather than the default.
 */
export function ConciergeEnquiryCard({ spot, hasCulinaryNote = false }) {
  return (
    <Card className="flex flex-col gap-space-md p-space-lg shadow-xl">
      <div className="flex flex-col gap-1">
        <span className="font-label-sm font-bold uppercase tracking-widest text-c57-primary">
          Curasi Cakra 57
        </span>
        <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">
          Rancang Perjalanan ke {spot.name}
        </h3>
      </div>

      <p className="text-body-sm leading-relaxed text-c57-secondary">
        Tim kami akan menyusun itinerary, pilihan armada, dan estimasi biaya
        khusus untuk rute Anda. Konsultasi awal tidak dipungut biaya.
      </p>

      <div className="flex flex-col gap-2.5 rounded-c57-lg bg-c57-surface-container-low p-space-md">
        {[
          ["verified_user", "Supir berlisensi pariwisata"],
          ["route", "Rute dan jadwal bisa fleksibel"],
          ["support_agent", "Pendampingan concierge 24/7"],
        ].map(([icon, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon name={icon} size="lg" className="shrink-0 text-c57-primary" />
            <span className="text-body-sm font-medium text-c57-on-surface-variant">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-space-sm pt-space-xs">
        <Button as="a" href={enquiryHref(spot)} target="_blank" rel="noopener noreferrer" size="lg" className="w-full">
          <Icon name="chat" size="sm" />
          Konsultasi via WhatsApp
        </Button>
        {/* Only offered when the culinary note is actually on the page. The
            lean layout has no culinary card, and a link to a missing anchor
            is a dead end. */}
        {hasCulinaryNote && (
          <Button as="a" href="#kuliner" variant="secondary" className="w-full">
            Lihat Rekomendasi Singgah
          </Button>
        )}
      </div>
    </Card>
  );
}

/** The "singgah di sini" culinary note, as in the mockup's lower aside card. */
export function CulinaryCard({ culinary }) {
  return (
    <Card
      id="kuliner"
      variant="inset"
      className="flex items-center gap-space-md p-space-md"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-c57-surface-variant font-headline-sm text-headline-sm font-bold text-c57-primary">
        57
      </span>
      <div className="flex flex-col">
        <span className="font-label-sm uppercase tracking-wider text-c57-secondary">
          Rekomendasi Kuliner Singgah
        </span>
        <h4 className="font-headline-sm text-headline-sm text-c57-on-surface">
          {culinary.name}
        </h4>
        <p className="text-body-sm text-c57-secondary">{culinary.description}</p>
      </div>
    </Card>
  );
}

/** The sticky column: enquiry first, then the culinary note. */
export function GuideAside({ spot, guide }) {
  return (
    <aside className="flex flex-col gap-space-md lg:col-span-5 lg:sticky lg:top-30 lg:self-start">
      <ConciergeEnquiryCard spot={spot} hasCulinaryNote={Boolean(guide.culinary)} />
      {guide.culinary && <CulinaryCard culinary={guide.culinary} />}
    </aside>
  );
}

/** Overline pills above the headline: category, region, and a reading time. */
export function GuideOverline({ category, region, city, readingMinutes }) {
  return (
    <div className="flex flex-wrap items-center gap-space-sm">
      <Pill variant="signature">Definitive Guide</Pill>
      <Pill variant="neutral">
        {city} &mdash; {region}
      </Pill>
      {category && (
        <span className="hidden font-label-sm text-label-sm text-c57-secondary md:inline-block">
          {category.toUpperCase()}
        </span>
      )}
      {readingMinutes ? (
        <span className="font-label-sm text-label-sm text-c57-secondary">
          Waktu baca: {readingMinutes} menit
        </span>
      ) : null}
    </div>
  );
}
