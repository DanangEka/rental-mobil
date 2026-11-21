/**
 * Editorial section heading. Per DESIGN.md §Typography the display face sets
 * the tempo, and the section separations carry generous vertical padding
 * (5rem-7rem desktop) so fleet and itinerary content can breathe.
 *
 * `align` exists for the LandingPage grid, where a section heading sits in a
 * right-hand column opposite a list rather than spanning full width.
 */
export default function SectionHeading({
  eyebrow,
  title,
  italic,
  description,
  align = "left",
  editorial = false,
  className = "",
  children,
}) {
  return (
    <div
      className={[
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        align === "right" && "ml-auto text-right",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow && (
        <p
          className={[
            "flex items-center gap-space-sm font-label-sm uppercase tracking-[0.28em]",
            editorial ? "text-c57-secondary" : "text-c57-primary",
            align === "center" && "justify-center",
            align === "right" && "justify-end",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {align !== "right" && <span className="accent-line" aria-hidden="true" />}
          {eyebrow}
        </p>
      )}

      {editorial ? (
        <h2 className="mt-3 font-display text-[clamp(2rem,3.8vw,3.1rem)] font-normal leading-[1.04] tracking-[-0.02em] text-c57-on-surface">
          {title}
          {italic && <em className="font-normal italic">{italic}</em>}
        </h2>
      ) : (
        <h2 className="font-headline-lg text-headline-lg text-c57-on-surface mt-3 leading-[1.15]">
          {title}
          {italic && <em className="font-normal italic">{italic}</em>}
        </h2>
      )}

      {description && (
        <p
          className={[
            "mt-4 max-w-2xl font-light leading-relaxed text-c57-on-surface-variant",
            editorial ? "text-[0.95rem]" : "text-body-lg",
          ].join(" ")}
        >
          {description}
        </p>
      )}

      {children}
    </div>
  );
}
