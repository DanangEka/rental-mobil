/**
 * Editorial Crimson card.
 *
 * Per DESIGN.md §Elevation, depth is carried by a hairline border and a very
 * low-contrast warm ambient shadow rather than a drop shadow:
 *   flat       — white fill, 1px rgba(30,27,25,.06) perimeter
 *   inset      — surface-container-low fill, for filters and comparison tables
 *   outline    — transparent, hairline only
 *   scrim      — the dark #151515 surface, for imagery and hero modules
 *
 * `interactive` adds Level 2, whose shadow tints crimson on lift. That tint
 * is the signature interaction of the system; it is why the hover recipe is
 * not just a bigger version of the resting shadow.
 *
 * Radius is `rounded-c57-lg` (1rem), per DESIGN.md §Shapes. The app's
 * pre-redesign `rounded-[2rem]` / `rounded-[2.5rem]` blobs are not part of
 * this system.
 */

const VARIANTS = {
  flat: "bg-c57-surface-container-lowest border-c57-surface-variant",
  inset: "bg-c57-surface-container-low border-c57-surface-variant",
  outline: "bg-transparent border-c57-surface-variant",
  scrim: "bg-c57-scrim text-c57-on-scrim border-white/5",
};

export default function Card({
  variant = "flat",
  interactive = false,
  radius = "lg",
  className = "",
  children,
  ...rest
}) {
  return (
    <div
      className={[
        "border",
        "rounded-c57-" + radius,
        "shadow-c57-card",
        VARIANTS[variant],
        interactive
          ? "transition-shadow duration-300 ease-editorial hover:shadow-c57-card-hover cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export { VARIANTS as CARD_VARIANTS };
