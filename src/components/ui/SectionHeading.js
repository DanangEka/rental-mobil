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
            "flex items-center gap-space-sm font-label-sm uppercase tracking-[0.28em] text-c57-primary",
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

      <h2 className="font-headline-lg text-headline-lg text-c57-on-surface mt-3 leading-[1.15]">
        {title}
        {italic && <em className="font-normal italic">{italic}</em>}
      </h2>

      {description && (
        <p className="text-body-lg text-c57-on-surface-variant mt-4 leading-relaxed font-light">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}
