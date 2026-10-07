import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { getSpotsByRegion } from "../data/destinationSpots";
import DestinationTile from "../components/DestinationTile";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Pill from "../components/ui/Pill";

const regionLabel = {
  jawa: "Jawa",
  bali: "Bali",
  indonesia: "Indonesia",
  asean: "ASEAN",
};

const regionTagline = {
  jawa: "Keajaiban warisan Nusantara di Pulau Jawa",
  bali: "Pesona pulau surgawi di timur Indonesia",
  indonesia: "Rangkaian surga tersembunyi dari Sabang sampai Merauke",
  asean: "Petualangan melewati keindahan Asia Tenggara",
};

const heroImage = {
  jawa: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Borobudur%2C_Java%2C_Indonesia%2C_20220817_1013_8739.jpg",
  bali: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Bali_-_Pura_Tanah_Lot%2C_20220827_0957_1108.jpg",
  indonesia: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Piaynemo_Island%2C_Raja_Ampat%2C_West_Papua%2C_Indonesia.jpg",
  asean: "https://upload.wikimedia.org/wikipedia/commons/e/eb/2014-Cambodge_Angkor_Wat_%2821%29.jpg",
};

function OrnamentDivider({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-2 md:gap-3 ${className}`}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent via-c57-accent-line/40 to-c57-accent-line/60 md:w-16" />
      <span className="h-1.5 w-1.5 rotate-45 bg-c57-primary-container" />
      <span className="h-2.5 w-2.5 rotate-45 border border-c57-accent-line/50" />
      <span className="h-1.5 w-1.5 rotate-45 bg-c57-primary-container" />
      <span className="h-px w-10 bg-gradient-to-l from-transparent via-c57-accent-line/40 to-c57-accent-line/60 md:w-16" />
    </div>
  );
}

export default function DestinasiDetail() {
  const { region } = useParams();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    async function fetchSpots() {
      setLoading(true);
      setHeroLoaded(false);
      try {
        const q = query(
          collection(db, "destinationSpots"),
          where("region", "==", region)
        );
        const snap = await getDocs(q);
        const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSpots(remote.length > 0 ? remote : getSpotsByRegion(region));
      } catch (err) {
        console.error("Failed to fetch destination spots:", err);
        setSpots(getSpotsByRegion(region));
      } finally {
        setLoading(false);
      }
    }
    fetchSpots();
  }, [region]);

  return (
    <div key={region} className="min-h-screen bg-c57-surface text-c57-on-surface">
      {/* ── Cinematic hero banner ─────────────────────────────────────── */}
      <div className="relative h-[52vh] overflow-hidden pt-30 md:h-[62vh] md:pt-36">
        {/* Visible until the photograph decodes, so the banner never flashes
            empty on a slow connection. */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-c57-scrim via-c57-scrim to-c57-primary"
          aria-hidden="true"
        />

        <img
          src={heroImage[region]}
          alt={`Destinasi ${regionLabel[region]}`}
          onLoad={() => setHeroLoaded(true)}
          className={`heroKenBurns absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
            heroLoaded ? "opacity-100" : "opacity-0"
          }`}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-space-md animate-fadeInUp">
              <span
                className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-c57-accent-line"
                role="status"
                aria-label="Memuat Destinasi"
              />
              <p className="animate-breathe font-label-sm uppercase tracking-[0.3em] text-c57-on-scrim/50">
                Memuat Destinasi
              </p>
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 bg-gradient-to-b from-c57-scrim/60 via-c57-scrim/45 to-c57-scrim/85"
          aria-hidden="true"
        />

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="absolute inset-x-0 top-30 z-10 flex animate-fadeInUp items-center gap-1.5 overflow-hidden whitespace-nowrap px-5 font-label-sm uppercase tracking-wider text-c57-on-scrim/80 md:top-36 md:px-12"
        >
          <Link to="/" className="transition-colors hover:text-c57-on-scrim">
            Beranda
          </Link>
          <Icon name="chevron_right" size="sm" className="shrink-0" />
          <Link to="/discovery" className="transition-colors hover:text-c57-on-scrim">
            Discovery
          </Link>
          <Icon name="chevron_right" size="sm" className="shrink-0" />
          <span className="truncate font-label-md uppercase text-c57-on-scrim">{regionLabel[region]}</span>
        </nav>

        <div
          className={`absolute inset-x-0 bottom-0 z-10 px-5 pb-8 transition-opacity delay-300 duration-700 md:px-12 md:pb-14 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="mb-3 flex animate-fadeInUp items-center gap-2 truncate font-label-sm uppercase tracking-[0.28em] text-c57-on-scrim/85 md:mb-4">
            <span className="accent-line" aria-hidden="true" />
            Destinasi Cakra Lima Tujuh
          </p>
          <h1 className="animate-fadeInUp font-headline-lg text-headline-lg-mobile text-c57-on-scrim [text-shadow:0_2px_30px_rgba(0,0,0,0.6)] delay-100 md:text-headline-xl">
            {regionLabel[region]}
          </h1>
          <p className="mt-3 max-w-xl animate-fadeInUp font-display text-body-lg italic leading-relaxed text-c57-on-scrim/90 delay-200 md:mt-4">
            {regionTagline[region]}
          </p>

          <div className="mt-5 md:mt-6">
            <Pill variant="onScrim" icon="explore">
              {spots.length} Spot Wisata
            </Pill>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-5 pb-20 md:px-10 md:pb-24">
        <div
          className={`mb-8 mt-6 flex flex-col items-center text-center md:mb-12 md:mt-8 ${
            loading ? "opacity-0" : "opacity-100 transition-opacity delay-400 duration-700"
          }`}
        >
          <OrnamentDivider />
          <p className="mt-4 px-2 font-display text-body-lg italic text-c57-on-surface-variant md:mt-6">
            Koleksi destinasi terkurasi untuk pengalaman yang tak terlupakan
          </p>
        </div>

        {loading && (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-5 break-inside-avoid animate-pulse overflow-hidden rounded-c57-lg bg-c57-surface-container"
                style={{ height: `${180 + (i % 3) * 90}px` }}
              />
            ))}
          </div>
        )}

        {!loading && spots.length === 0 && (
          <EmptyState
            icon="explore"
            title="Belum ada spot wisata"
            description="Koleksi untuk region ini sedang kami kurasi."
            action="Kembali ke Beranda"
            actionTo="/"
            className="py-24"
          />
        )}

        {/* Masonry gallery — CSS columns for a true Pinterest layout. */}
        {!loading && spots.length > 0 && (
          <div className="columns-1 gap-5 [column-fill:_balance] sm:columns-2 lg:columns-3 xl:columns-4">
            {/* DestinationTile renders its own link. Wrapping it in another
                Link would nest two anchors, which is invalid HTML and breaks
                keyboard traversal. */}
            {spots.map((spot, idx) => (
              <DestinationTile key={spot.id || spot.slug} spot={spot} index={idx} />
            ))}
          </div>
        )}

        {!loading && spots.length > 0 && (
          <div className="mt-14">
            <OrnamentDivider />
            <p className="mt-6 text-center font-label-sm uppercase tracking-[0.3em] text-c57-outline">
              Cakra Lima Tujuh &middot; {new Date().getFullYear()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
