import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

/**
 * Masonry tile for the Discovery gallery.
 *
 * Photography carries the grid, so the chrome stays out of the way: a scrim
 * only where the caption sits, and the crimson reveal deferred to hover so a
 * dense gallery does not read as a wall of red. The hover arrow is hidden from
 * assistive tech — the whole tile is one link and already names its target.
 */
export default function DestinationTile({ spot, index = 0 }) {
  // `mb-5` must stay equal to the masonry `gap-5` on the parent column layout,
  // otherwise the vertical rhythm breaks between rows.
  return (
    <Link
      to={`/destinasi/${spot.region}/${spot.slug}`}
      className="group relative mb-5 break-inside-avoid block overflow-hidden rounded-c57-lg bg-c57-surface-container-lowest shadow-c57-card transition-shadow duration-500 ease-editorial hover:shadow-c57-card-hover"
      style={{ animation: `spotReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${index * 80}ms both` }}
    >
      <div className="overflow-hidden">
        <img
          src={spot.image}
          alt={spot.name}
          loading="lazy"
          className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>

      {/* Legibility scrim, heaviest at the caption end. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-c57-scrim/85 via-c57-scrim/15 to-transparent"
        aria-hidden="true"
      />

      {/* Crimson hairline, revealed on hover. */}
      <div
        className="pointer-events-none absolute inset-2 rounded-c57-md border border-c57-primary-container/0 transition-colors duration-500 group-hover:border-c57-primary-container/30"
        aria-hidden="true"
      />

      <div
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-c57-surface-bright/20 bg-c57-scrim/40 text-c57-on-scrim opacity-0 backdrop-blur-sm transition-opacity duration-500 md:group-hover:opacity-100"
        aria-hidden="true"
      >
        <Icon name="north_east" size="sm" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
        <p className="flex items-center gap-1.5 font-label-sm uppercase tracking-[0.22em] text-c57-on-scrim/70">
          <Icon name="place" size="xs" className="shrink-0" />
          <span className="truncate">{spot.city}</span>
          <span className="text-c57-on-scrim/40">·</span>
          <span className="truncate">{spot.category}</span>
        </p>
        <h3 className="mt-1 font-headline-sm text-headline-sm leading-snug text-c57-on-scrim">
          {spot.name}
        </h3>
        <div className="md:max-h-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-500 md:group-hover:max-h-10 md:group-hover:opacity-100">
          <div className="accent-line mt-2 h-px w-0 transition-all duration-500 md:group-hover:w-16" />
          <p className="mt-2 font-label-sm uppercase tracking-[0.22em] text-c57-on-scrim/80">
            Lihat Detail
          </p>
        </div>
      </div>
    </Link>
  );
}
