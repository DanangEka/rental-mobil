import Icon from "./Icon";

/**
 * Editorial Crimson status/category pill.
 *
 * Per DESIGN.md §Badges:
 *   neutral    — oat container, charcoal label        (category, fleet tag)
 *   signature  — crimson fill, white label           ("Driver Included", "VIP")
 *   available  — soft sage, deep forest label        (availability)
 *   sand       — tertiary container, dark umber label (luxury tier)
 *   danger     — error container, deep crimson label (rejected, overdue)
 *   outline    — hairline only, for neutral counts
 *   onScrim    — for use on #151515 heroes and footers
 *
 * Labels are `label-sm` uppercase tracked. 11px is the documented floor and
 * is the only size that is permitted here.
 */

const VARIANTS = {
  neutral: "bg-c57-surface-container text-c57-on-surface",
  signature: "bg-c57-primary-container text-c57-on-primary",
  available: "bg-c57-available-bg text-c57-available-text",
  sand: "bg-c57-tertiary-container text-c57-on-tertiary-container",
  danger: "bg-c57-error-container text-c57-on-error-container",
  outline: "bg-transparent border border-c57-outline-variant text-c57-on-surface-variant",
  onScrim:
    "bg-white/10 text-c57-on-scrim backdrop-blur-sm border border-white/10",
};

export default function Pill({
  variant = "neutral",
  icon,
  size = "sm",
  className = "",
  children,
  ...rest
}) {
  const sizing =
    size === "md"
      ? "px-space-md py-1.5 text-label-md gap-1.5"
      : "px-space-sm py-1 text-label-sm gap-1";


  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-label-sm uppercase tracking-wider",
        "leading-none whitespace-nowrap",
        sizing,
        VARIANTS[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "md" ? "sm" : "xs"} />}
      {children}
    </span>
  );
}

export { VARIANTS as PILL_VARIANTS };
