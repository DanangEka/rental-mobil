import Icon from "./Icon";

/**
 * Admin dashboard KPI tile. Per DESIGN.md the label is `label-sm` uppercase
 * tracked and the value is a display-face numeral, so the number reads as the
 * primary datum and the unit never competes with it.
 *
 * `trend` is a signed percentage; sign is conveyed by the arrow icon and the
 * word as well as the colour, because status must never be carried by colour
 * alone.
 */
export default function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  className = "",
}) {
  const improving = typeof trend === "number" && trend >= 0;
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);

  return (
    <div
      className={`rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-space-lg shadow-c57-card ${className}`}
    >
      <div className="flex items-start justify-between gap-space-md">
        <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
          {label}
        </p>
        {icon && (
          <span className="shrink-0 w-9 h-9 rounded-full bg-c57-surface-container flex items-center justify-center">
            <Icon name={icon} size="sm" className="text-c57-primary" />
          </span>
        )}
      </div>

      <p className="mt-space-md flex items-baseline gap-1.5">
        <span className="font-headline-sm text-headline-sm text-c57-on-surface tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="font-label-md uppercase tracking-wider text-c57-on-surface-variant">
            {unit}
          </span>
        )}
      </p>

      {hasTrend && (
        <p
          className={`mt-2 flex items-center gap-1 text-body-sm ${
            improving ? "text-c57-available-text" : "text-c57-on-error-container"
          }`}
        >
          <Icon name={improving ? "trending_up" : "trending_flat"} size="xs" />
          <span className="tabular-nums">
            {improving ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && <span className="text-c57-on-surface-variant">— {trendLabel}</span>}
        </p>
      )}
    </div>
  );
}
