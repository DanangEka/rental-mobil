import { forwardRef } from "react";
import { CONTROL_BASE, CONTROL_ERROR } from "./Field";
import Icon from "./Icon";

/**
 * `trailing` renders a control pinned to the right edge inside the field — the
 * password visibility toggle, a clear button. Kept as a slot rather than baked
 * in as a `showPassword` prop so Select/Textarea-style affordances can reuse
 * the same pattern without Input growing password-specific branches.
 *
 * The ref is forwarded to the `<input>` itself, not the wrapper, so a caller
 * that needs to read or imperatively clear a value — the admin-note row in
 * TripRequestsQueue does both — does not have to fall back to a bare input.
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    icon,
    trailing,
    size = "md",
    tone = "light",
    className = "",
    ...rest
  },
  ref
) {
  // The leading icon and trailing affordance inherit a dark ink that vanishes
  // on a dark panel, so `tone="dark"` swaps them for the light set.
  const dark = tone === "dark";
  const affordanceInk = dark ? "text-c57-surface-container-high" : "text-c57-on-surface-variant";

  return (
    <div className="relative w-full">
      {icon && (
        <span className={`absolute left-space-md top-1/2 -translate-y-1/2 pointer-events-none flex ${affordanceInk}`}>
          <Icon name={icon} size="lg" />
        </span>
      )}

      {trailing && (
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center transition-colors ${affordanceInk} hover:text-c57-primary`}>
          {trailing}
        </span>
      )}

      <input
        ref={ref}
        className={[
          CONTROL_BASE,
          error && CONTROL_ERROR,
          icon && "pl-10",
          trailing && "pr-12",
          size === "lg" && "py-3.5 text-body-lg",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        {...rest}
      />
    </div>
  );
});

export default Input;
