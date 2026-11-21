import DestinationPhotoCredit from "./DestinationPhotoCredit";
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
    <p className="flex items-center gap-2 font-label-sm uppercase tracking-[0.28em] text-c57-secondary">
      <span
        className="h-0.5 w-6 shrink-0 bg-c57-accent-line"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

/* ── Key metadata strip: the four fact cards ──────────────────────────── */

export function GuideFacts({ facts, timezone }) {
  return (
    <dl className={`mt-space-md grid grid-cols-2 gap-gutter-mobile rounded-c57-lg bg-c57-surface-container-low px-space-md py-space-md ${timezone ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1">
          <dt className="font-label-sm uppercase tracking-wider text-c57-secondary">
            {fact.label}
          </dt>
          <dd className="flex items-start gap-1.5 font-display text-[1.05rem] leading-snug text-c57-on-surface">
            <Icon
              name={fact.icon}
              size="lg"
              className="mt-0.5 shrink-0 text-c57-secondary"
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
          <dd className="flex items-start gap-1.5 font-display text-[1.05rem] leading-snug text-c57-on-surface">
            <Icon
              name="schedule"
              size="lg"
              className="mt-0.5 shrink-0 text-c57-secondary"
            />
            <span>{timezone}</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

/* ── Panorama photograph frame with the curator quote ─────────────────── */

export function GuidePanorama({ image, name, panorama, photoCredit }) {
  return (
    <div>
    <figure className="relative h-[65vh] min-h-[420px] max-h-[720px] w-full overflow-hidden rounded-[1.6rem] shadow-c57-overlay">
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
            <p className="mt-1 font-display text-[1.55rem] italic leading-snug text-c57-surface-container-lowest">
              &ldquo;{panorama.quote}&rdquo;
            </p>
          </div>
          {!photoCredit && <span className="shrink-0 font-label-sm text-label-sm text-c57-surface-variant">
            Dokumentasi perjalanan Cakra57
          </span>}
        </figcaption>
      </div>
    </figure>
    <DestinationPhotoCredit credit={photoCredit} className="mt-4" />
    </div>
  );
}

/* ── Bagian 01 — narrative ─────────────────────────────────────────────── */

function NarrativeSection({ narrative }) {
  return (
    <section id="cerita" className="scroll-mt-40 flex flex-col gap-space-md">
      <PartLabel>Bagian 01 — Narasi Destinasi</PartLabel>
      <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.06] tracking-[-0.02em] text-c57-on-surface">
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
        <Icon name="format_quote" size="2xl" className="shrink-0 text-c57-secondary" />
        <div className="flex flex-col gap-1">
          <p className="font-display text-[1.4rem] italic leading-snug text-c57-on-surface">
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
    <section id="pengalaman" className="scroll-mt-40 flex flex-col gap-space-md">
      <PartLabel>Bagian 02 — Waktu &amp; Cahaya</PartLabel>
      <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.06] tracking-[-0.02em] text-c57-on-surface">
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
                  ? "bg-c57-primary font-semibold text-c57-on-primary"
                  : "bg-c57-surface-container font-semibold text-c57-secondary",
              ].join(" ")}
            >
              {stop.time}
            </span>
            <div className="flex flex-col">
              <span className="font-display text-[1.05rem] leading-snug text-c57-on-surface">
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
    <section id="persiapan" className="scroll-mt-40 flex flex-col gap-space-md">
      <PartLabel>Bagian 03 — Perlengkapan &amp; Keselamatan</PartLabel>
      <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.06] tracking-[-0.02em] text-c57-on-surface">
        Perlengkapan sebelum berangkat
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
            <Icon name={item.icon} size="xl" className="shrink-0 text-c57-secondary" />
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
    <section id="akses" className="scroll-mt-40 flex flex-col gap-space-md">
      <PartLabel>Bagian 04 — Rute &amp; Akses</PartLabel>
      <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.06] tracking-[-0.02em] text-c57-on-surface">
        {route.title}
      </h2>
      <p className="text-body-md leading-relaxed text-c57-on-surface-variant">
        {route.body}
      </p>
      <Card variant="inset" className="flex items-start gap-space-sm p-space-md">
        <Icon name="info" size="lg" className="shrink-0 text-c57-secondary" />
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
      <nav aria-label="Daftar isi panduan" className="border-y border-c57-outline-variant py-6">
        <h2 className="font-label-md text-c57-on-surface">Dalam panduan ini</h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-body-sm text-c57-secondary">
          {[
            ["cerita", "Cerita destinasi"],
            ...(guide.funFacts?.length ? [["fakta-menarik", "Fakta menarik"]] : []),
            ["pengalaman", "Pengalaman"],
            ["persiapan", "Persiapan"],
            ["akses", "Rute & akses"],
            ...(guide.sources?.length ? [["sumber", "Sumber bacaan"]] : []),
          ].map(([id, label]) => (
            <li key={id}><a href={`#${id}`} className="inline-block py-1 underline underline-offset-4 transition-colors hover:text-c57-primary">{label}</a></li>
          ))}
        </ul>
      </nav>
      <NarrativeSection narrative={guide.narrative} />
      {guide.funFacts?.length > 0 && (
        <section id="fakta-menarik" className="scroll-mt-40">
          <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-tight text-c57-on-surface">Fakta menarik sebelum berkunjung</h2>
          <dl className="mt-6 divide-y divide-c57-outline-variant">
            {guide.funFacts.map((fact) => (
              <div key={fact.title} className="py-5 first:pt-0">
                <dt className="font-display text-[1.35rem] text-c57-on-surface">{fact.title}</dt>
                <dd className="mt-2 text-body-md leading-relaxed text-c57-on-surface-variant">{fact.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <LightSection light={guide.light} />
      <GearSection gear={guide.gear} />
      <RouteSection route={guide.route} />
      {guide.sources?.length > 0 && (
        <section id="sumber" className="scroll-mt-40 border-t border-c57-outline-variant pt-6">
          <h2 className="font-display text-[1.6rem] text-c57-on-surface">Sumber bacaan</h2>
          {guide.reviewedOn && <p className="mt-2 text-body-sm text-c57-on-surface-variant">Ditinjau <time dateTime={guide.reviewedOn}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${guide.reviewedOn}T00:00:00Z`))}</time>. Periksa informasi operasional terbaru melalui pengelola.</p>}
          <ul className="mt-4 space-y-3 text-body-sm text-c57-secondary">
            {guide.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 transition-colors hover:text-c57-primary">{source.title}</a></li>)}
          </ul>
        </section>
      )}
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
        <span className="font-label-sm font-bold uppercase tracking-widest text-c57-secondary">
          Curasi Cakra 57
        </span>
        <h3 className="font-display text-[1.45rem] leading-tight text-c57-on-surface">
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
            <Icon name={icon} size="lg" className="shrink-0 text-c57-secondary" />
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
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-c57-surface-variant font-display text-[1.3rem] font-bold text-c57-secondary">
        57
      </span>
      <div className="flex flex-col">
        <span className="font-label-sm uppercase tracking-wider text-c57-secondary">
          Rekomendasi Kuliner Singgah
        </span>
        <h4 className="font-display text-[1.45rem] leading-tight text-c57-on-surface">
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
      <Pill variant="signature">Panduan Destinasi</Pill>
      <Pill variant="neutral">
        {city} &mdash; {region}
      </Pill>
      {category && (
        <span className="hidden font-label-sm text-label-sm text-c57-on-scrim/85 md:inline-block">
          {category.toUpperCase()}
        </span>
      )}
      {readingMinutes ? (
        <span className="font-label-sm text-label-sm text-c57-on-scrim/85">
          Waktu baca: {readingMinutes} menit
        </span>
      ) : null}
    </div>
  );
}
