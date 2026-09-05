import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import testimonial1 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.38 (1).webp";
import testimonial2 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.38.webp";
import testimonial3 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.39.webp";
import testimonial4 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.40 (1).webp";
import testimonial5 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.40.webp";
import testimonial6 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.41.webp";

const testimonials = [
  {
    image: testimonial1,
    name: "Peserta Trip 1",
    trip: "Open Trip Bromo",
    quote: "Perjalanan paling berkesan, guide-nya asik banget!",
    rating: 5,
  },
  {
    image: testimonial2,
    name: "Peserta Trip 2",
    trip: "Open Trip Bali",
    quote: "Worth it banget, semua udah diatur rapi.",
    rating: 5,
  },
  {
    image: testimonial3,
    name: "Peserta Trip 3",
    trip: "Open Trip Lombok",
    quote: "Seru banget, next trip lagi yuk!",
    rating: 5,
  },
  {
    image: testimonial4,
    name: "Peserta Trip 4",
    trip: "Open Trip Ijen",
    quote: "Pelayanannya top, recommended banget!",
    rating: 5,
  },
  {
    image: testimonial5,
    name: "Peserta Trip 5",
    trip: "Open Trip Komodo",
    quote: "Pengalaman yang luar biasa, terima kasih Cakra Lima Tujuh!",
    rating: 5,
  },
  {
    image: testimonial6,
    name: "Peserta Trip 6",
    trip: "Open Trip Raja Ampat",
    quote: "Trip terbaik yang pernah saya ikuti!",
    rating: 5,
  },
];

export default function OpenTripTestimonials() {
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);

  const scrollTo = (i) => {
    const el = trackRef.current?.querySelector(`[data-index="${i}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActive(i);
  };

  const prev = () => scrollTo(Math.max(0, active - 1));
  const next = () => scrollTo(Math.min(testimonials.length - 1, active + 1));

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.querySelectorAll("[data-index]");
    let closest = 0;
    let minDist = Infinity;
    const center = track.scrollLeft + track.clientWidth / 2;
    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closest = Number(card.getAttribute("data-index"));
      }
    });
    setActive(closest);
  };

  return (
    <section className="bg-[#1B1717] py-14 md:py-16 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#810100]/10 rounded-full opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#EDEBDD]/5 rounded-full opacity-30 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-0 md:px-10">
        <div className="px-5 md:px-0 text-center mb-8 md:mb-10">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">
            Testimoni Open Trip
          </h2>
          <p className="text-[#EDEBDD]/50 text-sm">
            Cerita nyata dari peserta trip bareng Cakra Lima Tujuh
          </p>
        </div>

        {/* ── Mobile: swipeable snap carousel ─────────────────────────────── */}
        <div className="md:hidden relative">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-5 pb-4 scrollbar-hide"
          >
            {testimonials.map((t, i) => (
              <div
                key={i}
                data-index={i}
                className="snap-center flex-shrink-0 w-[82%] max-w-[340px] rounded-2xl overflow-hidden relative h-[26rem] bg-[#2A2525]"
              >
                <img
                  src={t.image}
                  alt={`Testimoni ${t.name}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="mb-2 text-[#EDEBDD]/80 text-[11px] font-semibold uppercase tracking-widest">
                    {String(t.rating)}&#9733; &middot; {t.trip}
                  </div>
                  <p className="font-serif italic text-white text-lg leading-snug mb-2">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="text-white font-bold text-sm">{t.name}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prev / Next controls for mobile */}
          <button
            onClick={prev}
            aria-label="Sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center disabled:opacity-40"
            disabled={active === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center disabled:opacity-40"
            disabled={active === testimonials.length - 1}
          >
            <ChevronRight size={18} />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-1">
            {testimonials.map((t, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                aria-label={`Testimoni ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-6 bg-[#810100]" : "w-1.5 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Desktop: vertical accordion gallery ─────────────────────────── */}
        <div className="hidden md:block">
          <div className="flex h-[32rem] gap-3">
            {testimonials.map((t, i) => {
              const isActive = i === active;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isActive}
                  className={[
                    "relative overflow-hidden rounded-xl cursor-pointer",
                    "flex-1 basis-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    "group outline-none focus-visible:ring-2 focus-visible:ring-[#810100]",
                    isActive ? "flex-[5]" : "flex-1 hover:flex-[2]",
                  ].join(" ")}
                >
                  <img
                    src={t.image}
                    alt={`Testimoni ${t.name}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className={[
                      "absolute inset-0 transition-opacity duration-500",
                      isActive
                        ? "bg-gradient-to-t from-black/85 via-black/20 to-black/10 opacity-100"
                        : "bg-black/50 opacity-100 group-hover:opacity-60",
                    ].join(" ")}
                  />
                  <div
                    className={[
                      "absolute inset-x-0 bottom-0 px-3 pb-4 transition-opacity duration-300",
                      isActive ? "opacity-0" : "opacity-100",
                    ].join(" ")}
                  >
                    <p className="text-white font-bold text-sm [writing-mode:vertical-rl] rotate-180 mx-auto uppercase tracking-wider">
                      {t.name}
                    </p>
                  </div>
                  <div
                    className={[
                      "absolute inset-x-0 bottom-0 p-6 transition-all duration-500",
                      isActive
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4 pointer-events-none",
                    ].join(" ")}
                  >
                    <div className="mb-2 text-[#EDEBDD]/70 text-[11px] font-semibold uppercase tracking-widest">
                      {String(t.rating)}&#9733; &middot; {t.trip}
                    </div>
                    <p className="font-serif italic text-white text-xl leading-snug mb-2">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="text-white font-bold text-sm">{t.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
