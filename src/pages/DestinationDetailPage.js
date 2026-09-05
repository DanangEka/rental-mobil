import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, MapPin, Compass, ArrowUpRight, Sparkles } from "lucide-react";
import { destinationSpots } from "../data/destinationSpots";
import DestinationTile from "../components/DestinationTile";

const regionLabel = {
  jawa: "Jawa",
  bali: "Bali",
  indonesia: "Indonesia",
  asean: "ASEAN",
};

export default function DestinationDetailPage() {
  const { region, slug } = useParams();

  const spot = useMemo(
    () => destinationSpots.find((s) => s.slug === slug && s.region === region),
    [region, slug]
  );

  const related = useMemo(() => {
    if (!spot) return [];
    return destinationSpots
      .filter((s) => s.slug !== spot.slug)
      .filter(
        (s) =>
          s.region === spot.region ||
          (Array.isArray(s.mood) &&
            Array.isArray(spot.mood) &&
            s.mood.some((m) => spot.mood.includes(m)))
      )
      .slice(0, 3);
  }, [spot]);

  if (!spot) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col items-center justify-center pt-[140px] px-5">
        <Compass size={44} className="text-[#262626] mb-6" />
        <p className="text-[#A3A3A3] text-lg font-light">Destinasi tidak ditemukan.</p>
        <Link
          to="/discovery"
          className="mt-6 px-7 py-3 rounded-full border border-[#DC2626] text-[11px] font-black uppercase tracking-[0.2em] text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-all duration-300"
        >
          Kembali ke Discovery
        </Link>
      </div>
    );
  }

  const moods = Array.isArray(spot.mood) ? spot.mood : [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      {/* ── HERO ── */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-end overflow-hidden pt-[120px] md:pt-[140px]">
        <div className="absolute inset-0">
          <img
            src={spot.image}
            alt={spot.name}
            className="w-full h-full object-cover heroKenBurns"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-black/30 to-black/40" />

        <div className="relative max-w-7xl mx-auto w-full px-5 md:px-10 pb-14 md:pb-20">
          <nav className="mb-6 flex items-center gap-1.5 text-[10px] md:text-xs tracking-wider uppercase text-[#A3A3A3] whitespace-nowrap overflow-hidden">
            <Link to="/" className="hover:text-[#FAFAFA] transition-colors">
              Beranda
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <Link to="/discovery" className="hover:text-[#FAFAFA] transition-colors">
              Discovery
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <Link
              to={`/discovery/${region}`}
              className="hover:text-[#FAFAFA] transition-colors"
            >
              {regionLabel[region]}
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <span className="text-[#FAFAFA] font-semibold truncate">{spot.name}</span>
          </nav>

          <p className="text-[10px] tracking-[0.25em] uppercase text-[#A3A3A3] mb-3 flex items-center gap-1.5">
            <MapPin size={12} className="text-[#DC2626]" />
            {spot.city} · {spot.category}
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight leading-[0.95]">
            {spot.name}
          </h1>

          {moods.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {moods.map((m) => (
                <Link
                  key={m}
                  to={`/discovery?mood=${encodeURIComponent(m)}`}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3] hover:text-[#FAFAFA] hover:border-[#DC2626]/50 transition-all"
                >
                  {m}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-4">
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#DC2626] mb-3">
              About the place
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium leading-tight">
              {spot.name}
            </h2>
          </div>
          <div className="md:col-span-8">
            <p className="text-[#A3A3A3] text-lg md:text-xl font-light leading-relaxed md:max-w-2xl">
              {spot.name} di {spot.city} adalah salah satu destinasi paling
              memikat di {regionLabel[region]}. Abadikan keindahannya,
              rasakan suasananya, dan biarkan cerita perjalananmu dimulai dari
              sini — ditemani pengalaman perjalanan terkurasi dari Cakra Lima
              Tujuh.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-xl">
              <div className="bg-[#171717] border border-[#262626] rounded-2xl p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A3A3A3] mb-1">
                  Region
                </p>
                <p className="font-serif text-lg text-[#FAFAFA]">{regionLabel[region]}</p>
              </div>
              <div className="bg-[#171717] border border-[#262626] rounded-2xl p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A3A3A3] mb-1">
                  Kategori
                </p>
                <p className="font-serif text-lg text-[#FAFAFA]">{spot.category}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY (related visuals) ── */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 md:px-10 pb-24">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#A3A3A3] mb-2">
                Explore lebih jauh
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-medium">
                Tempat lain yang mungkin kamu suka
              </h2>
            </div>
            <Link
              to="/discovery"
              className="hidden md:inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#DC2626] hover:gap-3 transition-all shrink-0"
            >
              Lihat Semua <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((r, idx) => (
              <DestinationTile key={r.slug} spot={r} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER CTA ── */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 pb-24">
        <div className="bg-gradient-to-br from-[#DC2626]/20 via-[#171717] to-[#0A0A0A] border border-[#262626] rounded-3xl p-10 md:p-16 text-center">
          <Sparkles size={20} className="mx-auto text-[#DC2626] mb-4" />
          <h2 className="font-serif text-3xl md:text-5xl font-medium">
            Siap menjelajah {spot.city}?
          </h2>
          <p className="mt-4 text-[#A3A3A3] text-base md:text-lg font-light max-w-xl mx-auto">
            Rencanakan Open Trip atau Private Trip ke {spot.name} bersama Cakra
            Lima Tujuh.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/open-trip"
              className="px-8 py-3.5 rounded-full bg-[#DC2626] text-white text-[11px] font-black uppercase tracking-[0.15em] hover:bg-[#B91C1C] transition-all"
            >
              Open Trip
            </Link>
            <Link
              to="/home?type=driver"
              className="px-8 py-3.5 rounded-full border border-[#262626] text-[11px] font-black uppercase tracking-[0.15em] text-[#FAFAFA] hover:border-[#DC2626]/50 hover:text-[#DC2626] transition-all"
            >
              Private Trip
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
