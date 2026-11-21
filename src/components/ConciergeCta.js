import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

/* The public hotline, not the reservations line. */
const CONCIERGE_WHATSAPP = "6281257570057";

/**
 * Concierge call-to-action shared by the Discovery and Tour Showcase pages.
 *
 * The four pillars and the two actions are the sales promise, so they live
 * here once rather than being restated per page. `planTo` lets a page point the
 * secondary action at a different destination of its own choosing.
 *
 * The band sits on paper like the rest of the Atlas surface: ink display type,
 * one hairline card on the right, no dark panel — the closing image bands are
 * where the world goes dark, and this section is not one of them.
 */
export default function ConciergeCta({
  title = "Ingin Mengunjungi Salah Satu Destinasi Impian Ini?",
  description = "Biarkan tim concierge Cakra Lima Tujuh mengurus seluruh detail perjalanan Anda: mulai dari pemilihan armada eksekutif, supir berlisensi pariwisata, hingga akomodasi resor terpilih di tiap titik rute.",
  planLabel = "Rancang Custom Itinerary",
  planTo = "/trip-planner",
  planIcon = "edit_calendar",
  whatsAppHref = `https://wa.me/${CONCIERGE_WHATSAPP}`,
}) {
  return (
    <section
      className="relative w-full overflow-hidden border-y border-c57-outline-variant/60 bg-c57-surface-container-low py-20 sm:py-24"
      aria-labelledby="concierge-cta-title"
    >
      <div className="editorial-shell grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left: pitch + the four pillars. */}
        <div className="lg:col-span-7">
          <p className="flex items-center gap-3 font-label-sm uppercase tracking-[0.28em] text-c57-secondary">
            <span className="accent-line" aria-hidden="true" />
            Bespoke Private Itinerary
          </p>
          <h2
            id="concierge-cta-title"
            className="mt-5 max-w-[18ch] font-display text-[clamp(2.1rem,4.4vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.02em] text-c57-on-surface text-balance"
          >
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-[0.98rem] leading-relaxed text-c57-on-surface-variant">
            {description}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 border-t border-c57-outline-variant/70 pt-8 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="flex items-start gap-3">
                <Icon
                  name={pillar.icon}
                  size="sm"
                  className="mt-1 shrink-0 text-c57-secondary"
                />
                <div>
                  <span className="block font-label-md text-label-md text-c57-on-surface">
                    {pillar.title}
                  </span>
                  <span className="text-body-sm text-c57-on-surface-variant">
                    {pillar.body}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: the two actions. */}
        <div className="lg:col-span-5">
          <div className="rounded-c57-lg border border-c57-outline-variant/70 bg-c57-surface-container-lowest p-8 shadow-c57-card">
            <div className="space-y-1">
              <span className="font-label-sm uppercase tracking-[0.24em] text-c57-secondary">
                Layanan Eksklusif Konsultasi 24/7
              </span>
              <h3 className="mt-2 font-display text-[1.5rem] leading-tight text-c57-on-surface">
                Mulai Konsultasi Rute Pribadi
              </h3>
              <p className="text-body-sm text-c57-on-surface-variant">
                Hubungi specialist perjalanan kami untuk penawaran instan dalam
                hitungan menit.
              </p>
            </div>

            <div className="mt-7 flex flex-col items-center gap-4">
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-c57-primary-container py-3.5 pl-7 pr-3 font-label-md text-label-md uppercase tracking-[0.14em] text-c57-on-primary transition-all duration-500 hover:bg-c57-tertiary-container"
              >
                Konsultasi via WhatsApp
                <span className="round-arrow">
                  <Icon name="north_east" size="sm" />
                </span>
              </a>
              <Link
                to={planTo}
                className="group inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-[0.14em] text-c57-on-surface-variant transition-colors hover:text-c57-on-surface"
              >
                <Icon name={planIcon} size="sm" />
                {planLabel}
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-c57-outline-variant/70 pt-5 text-body-sm text-c57-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-c57-available-text" />
                Fast Response &lt; 5 Menit
              </span>
              <span aria-hidden="true">&bull;</span>
              <span>Tanpa Biaya Konsultasi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The four service promises, shared by both pages that render this section.
 * Icon names are all present in the Material Symbols subset.
 */
const PILLARS = [
  {
    icon: "verified_user",
    title: "Driver Santun Berlisensi",
    body: "Chauffeur profesional beretika tinggi & paham rute.",
  },
  {
    icon: "clean_hands",
    title: "Armada Terawat & Higienis",
    body: "Disanitasi rutin, wangi segar, suspensi terawat.",
  },
  {
    icon: "route",
    title: "Rute 100% Fleksibel",
    body: "Bebas sesuaikan jadwal & singgah di spot favorit.",
  },
  {
    icon: "shield",
    title: "DP 50% Aman Terproteksi",
    body: "Transaksi transparan dengan garansi kepastian armada.",
  },
];
