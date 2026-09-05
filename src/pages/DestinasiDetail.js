import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { getSpotsByRegion } from "../data/destinationSpots";
import { ChevronRight, MapPin, Compass, ArrowUpRight, Sparkles } from "lucide-react";

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
      <span className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent via-[#EDEBDD]/40 to-[#EDEBDD]/60" />
      <span className="w-1.5 h-1.5 rotate-45 bg-[#810100]" />
      <span className="w-2.5 h-2.5 rotate-45 border border-[#EDEBDD]/50" />
      <span className="w-1.5 h-1.5 rotate-45 bg-[#810100]" />
      <span className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent via-[#EDEBDD]/40 to-[#EDEBDD]/60" />
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
    <div key={region} className="min-h-screen bg-[#1B1717] text-white">
      {/* ── Cinematic hero banner ─────────────────────────────────────────── */}
      <div className="relative h-[52vh] md:h-[62vh] overflow-hidden pt-[120px] md:pt-[140px]">
        {/* Background gradient placeholder — visible until image loads */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B1717] via-[#2A2525] to-[#3D1B1B]" />

        {/* Hero image — fades in as it loads, never blocks layout */}
        <img
          src={heroImage[region]}
          alt={`Destinasi ${regionLabel[region]}`}
          onLoad={() => setHeroLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover heroKenBurns transition-opacity duration-[1200ms] ease-out ${heroLoaded ? "opacity-100" : "opacity-0"}`}
        />

        {/* Loading spinner overlay — only for the spots fetch (fast) */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent">
            <div className="flex flex-col items-center gap-4 animate-fadeInUp">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-[#EDEBDD]/10" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A84C] animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-b-[#810100] animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.2s" }} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDEBDD]/50 animate-breathe">
                Memuat Destinasi
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-[#1B1717]" />
        <div className="absolute inset-0 bg-[#810100]/10 mix-blend-multiply" />

        {/* Breadcrumb */}
        <nav className="absolute top-[120px] md:top-[140px] inset-x-0 px-5 md:px-12 flex items-center gap-1.5 text-[10px] md:text-xs tracking-wider uppercase text-[#EDEBDD]/70 whitespace-nowrap overflow-hidden animate-fadeInUp">
          <Link to="/" className="hover:text-white transition-colors">
            Beranda
          </Link>
          <ChevronRight size={12} className="shrink-0" />
          <Link to="/discovery" className="hover:text-white transition-colors">
            Discovery
          </Link>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-white font-semibold truncate">
            {regionLabel[region]}
          </span>
        </nav>

        <div className={`absolute bottom-0 inset-x-0 px-5 md:px-12 pb-8 md:pb-14 transition-opacity duration-700 delay-300 ${loading ? "opacity-0" : "opacity-100"}`}>
          <p className="text-[9px] md:text-xs font-semibold tracking-[0.2em] md:tracking-[0.4em] uppercase text-[#EDEBDD]/70 mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2 animate-fadeInUp">
            <Sparkles size={12} className="text-[#810100] shrink-0" />
            <span className="truncate">Destinasi Cakra Lima Tujuh</span>
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.6)] animate-fadeInUp delay-100">
            {regionLabel[region]}
          </h1>
          <p className="mt-3 md:mt-4 text-sm md:text-lg max-w-xl font-light italic text-[#EDEBDD]/80 leading-relaxed animate-fadeInUp delay-200">
            {regionTagline[region]}
          </p>

          <div className="mt-5 md:mt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] md:text-xs text-[#EDEBDD]/80 tracking-wider animate-fadeInUp delay-300">
              <Compass size={13} className="text-[#810100] shrink-0" />
              <span className="uppercase">
                {spots.length} Spot Wisata
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 pb-20 md:pb-24">
        <div className={`flex flex-col items-center text-center mt-6 md:mt-8 mb-8 md:mb-12 ${loading ? "opacity-0" : "opacity-100 transition-opacity duration-700 delay-400"}`}>
          <OrnamentDivider />
          <p className="mt-4 md:mt-6 font-serif italic text-[#EDEBDD]/70 text-base md:text-lg px-2">
            Koleksi destinasi terkurasi untuk pengalaman yang tak terlupakan
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-5 break-inside-avoid rounded-[1.5rem] overflow-hidden bg-[#2A2525] animate-pulse"
                style={{ height: `${180 + (i % 3) * 90}px` }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && spots.length === 0 && (
          <div className="text-center py-24">
            <p className="text-[#EDEBDD]/50 text-lg">
              Belum ada spot wisata untuk region ini.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 rounded-full border border-[#810100] text-[#EDEBDD] hover:bg-[#810100] transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105"
            >
              Kembali ke Beranda
            </Link>
          </div>
        )}

        {/* Masonry gallery — CSS columns for true Pinterest layout */}
        {!loading && spots.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 [column-fill:_balance]">
            {spots.map((spot, idx) => (
              <Link
                to={`/destinasi/${region}/${spot.slug}`}
                key={spot.id}
                className="group relative mb-5 break-inside-avoid rounded-[1.25rem] overflow-hidden block bg-[#2A2525] border border-white/5 hover:border-[#C9A84C]/30 transition-all duration-[600ms] shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
                style={{ animation: `spotReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 100}ms both`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                {/* Image with parallax hover */}
                <div className="overflow-hidden">
                  <img
                    src={spot.image}
                    alt={spot.name}
                    className="w-full h-auto object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08] group-hover:-translate-y-1"
                    style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                    loading="lazy"
                  />
                </div>

                {/* Shimmer sweep on image load */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] pointer-events-none z-20"
                  style={{ background: "linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.06) 50%, transparent 75%)" }} />

                {/* Base gradient so text is always readable on mobile too */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                {/* Richer overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#810100]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Inner ring accent on hover */}
                <div className="absolute inset-3 rounded-xl border border-[#C9A84C]/0 group-hover:border-[#C9A84C]/20 transition-all duration-700 pointer-events-none" />

                {/* Top-right arrow — always visible on mobile, reveal on hover desktop */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-100 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 z-10">
                  <ArrowUpRight size={14} className="text-white" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 z-10">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C]/70 mb-1 flex items-center gap-1.5 group-hover:text-[#C9A84C] transition-colors duration-300">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{spot.city}</span>
                  </p>
                  <h3 className="font-serif text-lg md:text-xl font-medium text-white leading-snug group-hover:text-[#EDEBDD] transition-colors duration-300">
                    {spot.name}
                  </h3>

                  {/* Reveal line + CTA — visible on mobile (no hover), reveal on desktop hover */}
                  <div className="md:max-h-0 md:opacity-0 md:group-hover:max-h-10 md:group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                    <div className="mt-2 h-px w-0 bg-[#C9A84C]/60 transition-all duration-700 md:group-hover:w-16" />
                    <p className="mt-2 text-[10px] text-[#EDEBDD]/60 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 group-hover:text-[#EDEBDD]/80 transition-colors duration-300">
                      Lihat Detail <ChevronRight size={12} />
                    </p>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C]/0 to-transparent group-hover:via-[#C9A84C]/40 transition-all duration-700 z-10" />
              </Link>
            ))}
          </div>
        )}

        {/* Bottom ornament */}
        {!loading && spots.length > 0 && (
          <div className="mt-14">
            <OrnamentDivider />
            <p className="text-center text-xs tracking-[0.3em] uppercase text-[#EDEBDD]/40 mt-6">
              Cakra Lima Tujuh &middot; {new Date().getFullYear()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
