import destinationPhotos from "../data/destinationPhotos.json";
import DestinationPhotoCredit from "../components/DestinationPhotoCredit";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import ConciergeCta from "../components/ConciergeCta";
import DestinationTile from "../components/DestinationTile";
import { destinationSpots, moodList, regionList } from "../data/destinationSpots";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";

/**
 * The editorial collection header replaces the previous per-region photo
 * hero. The copy is constant on purpose: the archive framing is the identity
 * of the page, while the region is expressed by the filter rail underneath.
 */
const COLLECTION_LABEL = "Koleksi Perjalanan Terkurasi";
const COLLECTION_VOLUME = "Koleksi Editorial • Volume IV";
const COLLECTION_INTRO =
  "Kurasi visual lanskap tersembunyi, puncak vulkanik sakral, dan ekspedisi bahari kepulauan. Inspirasi perjalanan privat dirancang khusus dengan kehangatan concierge bintang lima.";

/**
 * Macro category labels used by the hero pills. `region` is the key these map
 * onto, so the rail stays in step with `regionList` rather than restating it.
 */
const HERO_CATEGORIES = [
  { key: "semua", label: "Semua Koleksi" },
  { key: "jawa", label: "Wisata Alam Jawa" },
  { key: "bali", label: "Pesona Bali & Nusa" },
  { key: "indonesia", label: "Kepulauan Indonesia Timur" },
  { key: "asean", label: "Eksotisme ASEAN" },
];

/**
 * The Featurette is editorial, not a destination: it advertises the bespoke
 * itinerary service and routes to the showcase page. It appears once, after the
 * fourth spot, so it reads as an aside inside the collection rather than as
 * another destination.
 */
const FEATURETTE_INDEX = 4;

const VIEW_OPTIONS = [
  { key: "masonry", icon: "grid_view", label: "Tampilan mosaik" },
  { key: "grid", icon: "bookmarks", label: "Tampilan daftar" },
];

export default function DiscoveryPage() {
  const { region: regionParam } = useParams();
  const [searchParams] = useSearchParams();
  const initialRegion = regionList.some((r) => r.key === regionParam)
    ? regionParam
    : "semua";
  const [region, setRegion] = useState(initialRegion);
  const initialMood = searchParams.get("mood");
  const [mood, setMood] = useState(
    moodList.some((m) => m.key === initialMood) ? initialMood : null
  );
  const [query, setQuery] = useState("");
  const [view, setView] = useState("masonry");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const spots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return destinationSpots.filter((s) => {
      const regionOk = region === "semua" || s.region === region;
      const moodOk = !mood || (Array.isArray(s.mood) && s.mood.includes(mood));
      const queryOk =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (Array.isArray(s.mood) &&
          s.mood.some((m) => m.toLowerCase().includes(q)));
      return regionOk && moodOk && queryOk;
    });
  }, [region, mood, query]);

  const activeRegionLabel =
    regionList.find((r) => r.key === region)?.label ?? "Semua";

  // A reset has to clear the three inputs that narrow the set; clearing only
  // the mood left a half-filtered grid behind an "empty" message that was not
  // actually empty.
  const resetFilters = () => {
    setMood(null);
    setQuery("");
    setRegion("semua");
  };

  const showFeaturette = !loading && spots.length > FEATURETTE_INDEX;

  return (
    // pt-30 = 120px clears the fixed Navbar (40px utility bar + 80px nav).
    // Without it the hero's first elements render underneath the header.
    <div className="min-h-screen bg-c57-surface pt-30 text-c57-on-surface">
      {/* ── Collection hero ── */}
      <Hero
        region={region}
        onRegion={setRegion}
        query={query}
        onQuery={setQuery}
        total={destinationSpots.length}
        visible={spots.length}
      />

      {/* ── Mood rail ── */}
      <section className="w-full bg-c57-surface-container py-4 px-5 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex shrink-0 items-center gap-2 text-c57-secondary">
            <Icon name="tune" size="md" className="text-c57-primary" />
            <span className="font-label-sm uppercase tracking-[0.15em] font-semibold text-c57-on-surface">
              Filter Mood &amp; Pengalaman:
            </span>
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
            <MoodChip active={!mood} onClick={() => setMood(null)}>
              &bull; Semua Mood
            </MoodChip>
            {moodList.map((m) => (
              <MoodChip
                key={m.key}
                active={mood === m.key}
                onClick={() => setMood(mood === m.key ? null : m.key)}
                title={m.intent}
              >
                {m.key}
              </MoodChip>
            ))}
          </div>
        </div>
      </section>

      {/* ── Archive ── */}
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-space-md md:mb-12">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm uppercase tracking-[0.25em] text-c57-primary">
                Arsip N° 01 — Inspirasi Musim Ini
              </span>
              <span className="h-px w-12 bg-c57-outline-variant" />
            </div>
            <h2 className="mt-3 font-display text-[clamp(2rem,3.6vw,2.9rem)] font-normal leading-[1.02] tracking-[-0.02em] text-c57-on-surface">
              Eksplorasi Destinasi Terpilih
            </h2>
            <p className="mt-2 font-body-sm text-body-sm text-c57-on-surface-variant">
              Menampilkan {spots.length} sorotan utama
              {region !== "semua" ? ` · ${activeRegionLabel}` : ""}
              {mood ? ` · ${mood}` : ""}
            </p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {VIEW_OPTIONS.map((option) => {
              const active = view === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => setView(option.key)}
                  aria-pressed={active}
                  aria-label={option.label}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    active
                      ? "bg-c57-primary-container text-c57-on-primary"
                      : "bg-c57-surface-container-low text-c57-on-surface hover:bg-c57-surface-container-high"
                  }`}
                >
                  <Icon name={option.icon} size="md" />
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <GallerySkeleton />
        ) : spots.length === 0 ? (
          <EmptyState
            icon="explore"
            title="Belum ada destinasi yang cocok"
            description="Coba longgarkan filter mood, wilayah, atau kata kunci pencarianmu."
            action="Reset Filter"
            onAction={resetFilters}
            className="py-24"
          />
        ) : view === "masonry" ? (
          <MasonryGallery spots={spots} showFeaturette={showFeaturette} />
        ) : (
          <UniformGrid spots={spots} />
        )}
      </section>

      <section className="editorial-shell pb-12" aria-label="Kredit foto destinasi">
        <details className="border-t border-c57-outline-variant pt-5">
          <summary className="cursor-pointer py-2 font-label-md text-c57-secondary">Sumber dan lisensi foto destinasi</summary>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {destinationSpots.filter((spot) => spot.photoCredit).map((spot) => (
              <div key={spot.slug}>
                <h2 className="mb-2 font-display text-[1.25rem] text-c57-on-surface">{spot.name}</h2>
                <DestinationPhotoCredit credit={spot.photoCredit} />
              </div>
            ))}
          </div>
        </details>
      </section>

      <ConciergeCta planTo="/trip-planner" planLabel="Rancang Custom Itinerary" />
    </div>
  );
}

/* ── Sections ──────────────────────────────────────────────────────────── */

function Hero({ region, onRegion, query, onQuery, total, visible }) {
  return (
    <section className="relative w-full overflow-hidden border-b border-c57-outline-variant/60 pt-16 pb-14 lg:pt-24 lg:pb-20">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={destinationPhotos["raja-ampat"].src}
          alt=""
          className="h-full w-full object-cover object-center photo-warm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-c57-surface/95 via-c57-surface/85 to-c57-surface" />
      </div>

      <div className="editorial-shell relative flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-2.5 rounded-full border border-c57-outline/40 bg-c57-surface-container-lowest/80 px-4 py-1.5 font-label-sm uppercase tracking-[0.24em] text-c57-secondary backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-c57-secondary" />
          {COLLECTION_LABEL}
        </p>

        <h1 className="mt-7 max-w-5xl font-display text-[clamp(2.6rem,6vw,4.9rem)] font-normal leading-[0.98] tracking-[-0.03em] text-c57-on-surface">
          Jelajah Nusantara{" "}
          <em className="font-normal italic text-c57-secondary">&amp; Asia Tenggara</em>
        </h1>
        <p className="mt-4 font-label-sm uppercase tracking-[0.3em] text-c57-secondary">
          {COLLECTION_VOLUME}
        </p>
        <p className="mt-6 max-w-2xl text-[0.98rem] leading-relaxed text-c57-on-surface-variant">
          {COLLECTION_INTRO}
        </p>

        {/* Search and the macro region rail share one field of view, so a
            filter change reads as one decision rather than two. */}
        <div className="mt-10 w-full max-w-3xl space-y-5">
          <div className="flex items-center justify-between gap-2 rounded-full border border-c57-outline/40 bg-c57-surface-container-lowest/90 p-2 pl-6 shadow-c57-card backdrop-blur-md">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <Icon
                name="explore"
                size="xl"
                className="shrink-0 text-c57-secondary"
              />
              <Input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Cari destinasi, lanskap vulkanik, laguna bahari, atau rute privat..."
                aria-label="Cari destinasi"
                className="border-0 bg-transparent px-0 py-1 text-c57-on-surface placeholder:text-c57-on-surface-variant/60 focus:border-0 focus:bg-transparent"
              />
            </div>
            <span className="hidden shrink-0 items-center gap-2 rounded-full bg-c57-primary px-6 py-3 font-label-md uppercase tracking-wider text-c57-on-primary md:inline-flex">
              Eksplorasi
              <Icon name="arrow_forward" size="sm" />
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {HERO_CATEGORIES.map((category) => {
              const active = region === category.key;
              return (
                <button
                  key={category.key}
                  onClick={() => onRegion(category.key)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-1.5 font-label-sm uppercase tracking-wider transition-transform active:scale-95 ${
                    active
                      ? "bg-c57-primary text-c57-on-primary shadow-sm"
                      : "border border-c57-outline/35 bg-c57-surface-container-lowest/70 text-c57-on-surface-variant hover:border-c57-outline hover:text-c57-on-surface"
                  }`}
                >
                  {category.label}
                  {category.key === "semua" ? ` (${total})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-5 font-label-sm uppercase tracking-widest text-c57-secondary">
          {visible} dari {total} destinasi terkurasi
        </p>
        <DestinationPhotoCredit credit={destinationPhotos["raja-ampat"]} compact className="mt-5" />
      </div>
    </section>
  );
}

/* ── Galleries ─────────────────────────────────────────────────────────── */

function MasonryGallery({ spots, showFeaturette }) {
  return (
    <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
      <AnimatePresence>
        {spots.map((spot) => (
          <motion.div
            key={spot.slug}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <DestinationTile spot={spot} />
          </motion.div>
        ))}
        {showFeaturette && (
          <motion.div
            key="featurette"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <FeaturetteCard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UniformGrid({ spots }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence>
        {spots.map((spot) => (
          <motion.div
            key={spot.slug}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <DestinationTile spot={spot} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function FeaturetteCard() {
  return (
    <Link
      to="/open-trip"
      className="group relative mb-5 block break-inside-avoid overflow-hidden rounded-c57-lg bg-c57-inverse-surface shadow-c57-card transition-shadow duration-500 ease-editorial hover:shadow-c57-card-hover"
    >
      <div className="relative flex min-h-[22rem] flex-col justify-end p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-c57-primary/25 blur-[100px]"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="mb-3 inline-flex items-center gap-2 font-label-sm uppercase tracking-[0.2em] text-c57-primary-fixed-dim">
            <Icon name="auto_awesome" size="sm" />
            Editorial Featurette
          </p>
          <h3 className="font-display text-[1.6rem] leading-tight text-c57-surface-bright">
            Rancang Rute Privat Sesuai Impianmu
          </h3>
          <p className="mt-2 font-body-sm text-body-sm text-c57-surface-variant">
            Armada: Toyota HiAce Premio Luxury Captain Seat
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-c57-surface-variant">
            Rute: Yogyakarta • Solo • Malang • Bromo • Banyuwangi
          </p>
          <span className="mt-5 inline-flex items-center gap-2 font-label-sm uppercase tracking-widest text-c57-primary-fixed-dim transition-colors group-hover:text-c57-surface-bright">
            Rancang Rute Ini
            <Icon name="arrow_forward" size="sm" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function MoodChip({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`shrink-0 rounded-full px-3.5 py-1 font-label-sm uppercase tracking-wider transition-colors ${
        active
          ? "bg-c57-surface font-semibold text-c57-primary shadow-sm"
          : "bg-transparent font-semibold text-c57-on-surface-variant hover:text-c57-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

function GallerySkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-space-md py-24">
      <span
        className="h-14 w-14 animate-spin rounded-full border-2 border-c57-surface-variant border-t-c57-primary-container"
        role="status"
        aria-label="Memuat Destinasi"
      />
      <p className="animate-breathe font-label-sm uppercase tracking-[0.3em] text-c57-outline">
        Memuat Destinasi
      </p>
    </div>
  );
}
