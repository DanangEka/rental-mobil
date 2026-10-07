import Icon from "./Icon";

/**
 * Editorial Crimson button.
 *
 * Per DESIGN.md §Buttons:
 *   primary   — crimson fill, white label, pill, uppercase tracked
 *   secondary — transparent with a 1px umber border, inverts on hover
 *   success   — sage fill, deep forest label (approve, settle, confirm receipt)
 *   ghost     — Playfair with a hairline crimson underline 4px below baseline
 *   danger    — error-container fill with error text
 *   glass     — translucent, for a CTA placed over photography
 *
 * `success` exists because the admin order surfaces are full of "Setujui" /
 * "Konfirmasi Terima Uang" / "Tandai Selesai" actions. Those are affirmative
 * state transitions, not brand CTAs, and rendering them in crimson would
 * collide with the destructive `danger` on the same row. The sage pair is the
 * same one `Pill` uses for `available`, so the two agree.
 *
 * All variants are pill-shaped (DESIGN.md: CTAs use rounded-full). Uppercase
 * tracked labels use `label-md`; nothing here drops below the 11px floor.
 */

const VARIANTS = {
  primary:
    "bg-c57-primary-container text-c57-on-primary hover:bg-c57-primary " +
    "shadow-c57-card hover:shadow-c57-card-hover",
  secondary:
    "bg-transparent text-c57-secondary border border-c57-secondary " +
    "hover:bg-c57-secondary hover:text-c57-on-secondary",
  success:
    "bg-c57-available-bg text-c57-available-text hover:bg-c57-available-text " +
    "hover:text-c57-on-primary",
  ghost:
    "bg-transparent text-c57-primary font-display font-medium " +
    "hover:text-c57-primary-container",
  danger:
    "bg-c57-error-container text-c57-on-error-container " +
    "hover:bg-c57-error hover:text-c57-on-error",
  // For a CTA sitting on top of photography (hero, full-bleed banner). The
  // hairline border and blur keep the label AA over an unpredictable image.
  glass:
    "bg-c57-surface-bright/10 text-c57-surface-bright backdrop-blur-md " +
    "border border-c57-surface-bright/25 " +
    "hover:bg-c57-surface-bright/20 hover:border-c57-surface-bright/40",
};

const SIZES = {
  // 44px minimum touch target on sm and above, per the accessibility contract.
  sm: "px-space-md py-2 text-label-sm gap-space-xs",
  md: "px-space-lg py-2.5 text-label-md gap-space-sm",
  lg: "px-space-xl py-3.5 text-label-md gap-space-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  as: Tag = "button",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  className = "",
  children,
  ...rest
}) {
  const ghostUnderline = variant === "ghost";

  return (
    <Tag
      className={[
        "inline-flex items-center justify-center rounded-full",
        "font-label-md uppercase tracking-wider",
        "transition-all duration-300 ease-editorial select-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-c57-primary",
        "disabled:opacity-50 disabled:pointer-events-none",
        SIZES[size],
        VARIANTS[variant],
        ghostUnderline
          ? "underline decoration-c57-primary decoration-1 underline-offset-[6px] hover:decoration-c57-primary-container"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={Tag === "button" ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      aria-disabled={(Tag !== "button" && (disabled || loading)) || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon &&
        iconPosition === "left" && <Icon name={icon} size="lg" />
      )}

      {children}

      {!loading &&
        icon &&
        iconPosition === "right" && <Icon name={icon} size="lg" />}
    </Tag>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin"
      style={{ width: "16px", height: "16px" }}
      role="status"
      aria-label="Loading"
    />
  );
}

export { VARIANTS as BUTTON_VARIANTS, SIZES as BUTTON_SIZES };
