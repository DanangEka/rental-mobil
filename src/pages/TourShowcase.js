import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";

import ConciergeCta from "../components/ConciergeCta";
import { bespokeJourneys } from "../data/bespokeJourneys";
import { db } from "../services/firebase";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import { useEditorialReveal } from "../motion/editorial";
import {
  ARMADA_OPTIONS,
  PAX_OPTIONS,
  PRICE_BUCKETS,
  REGION_BUCKETS,
  availablePeriods,
  buildConsultationMessage,
  filterByPeriod,
  filterJourneys,
  formatRupiah,
  normalizeOpenTrip,
  normalizePaketWisata,
  tripInquiryMessage,
  whatsappLink,
} from "../utils/tourShowcase";

/**
 * Tour showcase.
 *
 * Three sources feed this page, and the differences between them are the whole
 * reason the normalisation lives in `utils/tourShowcase`:
 *
 *   open_trips     — scheduled departures, written by AdminOpenTrip, carries
 *                    the quota fields the progress bar needs
 *   paket_wisata   — priced packages, written by AdminTourPackages
 *   bespokeJourneys — hand-written private journeys, no collection behind them
 *
 * This page is additive. `/tour-packages` and `/open-trip` are untouched, so
 * the existing request flow with its auth gate and SLA keeps working.
 */

const CATEGORIES = [
  { key: "semua", label: "Semua Kategori" },
  { key: "open_trip", label: "Open Trip Terjadwal" },
  { key: "paket_privat", label: "Paket Wisata Privat" },
  { key: "bespoke", label: "Bespoke Itinerary" },
];

const QUICK_FILTERS = [
  "Bromo Sunrise",
  "Kawah Ijen Blue Fire",
  "Borobudur VIP",
  "Nusa Penida Secret",
  "Dieng Highland",
];

/** Hero proof points. */
const HERO_BADGES = [
  { icon: "event_available", title: "Pasti Berangkat", body: "Tanpa Kuota Minimum" },
  { icon: "verified_user", title: "Pemandu Lisensi", body: "BNSP & HPI Resmi" },
  { icon: "directions_car", title: "Armada Muda", body: "Maksimal 3 Tahun Pakai" },
  { icon: "security", title: "Skema DP 50%", body: "Aman & Terproteksi" },
];

/** The "Komitmen Unggul" pillars. */
const PILLARS = [
  {
    icon: "receipt_long",
    title: "Bebas Biaya Tersembunyi",
    body: "Tarif all-in telah mencakup bahan bakar, tol, tiket retribusi, parkir, hingga akomodasi & konsumsi chauffeur. Tidak ada pungutan susulan di tengah perjalanan.",
    tag: "Transparansi 100%",
  },
  {
    icon: "minor_crash",
    title: "Armada Bintang Lima",
    body: "Semua kendaraan dirawat berkala hanya di bengkel resmi ATPM dengan rekam jejak presisi. Kabin disterilisasi sebelum penjemputan, wangi aromaterapi alami, dan AC ganda prima.",
    tag: "Inspeksi 21 Titik",
  },
  {
    icon: "badge",
    title: "Chauffeur Beretika & Santun",
    body: "Dididik khusus dalam tata krama hospitality VIP dan bersertifikasi BNSP pariwisata. Menguasai navigasi alternatif tercanggih, ramah, dan sigap menjaga privasi keluarga Anda.",
    tag: "Pemandu Berlisensi",
  },
  {
    icon: "history_toggle_off",
    title: "Fleksibilitas Reschedule",
    body: "Kunci tanggal keberangkatan dengan DP 50% terlindungi invoice legal PT. Tersedia kelonggaran penyesuaian tanggal perjalanan (H-7) tanpa penalti biaya pembatalan tersembunyi.",
    tag: "Faktur Legal PT Resmi",
  },
];

const CONCIERGE_PROMISES = [
  "Respons konsultasi kilat dalam waktu kurang dari 15 menit",
  "Kustomisasi rute intercity tanpa batasan titik singgah",
  "Dukungan hotline 24 jam selama ekspedisi berlangsung",
];

/* Warm highland light, same free-to-use Unsplash set the landing page opens
   with — the showcase is the catalogue that page links into. */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1566559532224-6d65e9fc0f37?w=2000&auto=format&fit=crop&q=82";

export default function TourShowcase() {
  const reveal = useEditorialReveal();
  const [openTrips, setOpenTrips] = useState([]);
  const [paketWisata, setPaketWisata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [category, setCategory] = useState("semua");
  const [region, setRegion] = useState("semua");
  const [price, setPrice] = useState("semua");
  const [period, setPeriod] = useState("semua");

  // Both collections are public reads per firestore.rules, so no auth gate.
  useEffect(() => {
    let tripsUnsub;
    let paketUnsub;
    let cancelled = false;

    const trips = onSnapshot(
      collection(db, "open_trips"),
      (snapshot) => {
        if (cancelled) return;
        setOpenTrips(
          snapshot.docs.map((doc) => normalizeOpenTrip({ id: doc.id, ...doc.data() }))
        );
        setLoading(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("Firestore Error (open_trips):", error);
        setLoadError("Gagal memuat jadwal open trip.");
        setLoading(false);
      }
    );

    const paket = onSnapshot(
      collection(db, "paket_wisata"),
      (snapshot) => {
        if (cancelled) return;
        setPaketWisata(
          snapshot.docs.map((doc) => normalizePaketWisata({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        if (cancelled) return;
        console.error("Firestore Error (paket_wisata):", error);
      }
    );

    tripsUnsub = trips;
    paketUnsub = paket;
    return () => {
      cancelled = true;
      tripsUnsub?.();
      paketUnsub?.();
    };
  }, []);

  const showOpenTrips = category === "semua" || category === "open_trip";
  const showPaket = category === "semua" || category === "paket_privat";
  const showBespoke = category === "semua" || category === "bespoke";

  const visibleTrips = useMemo(
    () => (showOpenTrips ? filterJourneys(filterByPeriod(openTrips, period), { region, price }) : []),
    [showOpenTrips, openTrips, period, region, price]
  );

  const visiblePaket = useMemo(
    () => (showPaket ? filterJourneys(paketWisata, { region, price }) : []),
    [showPaket, paketWisata, region, price]
  );

  const periods = useMemo(() => availablePeriods(openTrips), [openTrips]);

  const resetFilters = () => {
    setRegion("semua");
    setPrice("semua");
    setPeriod("semua");
  };

  return (
    <div className="min-h-screen bg-c57-surface text-c57-on-surface">
      <Hero />

      <FilterPanel
        region={region}
        onRegion={setRegion}
        price={price}
        onPrice={setPrice}
        period={period}
        onPeriod={setPeriod}
        periods={periods}
      />

      <div className="editorial-shell pb-24">
        <CategoryTabs category={category} onCategory={setCategory} />

        {loadError && (
          <p className="mt-8 rounded-c57-lg border border-c57-error-container bg-c57-error-container/40 px-5 py-4 font-body-sm text-body-sm text-c57-on-error-container">
            {loadError} Data yang sudah dimuat tetap bisa dibaca.
          </p>
        )}

        {showOpenTrips && (
          <Section
            eyebrow="Koleksi Terjadwal"
            title="Jadwal Open Trip Terdekat"
            description="Pemberangkatan terjadwal bersama sesama penikmat lanskap Nusantara, tanpa kuota minimum."
          >
            {loading ? (
              <GridSkeleton />
            ) : visibleTrips.length === 0 ? (
              <EmptyState
                icon="event_available"
                title="Belum ada jadwal yang cocok"
                description="Belum ada open trip pada filter ini. Tim kami bisa menyusun jadwal privat untuk rute yang Anda inginkan."
                action="Reset Filter"
                onAction={resetFilters}
                className="py-20"
              />
            ) : (
              <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                {visibleTrips.map((trip, i) => (
                  <motion.div key={trip.id} {...reveal(Math.min(i, 4) * 0.06)}>
                    <OpenTripCard trip={trip} />
                  </motion.div>
                ))}
              </div>
            )}
          </Section>
        )}

        {showPaket && (
          <Section
            eyebrow="Kurasi Privat"
            title="Paket Wisata Privat"
            description="Paket harga tetap dengan fasilitas lengkap, disusun untuk keluarga maupun kolega."
          >
            {visiblePaket.length === 0 ? (
              <EmptyState
                icon="luggage"
                title="Belum ada paket privat"
                description="Paket privat yang cocok belum tersedia. Konsultasikan rute custom Anda langsung ke tim kami."
                action="Konsultasi via WhatsApp"
                onAction={() => window.open(whatsappLink(buildConsultationMessage()), "_blank", "noopener")}
                className="py-20"
              />
            ) : (
              <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                {visiblePaket.map((paket, i) => (
                  <motion.div key={paket.id} {...reveal(Math.min(i, 4) * 0.06)}>
                    <PaketCard paket={paket} />
                  </motion.div>
                ))}
              </div>
            )}
          </Section>
        )}

        {showBespoke && (
          <Section
            eyebrow="Bespoke Itinerary"
            title="Perjalanan Privat yang Dirancang Untuk Anda"
            description="Rute, akomodasi, dan pengalaman disesuaikan penuh. Harga di bawah adalah titik awal, bukan offer."
          >
            <div className="space-y-8">
              {bespokeJourneys.map((journey, i) => (
                <motion.div key={journey.id} {...reveal(Math.min(i, 4) * 0.06)}>
                  <BespokeCard journey={journey} />
                </motion.div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <PillarsSection />
      <ConsultationForm />

      <ConciergeCta
        title="Siap Menyusun Perjalanan Privat Anda?"
        description="Ceritakan rute yang Anda impikan, dan tim concierge kami akan menyusun itinerary, estimasi tarif, serta rekomendasi armada terbaik."
        planLabel="Mulai Konsultasi"
        planTo="/destinasi/jawa/gunung-bromo"
        planIcon="explore"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero + filters                                                      */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative w-full overflow-hidden pb-14 pt-32 sm:pt-40">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={HERO_IMAGE}
          alt=""
          className="photo-warm h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-c57-surface/95 via-c57-surface/80 to-c57-surface" />
      </div>

      <div className="editorial-shell relative flex flex-col items-start">
        <p className="inline-flex items-center gap-2.5 rounded-full border border-c57-outline/40 bg-c57-surface-container-lowest/80 px-4 py-1.5 font-label-sm uppercase tracking-[0.24em] text-c57-secondary backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-c57-secondary" />
          Curated Overland &amp; Archipelago Expeditions
        </p>

        <div className="mt-8 max-w-4xl space-y-6">
          <h1 className="font-display text-[clamp(2.6rem,5.6vw,4.6rem)] font-normal leading-[0.98] tracking-[-0.03em] text-c57-on-surface">
            Jelajahi Setiap Detik, Rencanakan{" "}
            <em className="font-normal italic text-c57-secondary">Kenangan Terbaik</em>.
          </h1>
          <p className="max-w-2xl text-[0.98rem] leading-relaxed text-c57-on-surface-variant">
            Pilih petualangan terjadwal bersama sesama penikmat lanskap Nusantara (
            <span className="font-medium text-c57-on-surface">Open Trip</span>)
            atau nikmati kenyamanan privat tanpa kompromi bersama keluarga dan
            kolega (
            <span className="font-medium text-c57-on-surface">
              Private Trip &amp; Bespoke Itinerary
            </span>
            ).
          </p>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-x-8 gap-y-6 border-y border-c57-outline-variant/70 bg-c57-surface-container-lowest/60 px-6 py-7 sm:grid-cols-2 md:grid-cols-4">
          {HERO_BADGES.map((badge) => (
            <div key={badge.title} className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-c57-surface-container">
                <Icon name={badge.icon} size="lg" className="text-c57-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-wider text-c57-on-surface">
                  {badge.title}
                </span>
                <span className="font-body-sm text-body-sm text-c57-on-surface-variant">
                  {badge.body}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterPanel({ region, onRegion, price, onPrice, period, onPeriod, periods }) {
  return (
    <section className="editorial-shell relative z-20 -mt-4">
      <div className="rounded-c57-lg border border-c57-outline-variant/70 bg-c57-surface-container-lowest p-6 shadow-c57-card">
        <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
          <FilterSelect
            label="Wilayah Eksplorasi"
            icon="explore"
            value={region}
            onChange={onRegion}
            options={[
              { value: "semua", label: "Semua Wilayah" },
              ...REGION_BUCKETS.map((b) => ({ value: b.key, label: b.label })),
            ]}
          />
          <FilterSelect
            label="Periode Keberangkatan"
            icon="calendar_month"
            value={period}
            onChange={onPeriod}
            options={[
              { value: "semua", label: "Semua Periode" },
              ...periods.map((p) => ({ value: p, label: p })),
            ]}
          />
          <FilterSelect
            label="Rentang Investasi"
            icon="payments"
            value={price}
            onChange={onPrice}
            options={PRICE_BUCKETS.map((b) => ({ value: b.key, label: b.label }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-6">
          <span className="mr-2 font-label-sm uppercase tracking-widest text-c57-secondary">
            Destinasi Populer:
          </span>
          {QUICK_FILTERS.map((label) => (
            <button
              key={label}
              onClick={() => onRegion(quickFilterRegion(label))}
              className="rounded-full bg-c57-surface-container px-4 py-1.5 font-label-sm uppercase text-c57-on-surface transition-colors hover:bg-c57-primary hover:text-c57-on-primary"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ label, icon, value, onChange, options }) {
  return (
    <div className="flex flex-col justify-between rounded-c57-md bg-c57-surface-container-low p-4 transition-colors hover:bg-c57-surface-container">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
          {label}
        </span>
        <Icon name={icon} size="md" className="text-c57-secondary" />
      </div>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="border-0 bg-transparent px-0 text-[1.05rem] font-medium text-c57-on-surface focus:border-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function CategoryTabs({ category, onCategory }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-16">
      {CATEGORIES.map((item) => {
        const active = category === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onCategory(item.key)}
            aria-pressed={active}
            className={`rounded-full px-6 py-2.5 font-label-md uppercase tracking-wider transition-colors ${
              active
                ? "bg-c57-primary text-c57-on-primary shadow-sm"
                : "text-c57-on-surface-variant hover:bg-c57-surface-container hover:text-c57-on-surface"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

function Section({ eyebrow, title, description, children }) {
  return (
    <section className="pt-20">
      <div className="mb-10 max-w-3xl">
        <p className="flex items-center gap-3 font-label-sm uppercase tracking-[0.28em] text-c57-secondary">
          <span className="accent-line" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 className="mt-4 font-display text-[clamp(2rem,3.8vw,3.1rem)] font-normal leading-[1.04] tracking-[-0.02em] text-c57-on-surface">
          {title}
        </h2>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-c57-on-surface-variant">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

function OpenTripCard({ trip }) {
  const full = trip.sisaKursi === 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.4rem] border border-c57-surface-variant bg-c57-surface-container-lowest shadow-c57-card transition-all duration-500 hover:-translate-y-1 hover:shadow-c57-card-hover">
      <div className="relative h-64 overflow-hidden">
        <div
          className="photo-warm h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${trip.imageUrl || ""})` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-c57-scrim/80 via-transparent to-c57-scrim/20"
          aria-hidden="true"
        />
        <span className="absolute left-4 top-4 rounded-full bg-c57-surface-bright/95 px-3 py-1 font-label-sm uppercase tracking-wider text-c57-on-surface shadow-sm backdrop-blur-md">
          {trip.durasi || "Jadwal Terjadwal"}
        </span>
        <span
          className={`absolute right-4 top-4 rounded-full px-3 py-1 font-label-sm uppercase tracking-wider shadow-sm ${
            full ? "bg-c57-on-surface-variant text-white" : "bg-c57-error-container text-c57-on-error-container"
          }`}
        >
          {full ? "Kursi Penuh" : `Sisa ${trip.sisaKursi} Kursi`}
        </span>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="font-label-sm uppercase tracking-[0.2em] text-c57-accent-line">
            {trip.tanggalLabel}
          </span>
          <p className="mt-0.5 font-display text-[1.5rem] leading-tight">
            {trip.judul}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-6 p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="font-label-sm uppercase tracking-widest text-c57-secondary">
              Fasilitas Utama:
            </span>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-on-surface-variant">
                <Icon name="check_circle" size="sm" className="text-c57-secondary" />
                {trip.mobilUtama || "Armada tour"}
              </li>
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-on-surface-variant">
                <Icon name="check_circle" size="sm" className="text-c57-secondary" />
                {trip.destinasi}
              </li>
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-on-surface-variant">
                <Icon name="check_circle" size="sm" className="text-c57-secondary" />
                Titik kumpul {trip.titikKumpul || "sesuai konfirmasi"}
              </li>
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-on-surface-variant">
                <Icon name="check_circle" size="sm" className="text-c57-secondary" />
                Dokumentasi foto beresolusi tinggi
              </li>
            </ul>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between font-label-sm text-label-sm text-c57-secondary">
              <span>Keterisian Kuota</span>
              <span className="font-semibold text-c57-on-surface">
                {trip.kuotaTerisi} / {trip.kapasitasMaks} Terisi
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-c57-surface-container"
              role="progressbar"
              aria-valuenow={trip.persenTerisi}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Keterisian kursi ${trip.judul}`}
            >
              <div
                className="h-full rounded-full bg-c57-secondary"
                style={{ width: `${trip.persenTerisi}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-label-sm uppercase tracking-wider text-c57-secondary">
              Tarif per Orang
            </span>
            <div className="text-right">
              <span className="font-display text-[1.6rem] leading-none text-c57-on-surface">
                {formatRupiah(trip.hargaPerPax)}
              </span>
              <span className="-mt-1 block font-body-sm text-body-sm text-c57-secondary">
                / pax all-in
              </span>
            </div>
          </div>
          <Button
            onClick={() =>
              window.open(whatsappLink(tripInquiryMessage(trip)), "_blank", "noopener")
            }
            className="w-full"
            icon="arrow_forward"
          >
            Reservasi Kursi
          </Button>
        </div>
      </div>
    </article>
  );
}

function PaketCard({ paket }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.4rem] border border-c57-surface-variant bg-c57-surface-container-lowest shadow-c57-card transition-all duration-500 hover:-translate-y-1 hover:shadow-c57-card-hover">
      <div className="relative h-56 overflow-hidden">
        {paket.imageUrl ? (
          <img
            src={paket.imageUrl}
            alt={paket.judul}
            loading="lazy"
            className="h-full w-full object-cover photo-warm transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-c57-surface-container" aria-hidden="true" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-c57-scrim/75 to-transparent"
          aria-hidden="true"
        />
        {paket.durasi && (
          <span className="absolute left-4 top-4 rounded-full bg-c57-surface-bright/95 px-3 py-1 font-label-sm uppercase tracking-wider text-c57-on-surface shadow-sm">
            {paket.durasi}
          </span>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <span className="font-label-sm uppercase tracking-[0.2em] text-c57-accent-line">
            {paket.destinasi}
          </span>
          <p className="mt-0.5 font-display text-[1.5rem] leading-tight text-white">
            {paket.judul}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-5 p-6">
        {paket.description && (
          <p className="font-body-sm leading-relaxed text-c57-on-surface-variant">
            {paket.description}
          </p>
        )}

        {paket.fasilitas.length > 0 && (
          <ul className="space-y-1.5">
            {paket.fasilitas.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 font-body-sm text-body-sm text-c57-on-surface-variant"
              >
                <Icon name="check_circle" size="sm" className="text-c57-secondary" />
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-label-sm uppercase tracking-wider text-c57-secondary">
              Mulai Dari
            </span>
            <span className="font-display text-[1.6rem] leading-none text-c57-on-surface">
              {formatRupiah(paket.harga)}
            </span>
          </div>
          <Button
            onClick={() =>
              window.open(
                whatsappLink(
                  buildConsultationMessage({
                    destination: paket.destinasi,
                    armada: "",
                  })
                ),
                "_blank",
                "noopener"
              )
            }
            variant="secondary"
            className="w-full"
            icon="arrow_forward"
          >
            Konsultasi Paket Ini
          </Button>
        </div>
      </div>
    </article>
  );
}

function BespokeCard({ journey }) {
  // The image column swaps sides per card so a stack of three does not read as
  // a single repeated template.
  const flipped = journey.id === "east-java-highland";

  return (
    <article className="group grid grid-cols-1 overflow-hidden rounded-[1.6rem] border border-c57-surface-variant bg-c57-surface-container-lowest shadow-c57-card transition-all duration-500 hover:shadow-c57-card-hover lg:grid-cols-12">
      <div
        className={`relative min-h-[20rem] overflow-hidden lg:col-span-6 lg:min-h-[26rem] ${
          flipped ? "lg:order-2" : ""
        }`}
      >
        <img
          src={journey.image}
          alt={journey.title}
          loading="lazy"
          className="h-full w-full object-cover photo-warm transition-transform duration-1000 group-hover:scale-105"
        />
        <span className="absolute left-6 top-6 rounded-full bg-c57-surface-bright/95 px-4 py-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface shadow-md backdrop-blur-md">
          {journey.badge}
        </span>
      </div>

      <div
        className={`flex flex-col justify-between space-y-8 p-8 lg:col-span-6 lg:p-12 ${
          flipped ? "lg:order-1" : ""
        }`}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="font-label-sm uppercase tracking-[0.22em] text-c57-secondary">
              {journey.region}
            </span>
            <h3 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] leading-[1.05] text-c57-on-surface">
              {journey.title}
            </h3>
            <p className="font-body-md leading-relaxed text-c57-on-surface-variant">
              {journey.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <SpecTile label="Armada Pilihan" icon="directions_car" value={journey.armada} />
            <SpecTile label="Kurasi Akomodasi" icon="hotel" value={journey.akomodasi} />
          </div>

          <div className="space-y-2.5">
            <span className="font-label-sm uppercase tracking-widest text-c57-secondary">
              Pengalaman Eksklusif:
            </span>
            <div className="flex flex-wrap gap-2">
              {journey.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-md bg-c57-surface-container px-3 py-1 font-body-sm text-body-sm text-c57-on-surface-variant"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
          <div>
            <span className="font-label-sm uppercase tracking-widest text-c57-secondary">
              Investasi Mulai
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[1.6rem] leading-none text-c57-on-surface">
                {formatRupiah(journey.hargaMulai)}
              </span>
              <span className="font-body-sm text-body-sm text-c57-secondary">
                / orang (min. {journey.minPax} pax)
              </span>
            </div>
          </div>
          <Button
            onClick={() =>
              window.open(
                whatsappLink(
                  buildConsultationMessage({
                    destination: journey.region,
                    schedule: journey.badge,
                    armada: journey.armada,
                  })
                ),
                "_blank",
                "noopener"
              )
            }
            icon="edit_calendar"
          >
            Rancang Paket Ini
          </Button>
        </div>
      </div>
    </article>
  );
}

function SpecTile({ label, icon, value }) {
  return (
    <div className="space-y-1 rounded-[1rem] bg-c57-surface-container-low p-4">
      <span className="font-label-sm uppercase tracking-wider text-c57-secondary">{label}</span>
      <p className="flex items-center gap-1.5 font-body-md text-body-md font-medium text-c57-on-surface">
        <Icon name={icon} size="md" className="text-c57-secondary" />
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pillars + consultation                                              */
/* ------------------------------------------------------------------ */

function PillarsSection() {
  return (
    <section className="w-full bg-c57-surface-container-low py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center">
          <p className="font-label-md uppercase tracking-[0.2em] font-semibold text-c57-secondary">Komitmen Unggul</p>
          <h2 className="font-display text-[clamp(2rem,3.8vw,3.1rem)] leading-[1.04] tracking-[-0.02em] text-c57-on-surface">Standar Layanan &amp; Transparansi Mutlak</h2>
          <p className="font-body-md leading-relaxed text-c57-on-surface-variant">
            Setiap jengkal perjalanan dikawal oleh kepastian standar kelas
            hospitality, memastikan momen berharga Anda berlangsung hening, aman,
            dan tanpa kejutan tak terduga.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col justify-between space-y-4 rounded-[1.4rem] border border-c57-surface-variant bg-c57-surface-container-lowest p-6 shadow-c57-card"
            >
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-c57-surface-container text-c57-secondary">
                  <Icon name={pillar.icon} size="2xl" />
                </div>
                <h3 className="font-display text-[1.35rem] leading-tight text-c57-on-surface">
                  {pillar.title}
                </h3>
                <p className="font-body-sm leading-relaxed text-c57-on-surface-variant">
                  {pillar.body}
                </p>
              </div>
              <span className="font-label-sm uppercase tracking-wider text-c57-secondary">{pillar.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsultationForm() {
  const [form, setForm] = useState({
    destination: "",
    schedule: "",
    pax: PAX_OPTIONS[0].value,
    armada: ARMADA_OPTIONS[0],
    notes: "",
  });
  const [error, setError] = useState(null);

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    if (error) setError(null);
  };

  // Destination is the one field the concierge cannot proceed without, so it
  // is the only hard requirement. Everything else is optional because a vague
  // brief still gets a useful reply.
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.destination.trim()) {
      setError("Isi's Destinasi Tujuan terlebih dahulu.");
      return;
    }
    window.open(whatsappLink(buildConsultationMessage(form)), "_blank", "noopener");
  };

  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-c57-scrim p-8 text-c57-on-scrim shadow-c57-overlay lg:p-14">
        <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-label-sm uppercase tracking-widest text-c57-accent-line">
              <span className="h-1.5 w-1.5 rounded-full bg-c57-accent-line" />
              Private Concierge Desk
            </p>
            <h3 className="font-display text-[clamp(2rem,3.8vw,3rem)] leading-[1.05] tracking-[-0.02em]">
              Punya Rencana Perjalanan Impian Sendiri?
            </h3>
            <p className="font-body-md font-light leading-relaxed text-c57-on-scrim/65">
              Ceritakan preferensi waktu, preferensi kuliner, atau tema khusus
              perjalanan Anda. Tim Concierge Cakra Lima Tujuh akan menyusun rute
              terpersonalisasi, perhitungan estimasi tarif, dan konfirmasi unit
              armada terbaik.
            </p>
            <div className="flex flex-col gap-3 pt-4">
              {CONCIERGE_PROMISES.map((promise) => (
                <div key={promise} className="flex items-center gap-3 font-body-sm text-body-sm text-c57-on-scrim/65">
                  <Icon name="check_circle" size="lg" className="text-c57-accent-line" />
                  <span>{promise}</span>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col justify-between space-y-6 rounded-[1.2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:col-span-7 lg:p-8"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field tone="dark" label="Destinasi Tujuan" error={error} required>
                {(controlProps) => (
                  <Input
                    tone="dark"
                    {...controlProps}
                    icon="location_on"
                    error={error}
                    value={form.destination}
                    onChange={update("destination")}
                    placeholder="Contoh: Bromo, Malang & Batu"
                    className={DARK_FIELD}
                  />
                )}
              </Field>

              <Field tone="dark" label="Estimasi Tanggal / Durasi">
                {(controlProps) => (
                  <Input
                    tone="dark"
                    {...controlProps}
                    icon="event"
                    value={form.schedule}
                    onChange={update("schedule")}
                    placeholder="Contoh: 12 - 15 Mei 2025 (4D3N)"
                    className={DARK_FIELD}
                  />
                )}
              </Field>

              <Field tone="dark" label="Jumlah Peserta">
                {(controlProps) => (
                  <Select
                    tone="dark"
                    {...controlProps}
                    value={form.pax}
                    onChange={update("pax")}
                    className={DARK_FIELD}
                  >
                    {PAX_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field tone="dark" label="Pilihan Preferensi Armada">
                {(controlProps) => (
                  <Select
                    tone="dark"
                    {...controlProps}
                    value={form.armada}
                    onChange={update("armada")}
                    className={DARK_FIELD}
                  >
                    {ARMADA_OPTIONS.map((armada) => (
                      <option key={armada} value={armada}>
                        {armada}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                tone="dark"
                label="Catatan Khusus / Preferensi Akomodasi"
                className="md:col-span-2"
              >
                {(controlProps) => (
                  <Textarea
                    tone="dark"
                    {...controlProps}
                    rows={2}
                    value={form.notes}
                    onChange={update("notes")}
                    placeholder="Sertakan detail hotel bintang lima impian, diet makanan khusus, atau titik jemput bandara..."
                    className={DARK_FIELD}
                  />
                )}
              </Field>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
              <div className="flex items-center gap-2 font-body-sm text-body-sm text-c57-on-scrim/65">
                <span className="h-2 w-2 animate-pulse rounded-full bg-c57-accent-line" />
                Concierge Aktif: 2 Petugas Siaga
              </div>
              <Button type="submit" size="lg" icon="send" className="w-full sm:w-auto">
                Konsultasikan Rencana (&lt; 15 Menit)
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

/**
 * The consultation panel is dark, so the shared control treatment needs its
 * surface and border swapped back. Kept as one constant because all five
 * controls in this form must agree.
 */
const DARK_FIELD =
  "border-white/25 bg-white/10 text-white placeholder:text-white/50 focus:border-c57-accent-line hover:border-white/40";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[26rem] animate-breathe rounded-[1.4rem] bg-c57-surface-container"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * The quick-filter pills are marketing labels, not destinations, so each maps
 * to a wilayah bucket rather than to a free-text search.
 */
function quickFilterRegion(label) {
  const haystack = label.toLowerCase();
  const bucket = REGION_BUCKETS.find((b) =>
    b.keywords.some((keyword) => haystack.includes(keyword) || keyword.includes(haystack))
  );
  return bucket ? bucket.key : "semua";
}
