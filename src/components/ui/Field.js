import { useId } from "react";
import Icon from "./Icon";

/**
 * Label + control + hint + error, wired for screen readers.
 *
 * `Field` owns the id plumbing so callers never hand-roll
 * `aria-describedby`. Pass the generated `controlProps` to the input:
 *
 *   <Field label="Email" error={err}>
 *     {(p) => <Input {...p} value={v} onChange={fn} />}
 *   </Field>
 *
 * When the control is invalid the hint is hidden and only the error is
 * announced, so a screen reader does not read both.
 *
 * `tone="dark"` is for controls sitting on a `c57-inverse-surface` panel. The
 * default label/error inks are dark-on-light tokens and drop to ~1.4:1 there,
 * so the dark tone swaps them for the light set instead.
 */

export default function Field({
  label,
  hint,
  error,
  required = false,
  labelAction,
  tone = "light",
  className = "",
  children,
  ...rest
}) {
  const id = useId();
  const dark = tone === "dark";
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const controlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  };

  return (
    <div className={`flex flex-col gap-space-sm ${className}`} {...rest}>
      {(label || labelAction) && (
        <div className="flex items-center justify-between gap-space-md">
          {label && (
            <label
              htmlFor={id}
              className={`font-label-sm uppercase tracking-widest ${
                dark ? "text-c57-surface-container-high" : "text-c57-on-surface-variant"
              }}`}
            >
              {label}
              {required && <span className="text-c57-primary ml-1">*</span>}
            </label>
          )}
          {labelAction}
        </div>
      )}

      {typeof children === "function" ? children(controlProps) : children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className={`flex items-start gap-1.5 text-body-sm ${
            dark ? "text-c57-error-container" : "text-c57-on-error-container"
          }`}
        >
          <Icon name="info" size="sm" className="mt-px shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={hintId}
            className={`text-body-sm ${
              dark ? "text-c57-surface-container-high" : "text-c57-on-surface-variant"
            }`}
          >
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared control styling. Not exported — use Field + Input/Select.     */
/* ------------------------------------------------------------------ */

export const CONTROL_BASE = [
  "w-full rounded-c57-md bg-c57-surface-container-low",
  "px-space-md py-3 text-body-md text-c57-on-surface",
  "placeholder:text-c57-outline",
  "border border-c57-surface-variant",
  "transition-colors duration-200",
  "focus:outline-none focus:border-c57-primary-container",
  "focus:bg-c57-surface",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export const CONTROL_ERROR =
  "border-c57-error focus:border-c57-error";
