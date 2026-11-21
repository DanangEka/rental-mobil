import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { EDITORIAL_EASE, EDITORIAL_VIEWPORT, fadeUp } from "../motion/editorial";
import { ElfsightWidget } from "react-elfsight-widget";
import { Icon } from "../components/ui";
import LandingStories from "../components/LandingStories";
import FeaturedJourneys from "../components/FeaturedJourneys";
import aboutTravelers from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.38.webp";
import aboutBromo from "../assets/testimoni/IMG_4350.JPG";

/* Free-to-use Unsplash photography. The warm photo treatment and paper
   gradients keep it inside the Cakra Atlas world rather than reading as
   stock imagery dropped onto a page. */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2200&auto=format&fit=crop&q=82";
const CTA_IMAGE =
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=2000&auto=format&fit=crop&q=80";

const DESTINATIONS = [
  {
    label: "Jawa",
    line: "Borobudur, Bromo & warisan keraton",
    image:
      "https://images.unsplash.com/photo-1566559532224-6d65e9fc0f37?w=1100&auto=format&fit=crop&q=80",
    to: "/destinasi/jawa",
  },
  {
    label: "Bali",
    line: "Pura, terasering & ketenangan pulau",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1100&auto=format&fit=crop&q=80",
    to: "/destinasi/bali",
  },
  {
    label: "Indonesia",
    line: "Dari Raja Ampat hingga Labuan Bajo",
    image:
      "https://images.unsplash.com/photo-1745917784557-a93bf209232c?w=1100&auto=format&fit=crop&q=80",
    to: "/destinasi/indonesia",
  },
];

const SERVICES = [
  { name: "Open Trip", detail: "Gabung dengan peserta lain dan pilih jadwal perjalanan yang tersedia.", icon: "group", path: "/open-trip", action: "Lihat open trip" },
  { name: "Private Trip", detail: "Perjalanan untuk keluarga atau rombongan Anda sendiri, tanpa peserta lain.", icon: "map", path: "/tour-packages?category=private", action: "Lihat private trip" },
  { name: "Custom Trip", detail: "Tentukan destinasi, waktu, dan kebutuhan. Tim kami membantu menyusun rencananya.", icon: "edit_note", path: "/trip-planner", action: "Rancang custom trip" },
];

const ABOUT_IMAGES = {
  friends: aboutTravelers,
  bromo: aboutBromo,
};

const LOCATIONS = [
  {
    city: "Surabaya",
    label: "Kantor Pusat",
    address: "Lembah Harapan Blok AA-57, Lidah Wetan, Lakarsantri",
  },
  {
    city: "Sidoarjo",
    label: "Bandara Juanda",
    address: "Antar-jemput 24 jam · Jawa Timur",
  },
  {
    city: "Bromo",
    label: "Basecamp Trip",
    address: "Probolinggo & Malang · Jawa Timur",
  },
];

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  /* Hero entrance is a mount animation, not an in-view reveal, so it gets a
     tighter clock than the 0.9s fadeUp used below the fold: type rises fast,
     the underline under the italic word draws as the type lands, and the
     whole sequence settles inside a second. The photo settles more slowly
     behind it — scale, not opacity, so it paints immediately (LCP). */
  const heroRise = {
    hidden: { opacity: 0, y: 24 },
    show: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, delay, ease: EDITORIAL_EASE },
    }),
  };


  return (
    <div className="min-h-screen bg-c57-surface text-c57-on-surface">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO — the mountain runs under the transparent header. Ink type on
          the washed sky; one dark action, one quiet link.
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden pb-10 pt-32 sm:pt-36">
        <motion.img
          src={HERO_IMAGE}
          alt="Lautan awan di antara puncak gunung saat matahari terbit"
          className="photo-warm absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          initial={reduceMotion ? false : { scale: 1.07 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: EDITORIAL_EASE }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-c57-surface/80 via-c57-surface/35 to-c57-surface" />
        <div className="absolute inset-0 bg-c57-surface/15" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-c57-surface/35 blur-[90px]"
          aria-hidden="true"
        />

        <motion.div
          initial={reduceMotion ? "show" : "hidden"}
          animate="show"
          className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 text-center"
        >
          <motion.h1
            variants={heroRise}
            custom={0.05}
            className="text-balance font-display text-[clamp(2.9rem,7.4vw,6rem)] font-normal leading-[0.98] tracking-[-0.025em] text-c57-on-surface"
          >
            Temukan Indonesia
            <br />
            <span className="relative">
              <em className="font-normal italic text-c57-primary">yang sesungguhnya</em>
              {/* The underline draws as the line of type lands — a held
                  breath on the one italic word. */}
              <motion.span
                aria-hidden="true"
                className="absolute bottom-[-0.02em] left-0 h-[0.06em] w-full origin-left bg-c57-accent-line"
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.45, ease: EDITORIAL_EASE }}
              />
            </span>
          </motion.h1>

          <motion.p
            variants={heroRise}
            custom={0.16}
            className="measure mt-7 text-pretty text-body-md leading-relaxed text-c57-on-surface-variant sm:text-body-lg"
          >
            Tour & travel dari Surabaya untuk menjelajahi Indonesia. Pilih open trip,
            nikmati private trip, atau rancang perjalanan sesuai keinginan Anda.
          </motion.p>

          <motion.div
            variants={heroRise}
            custom={0.27}
            className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:gap-7"
          >
            <Link
              to="/tour-packages"
              className="group inline-flex items-center gap-3 rounded-full bg-c57-primary-container py-3 pl-7 pr-3 font-label-md text-label-md uppercase tracking-[0.14em] text-c57-on-primary transition-all duration-500 hover:bg-c57-tertiary-container"
            >
              Lihat Paket Wisata
              <span className="round-arrow">
                <Icon name="north_east" size="sm" />
              </span>
            </Link>
            <Link
              to="/trip-planner"
              className="group inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-[0.14em] text-c57-on-surface-variant transition-colors hover:text-c57-on-surface"
            >
              Rancang Custom Trip
              <span className="h-px w-6 bg-c57-on-surface-variant/60 transition-all duration-300 group-hover:w-9 group-hover:bg-c57-accent-line" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 font-label-sm text-label-sm uppercase tracking-[0.24em] text-c57-on-surface-variant"
        >
          <span className="hidden sm:inline">Surabaya · Sejak 2014</span>
          <span className="flex items-center gap-2">
            Gulir untuk menjelajah
            <motion.span
              aria-hidden="true"
              className="inline-flex"
              animate={reduceMotion ? undefined : { y: [0, 4, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <Icon name="south" size="sm" />
            </motion.span>
          </span>
          <span className="hidden sm:inline">cakra57.com</span>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SERVICES — a quiet ledger, not an icon-card grid
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32" aria-labelledby="services-heading">
        <div className="editorial-shell grid gap-12 md:grid-cols-12 md:gap-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={EDITORIAL_VIEWPORT}
            variants={fadeUp}
            className="md:col-span-4"
          >
            <p className="mb-4 font-label-sm text-label-sm uppercase tracking-[0.28em] text-c57-on-surface-variant">
              Pilihan perjalanan
            </p>
            <h2
              id="services-heading"
              className="font-display text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] tracking-[-0.02em]"
            >
              Pilih perjalanan <em className="italic">sesuai cara Anda</em>
            </h2>
            <p className="mt-5 text-body-sm leading-relaxed text-c57-on-surface-variant">
              Ingin berangkat bersama peserta lain, hanya dengan rombongan sendiri,
              atau punya rencana khusus? Mulai dari pilihan yang paling cocok.
            </p>
            <Link
              to="/tour-packages"
              className="group mt-8 inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-on-surface-variant transition-colors hover:text-c57-on-surface"
            >
              Lihat Paket Wisata
              <Icon name="arrow_forward" size="sm" className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <div className="md:col-span-8">
            <ul className="divide-y divide-c57-outline-variant/50">
              {SERVICES.map((svc, i) => (
                <motion.li
                  key={svc.name}
                  initial="hidden"
                  whileInView="show"
                  viewport={EDITORIAL_VIEWPORT}
                  variants={fadeUp}
                  custom={i * 0.06}
                >
                  <Link
                    to={svc.path}
                    className="group flex w-full items-center gap-5 py-5 text-left transition-colors sm:gap-7 sm:py-6"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-c57-surface-container text-c57-on-surface-variant transition-all duration-500 group-hover:bg-c57-primary-container group-hover:text-c57-on-primary sm:h-12 sm:w-12">
                      <Icon name={svc.icon} size="sm" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-[1.15rem] leading-snug tracking-[-0.01em] text-c57-on-surface group-hover:text-c57-primary transition-colors">
                        {svc.name}
                      </span>
                      <span className="mt-0.5 block text-body-sm text-c57-on-surface-variant">
                        {svc.detail}
                      </span>
                    </span>
                    <span className="hidden shrink-0 font-label-sm text-label-sm text-c57-primary lg:block">
                      {svc.action}
                    </span>
                    <Icon
                      name="north_east"
                      size="sm"
                      className="shrink-0 text-c57-on-surface-variant/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-c57-primary"
                    />
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
        <div className="editorial-shell mt-10">
          <div className="flex flex-col gap-4 border-t border-c57-outline-variant/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-body-sm leading-relaxed text-c57-on-surface-variant">
              Hanya membutuhkan kendaraan? Rental mobil dan airport transfer juga tersedia.
            </p>
            <Link to="/home" className="inline-flex min-h-[44px] shrink-0 items-center gap-2 font-label-sm text-label-sm text-c57-on-surface-variant transition-colors hover:text-c57-primary">
              Lihat layanan kendaraan <Icon name="arrow_forward" size="sm" />
            </Link>
          </div>
        </div>
      </section>

      <FeaturedJourneys />

      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="editorial-shell">
          <motion.p initial="hidden" whileInView="show" viewport={EDITORIAL_VIEWPORT} variants={fadeUp} className="mx-auto max-w-5xl text-balance text-center font-display text-[clamp(1.85rem,4.1vw,3.35rem)] font-normal leading-[1.16] tracking-[-0.02em] text-c57-on-surface">
            Kami percaya perjalanan bukan sekadar berpindah tempat
            <span className="mx-2 inline-flex h-[0.82em] w-[1.55em] -translate-y-[0.04em] overflow-hidden rounded-full align-middle ring-1 ring-c57-on-surface/10"><img src={ABOUT_IMAGES.friends} alt="" aria-hidden="true" className="photo-warm h-full w-full object-cover" loading="lazy" /></span>
            — tetapi cara menemukan diri, budaya, dan cerita
            <span className="mx-2 inline-flex h-[0.82em] w-[1.55em] -translate-y-[0.04em] overflow-hidden rounded-full align-middle ring-1 ring-c57-on-surface/10"><img src={ABOUT_IMAGES.bromo} alt="" aria-hidden="true" className="photo-warm h-full w-full object-cover" loading="lazy" /></span>
            yang tidak pernah ada di panduan mana pun.
          </motion.p>
          <motion.div initial="hidden" whileInView="show" viewport={EDITORIAL_VIEWPORT} variants={fadeUp} className="mt-12 flex flex-col items-center gap-3">
            <span className="h-10 w-px bg-c57-outline-variant" />
            <p className="font-label-sm text-label-sm uppercase tracking-[0.3em] text-c57-on-surface-variant">Cakra Lima Tujuh · Surabaya</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DESTINATION TRIO
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-24 sm:pb-32" aria-labelledby="destinations-heading">
        <div className="editorial-shell">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <h2
                id="destinations-heading"
                className="max-w-2xl font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em]"
              >
                Tiga dunia, <em className="italic">satu perjalanan</em>
              </h2>
            </div>
            <Link
              to="/discovery"
              className="group hidden shrink-0 items-center gap-2 pb-1 font-label-md text-label-md uppercase tracking-[0.16em] text-c57-on-surface-variant transition-colors hover:text-c57-on-surface sm:inline-flex"
            >
              Semua destinasi
              <Icon name="arrow_forward" size="sm" className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {DESTINATIONS.map((dest, i) => (
              <motion.div
                key={dest.label}
                initial="hidden"
                whileInView="show"
                viewport={EDITORIAL_VIEWPORT}
                variants={fadeUp}
                custom={i * 0.08}
              >
                <Link
                  to={dest.to}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-[1.15rem] bg-c57-surface-container"
                >
                  <img
                    src={dest.image}
                    alt={`Destinasi ${dest.label}`}
                    className="photo-warm absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-editorial group-hover:scale-[1.06]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/80 via-c57-scrim/10 to-c57-scrim/5" />
                  <div className="absolute inset-0 bg-gradient-to-b from-c57-scrim/20 to-transparent" />

                  <div className="absolute inset-x-0 top-0 p-5 sm:p-6">
                    <h3 className="font-display text-[1.7rem] leading-tight text-c57-surface-bright">
                      {dest.label}
                    </h3>
                    <p className="mt-1.5 max-w-[24ch] text-body-sm leading-snug text-c57-surface-bright/85">
                      {dest.line}
                    </p>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 sm:p-5">
                    <span className="rounded-full border border-c57-surface-bright/30 bg-c57-surface-bright/10 px-4 py-2 font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-surface-bright backdrop-blur-md transition-colors duration-500 group-hover:bg-c57-surface-bright group-hover:text-c57-scrim">
                      Jelajahi
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-c57-tertiary-container text-c57-on-tertiary-container transition-all duration-500 group-hover:translate-x-1 group-hover:bg-c57-accent-line group-hover:text-c57-scrim">
                      <Icon name="north_east" size="sm" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LandingStories />

      {/* ═══════════════════════════════════════════════════════════════════
          GOOGLE REVIEWS — Elfsight widget
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-c57-surface-container-low py-20 sm:py-28" aria-label="Ulasan Google">
        <div className="editorial-shell">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={EDITORIAL_VIEWPORT}
            variants={fadeUp}
            className="mb-10 text-center"
          >
            <p className="mb-3 font-label-sm text-label-sm uppercase tracking-[0.28em] text-c57-on-surface-variant">
              Suara pelanggan
            </p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] tracking-[-0.02em]">
              Apa kata mereka
            </h2>
          </motion.div>
          <ElfsightWidget
            widgetId="9e1ea109-b04f-462c-9b6f-a2d202491384"
            lazy="in-viewport"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA — the mountain image closes the page with a quiet invitation
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-32 sm:py-40" aria-label="Mulai perjalanan">
        <img
          src={CTA_IMAGE}
          alt="Puncak gunung berlapis salju dengan langit biru cerah"
          className="photo-warm absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-c57-scrim/70 to-c57-scrim/90" />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={EDITORIAL_VIEWPORT}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-3xl px-5 text-center"
        >
          <p className="mb-5 font-label-sm text-label-sm uppercase tracking-[0.28em] text-c57-on-scrim/60">
            Perjalanan menanti
          </p>
          <h2 className="text-balance font-display text-[clamp(2.4rem,5.5vw,4.4rem)] font-normal leading-[1.03] tracking-[-0.025em] text-c57-surface-bright">
            Siap menjelajah
            <br />
            <em className="italic text-c57-accent-line">Indonesia bersama kami?</em>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-body-sm leading-relaxed text-c57-on-scrim/70">
            Konsultasi gratis, itinerary yang dikurasi, dan tim yang selalu ada
            untuk Anda — mulai dari Surabaya ke mana pun Anda ingin pergi.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/tour-packages"
              className="group inline-flex items-center gap-3 rounded-full bg-c57-surface-bright py-3 pl-7 pr-3 font-label-md text-label-md uppercase tracking-[0.14em] text-c57-scrim transition-all duration-500 hover:bg-c57-accent-line"
            >
              Lihat Paket Wisata
              <span className="round-arrow bg-c57-scrim text-c57-surface-bright">
                <Icon name="north_east" size="sm" />
              </span>
            </Link>
            <a
              href="https://wa.me/6287859660053"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-[0.14em] text-c57-on-scrim/70 transition-colors hover:text-c57-surface-bright"
            >
              <Icon name="phone" size="sm" />
              Konsultasi via WhatsApp
            </a>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          LOCATIONS
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" aria-label="Lokasi kami">
        <div className="editorial-shell">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={EDITORIAL_VIEWPORT}
            variants={fadeUp}
            className="grid gap-6 sm:grid-cols-3"
          >
            {LOCATIONS.map((loc) => (
              <div key={loc.city} className="border-t border-c57-outline-variant pt-5">
                <p className="font-label-sm text-label-sm uppercase tracking-[0.24em] text-c57-on-surface-variant">
                  {loc.label}
                </p>
                <p className="mt-2 font-display text-[1.5rem] leading-tight tracking-[-0.01em]">
                  {loc.city}
                </p>
                <p className="mt-2 text-body-sm text-c57-on-surface-variant">{loc.address}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
