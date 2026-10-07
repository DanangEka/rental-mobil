import { CONTROL_BASE, CONTROL_ERROR } from "./Field";
import Icon from "./Icon";

/**
 * Native select, restyled. The native control is kept deliberately: a custom
 * listbox would need its own keyboard handling, focus management and screen
 * reader wiring, which is a large amount of new code for a form control that
 * appears in every booking form. The chevron is decorative — the native
 * element keeps its own semantics.
 */
export default function Select({
  label,
  error,
  tone = "light",
  className = "",
  children,
  ...rest
}) {
  // Chevron is decorative but must stay visible against the panel.
  const chevronInk =
    tone === "dark" ? "text-c57-surface-container-high" : "text-c57-on-surface-variant";

  return (
    <div className="relative w-full">
      <select
        className={[
          CONTROL_BASE,
          "appearance-none cursor-pointer pr-10",
          error && CONTROL_ERROR,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        {...rest}
      >
        {children}
      </select>
      <span
        className={`pointer-events-none absolute right-space-md top-1/2 -translate-y-1/2 flex items-center ${chevronInk}`}
      >
        <Icon name="expand_more" size="lg" />
      </span>
    </div>
  );
}
