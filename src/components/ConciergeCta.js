import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

/* The public hotline, not the reservations line. */
const CONCIERGE_WHATSAPP = "6281257570057";

/**
 * Dark concierge call-to-action shared by the Discovery and Tour Showcase
 * pages.
 *
 * The four pillars and the two actions are the sales promise, so they live
 * here once rather than being restated per page. `planTo` lets a page point the
 * secondary action at a different destination of its own choosing.
 */
export default function ConciergeCta({
  title = "Ingin Mengunjungi Salah Satu Destinasi Impian Ini?",
  description = "Biarkan tim concierge Cakra Lima Tujuh mengurus seluruh detail perjalanan Anda: mulai dari pemilihan armada eksekutif, supir berlisensi pariwisata, hingga akomodasi resor terpilih di tiap titik rute.",
  planLabel = "Rancang Custom Itinerary",
  planTo = "/open-trip",
  planIcon = "edit_calendar",
  whatsAppHref = `https://wa.me/${CONCIERGE_WHATSAPP}`,
}) {
  return (
    <section
      className="relative w-full overflow-hidden bg-c57-inverse-surface py-20 text-c57-inverse-on-surface"
      aria-labelledby="concierge-cta-title"
    >
      {/* Atmospheric wash: two blurred orbs, decorative only. */}
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-c57-primary/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-c57-tertiary-container/25 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 md:px-10 lg:grid-cols-12">
        {/* Left: pitch + the four pillars. */}
        <div className="space-y-6 lg:col-span-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-c57-primary/20 px-3.5 py-1 font-label-sm uppercase tracking-[0.2em] text-c57-primary-fixed">
            <span className="h-1.5 w-1.5 rounded-full bg-c57-primary-fixed" />
            Bespoke Private Itinerary
          </p>
          <h2
            id="concierge-cta-title"
            className="font-headline-lg text-headline-lg-mobile leading-tight text-c57-surface-bright md:text-headline-lg"
          >
            {title}
          </h2>
          <p className="max-w-xl font-body-md leading-relaxed text-c57-surface-variant">
            {description}
          </p>

          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="flex items-start gap-3">
                <Icon
                  name={pillar.icon}
                  size="sm"
                  className="mt-0.5 shrink-0 text-c57-primary-fixed"
                />
                <div>
                  <span className="block font-label-md text-label-md text-c57-surface-bright">
                    {pillar.title}
                  </span>
                  <span className="font-body-sm text-body-sm text-c57-surface-container-high">
                    {pillar.body}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: the two actions. */}
        <div className="lg:col-span-5">
          <div className="space-y-6 rounded-2xl bg-c57-surface-container-lowest/5 p-8 backdrop-blur-md">
            <div className="space-y-1">
              <span className="font-label-sm uppercase tracking-widest text-c57-tertiary-fixed-dim">
                Layanan Eksklusif Konsultasi 24/7
              </span>
              <h3 className="font-headline-sm text-headline-sm text-c57-surface-bright">
                Mulai Konsultasi Rute Pribadi
              </h3>
              <p className="font-body-sm text-body-sm text-c57-surface-variant">
                Hubungi specialist perjalanan kami untuk penawaran instan dalam
                hitungan menit.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-c57-available-text px-6 py-3.5 font-label-md uppercase tracking-wider text-white shadow-md transition-all duration-300 hover:bg-c57-available-text/85"
              >
                <Icon
                  name="chat"
                  size="sm"
                  className="transition-transform group-hover:scale-110"
                />
                Konsultasi via WhatsApp
              </a>
              <Link
                to={planTo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-c57-primary-container px-6 py-3.5 font-label-md uppercase tracking-wider text-c57-on-primary shadow-md transition-all duration-300 hover:bg-c57-primary"
              >
                <Icon name={planIcon} size="sm" />
                {planLabel}
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 font-label-sm text-label-sm text-c57-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-c57-available-text" />
                Fast Response &lt; 5 Menit
              </span>
              <span>&bull;</span>
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
