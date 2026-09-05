import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Search, Sparkles } from "lucide-react";
import {
  destinationSpots,
  regionList,
  moodList,
} from "../data/destinationSpots";
import DestinationTile from "../components/DestinationTile";

const regionTagline = {
  jawa: "Keajaiban warisan Nusantara di Pulau Jawa",
  bali: "Pesona pulau surgawi di timur Indonesia",
  indonesia: "Rangkaian surga tersembunyi dari Sabang sampai Merauke",
  asean: "Petualangan melewati keindahan Asia Tenggara",
  semua: "Jelajahi keindahan Asia Tenggara, satu destinasi setiap kalinya",
};

const heroByRegion = {
  jawa: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Borobudur%2C_Java%2C_Indonesia%2C_20220817_1013_8739.jpg/1280px-Borobudur%2C_Java%2C_Indonesia%2C_20220817_1013_8739.jpg",
  bali: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Bali_-_Pura_Tanah_Lot%2C_20220827_0957_1108.jpg/1280px-Bali_-_Pura_Tanah_Lot%2C_20220827_0957_1108.jpg",
  indonesia: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Piaynemo_Island%2C_Raja_Ampat%2C_West_Papua%2C_Indonesia.jpg/1280px-Piaynemo_Island%2C_Raja_Ampat%2C_West_Papua%2C_Indonesia.jpg",
  asean: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/2014-Cambodge_Angkor_Wat_%2821%29.jpg/1280px-2014-Cambodge_Angkor_Wat_%2821%29.jpg",
  semua: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Piaynemo_Island%2C_Raja_Ampat%2C_West_Papua%2C_Indonesia.jpg/1280px-Piaynemo_Island%2C_Raja_Ampat%2C_West_Papua%2C_Indonesia.jpg",
};

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
    region === "semua" ? "Asia Tenggara" : regionList.find((r) => r.key === region)?.label;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      {/* ── HERO ── */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-end overflow-hidden pt-[120px] md:pt-[140px]">
        <div className="absolute inset-0">
          <img
            src={heroByRegion[region]}
            alt={activeRegionLabel}
            className="w-full h-full object-cover heroKenBurns"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-[#0A0A0A]" />
        <div className="absolute inset-0 bg-[#DC2626]/10 mix-blend-multiply" />

        <div className="relative max-w-7xl mx-auto w-full px-5 md:px-10 pb-16 md:pb-24">
          <p className="text-[9px] md:text-xs font-semibold tracking-[0.3em] md:tracking-[0.4em] uppercase text-[#DC2626] mb-4 md:mb-5 flex items-center gap-2">
            <Sparkles size={12} />
            <span>Cakra Discovery</span>
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-[0.95]">
            Discover
            <br />
            <span className="italic text-[#DC2626]/90">Southeast Asia</span>
          </h1>
          <p className="mt-5 md:mt-6 text-base md:text-xl max-w-xl font-light text-[#A3A3A3] leading-relaxed">
            One destination at a time. Biarkan fotografi membawamu ke tempat
            berikutnya.
          </p>
        </div>
      </section>

      {/* ── SEARCH ── */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 -mt-6 md:-mt-10 relative z-10">
        <div className="flex items-center gap-3 bg-[#171717] border border-[#262626] rounded-2xl px-5 py-4 focus-within:border-[#DC2626]/50 transition-colors">
          <Search size={18} className="text-[#A3A3A3] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destinations..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#A3A3A3]"
            aria-label="Search destinations"
          />
          <Compass size={16} className="text-[#DC2626] shrink-0" />
        </div>
      </section>

      {/* ── REGION TABS ── */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-14">
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
          {regionList.map((r) => {
            const active = region === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRegion(r.key)}
                aria-pressed={active}
                className={`px-5 py-2.5 rounded-full text-[11px] md:text-xs font-black uppercase tracking-widest border transition-all duration-300 ${
                  active
                    ? "bg-[#DC2626] text-white border-[#DC2626] shadow-lg shadow-[#DC2626]/25"
                    : "bg-transparent text-[#A3A3A3] border-[#262626] hover:text-[#FAFAFA] hover:border-[#A3A3A3]/50"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── MOOD CHIPS ── */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 pt-6 md:pt-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setMood(null)}
            aria-pressed={!mood}
            className={`px-4 py-2 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
              !mood
                ? "bg-[#DC2626] text-white border-[#DC2626]"
                : "bg-transparent text-[#A3A3A3] border-[#262626] hover:text-[#FAFAFA]"
            }`}
          >
            Semua Mood
          </button>
          {moodList.map((m) => {
            const active = mood === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMood(active ? null : m.key)}
                aria-pressed={active}
                title={m.intent}
                className={`px-4 py-2 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                  active
                    ? "bg-[#DC2626] text-white border-[#DC2626]"
                    : "bg-transparent text-[#A3A3A3] border-[#262626] hover:text-[#FAFAFA]"
                }`}
              >
                <span className="mr-1.5">{m.icon}</span>
                {m.key}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 pt-12 md:pt-16 pb-24">
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#A3A3A3] mb-2">
              Destinasi {activeRegionLabel}
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-medium">
              {mood ? `${mood} · ${activeRegionLabel}` : activeRegionLabel}
            </h2>
          </div>
          <p className="hidden md:inline text-xs font-bold text-[#A3A3A3] uppercase tracking-widest shrink-0">
            {spots.length} {spots.length === 1 ? "Spot" : "Spots"}
          </p>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-5">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-[#262626]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#DC2626] animate-spin" />
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-b-[#DC2626] animate-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.2s" }}
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A3A3A3] animate-breathe">
              Memuat Destinasi
            </p>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-24">
            <Compass size={44} className="mx-auto text-[#262626] mb-6" />
            <p className="text-[#A3A3A3] text-lg font-light">
              Belum ada destinasi yang cocok dengan pilihanmu.
            </p>
            <button
              onClick={() => {
                setMood(null);
                setQuery("");
              }}
              className="mt-6 px-7 py-3 rounded-full border border-[#DC2626] text-[11px] font-black uppercase tracking-[0.2em] text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-all duration-300"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 [column-fill:_balance]">
            <AnimatePresence>
              {spots.map((spot, idx) => (
                <motion.div
                  key={spot.slug}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-5 break-inside-avoid"
                >
                  <DestinationTile spot={spot} index={idx} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
