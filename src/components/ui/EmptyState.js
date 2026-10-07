import Button from "./Button";
import Icon from "./Icon";

/**
 * Every list view in this app can return nothing — no bookings in a date
 * range, no fleet matching a filter, no pending KYC. Before the redesign each
 * of those invented its own inline message, usually 10px grey text.
 *
 * Takes a `icon` name so the visual weight matches the surrounding surface:
 * use a light-surface icon on light pages and `travel_explore`-style on scrim.
 */
export default function EmptyState({
  icon = "search",
  title,
  description,
  action,
  actionTo,
  /**
   * Off-site action, e.g. the WhatsApp deep link the catalogue and Open Trip
   * empty states both end on. Gets `target`/`rel` so the tab is not hijacked
   * and the opener is not leaked; `actionTo` stays for in-app routes.
   */
  actionHref,
  actionIcon,
  onAction,
  variant = "light",
  className = "",
}) {
  const onScrim = variant === "scrim";

  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        "rounded-c57-lg border border-dashed px-space-lg py-space-xl",
        onScrim
          ? "border-white/15 bg-transparent"
          : "border-c57-outline-variant bg-c57-surface-container-lowest",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={`w-14 h-14 rounded-full flex items-center justify-center ${
          onScrim ? "bg-white/10" : "bg-c57-surface-container"
        }`}
      >
        <Icon
          name={icon}
          size="2xl"
          className={onScrim ? "text-c57-on-scrim" : "text-c57-primary"}
        />
      </span>

      {title && (
        <h3
          className={`font-headline-sm text-headline-sm mt-space-lg ${
            onScrim ? "text-c57-on-scrim" : "text-c57-on-surface"
          }`}
        >
          {title}
        </h3>
      )}

      {description && (
        <p
          className={`text-body-md mt-2 max-w-sm ${
            onScrim ? "text-on-scrim-body" : "text-c57-on-surface-variant"
          }`}
        >
          {description}
        </p>
      )}

      {action && (
        <div className="mt-space-lg">
          <Button
            variant={onScrim ? "secondary" : "primary"}
            onClick={onAction}
            as={actionTo || actionHref ? "a" : "button"}
            href={actionHref || actionTo}
            target={actionHref ? "_blank" : undefined}
            rel={actionHref ? "noopener noreferrer" : undefined}
            icon={actionIcon || "arrow_forward"}
            iconPosition="right"
          >
            {action}
          </Button>
        </div>
      )}
    </div>
  );
}
