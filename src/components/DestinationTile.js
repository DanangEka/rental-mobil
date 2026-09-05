import { Link } from "react-router-dom";
import { MapPin, ArrowUpRight } from "lucide-react";

export default function DestinationTile({ spot, index = 0 }) {
  return (
    <Link
      to={`/destinasi/${spot.region}/${spot.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#DC2626]/40 transition-all duration-500"
      style={{
        animation: `spotReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${index * 80}ms both`,
      }}
    >
      <div className="overflow-hidden">
        <img
          src={spot.image}
          alt={spot.name}
          loading="lazy"
          className="w-full h-auto object-cover transition-transform duration-400 ease-out group-hover:scale-[1.03]"
        />
      </div>

      {/* Base gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

      {/* Hover ring accent */}
      <div className="absolute inset-2 rounded-xl border border-[#DC2626]/0 group-hover:border-[#DC2626]/30 transition-all duration-500 pointer-events-none" />

      {/* Top-right arrow — reveal on hover */}
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-100 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 z-10">
        <ArrowUpRight size={14} className="text-white" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 z-10">
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#A3A3A3] mb-1 flex items-center gap-1.5 group-hover:text-[#DC2626] transition-colors duration-300">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{spot.city}</span>
          <span className="text-[#262626]">·</span>
          <span className="truncate">{spot.category}</span>
        </p>
        <h3 className="font-serif text-lg md:text-xl font-medium text-white leading-snug group-hover:text-[#FAFAFA] transition-colors duration-300">
          {spot.name}
        </h3>
        <div className="md:max-h-0 md:opacity-0 md:group-hover:max-h-10 md:group-hover:opacity-100 transition-all duration-500 overflow-hidden">
          <div className="mt-2 h-px w-0 bg-[#DC2626]/60 transition-all duration-500 md:group-hover:w-16" />
          <p className="mt-2 text-[10px] text-[#A3A3A3] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 group-hover:text-[#FAFAFA]/80 transition-colors duration-300">
            Lihat Detail
          </p>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#DC2626]/0 to-transparent group-hover:via-[#DC2626]/40 transition-all duration-700 z-10" />
    </Link>
  );
}
