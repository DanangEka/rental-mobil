import { CONTROL_BASE, CONTROL_ERROR } from "./Field";

export default function Textarea({ label, error, rows = 4, className = "", ...rest }) {
  return (
    <textarea
      rows={rows}
      className={[CONTROL_BASE, "resize-y", error && CONTROL_ERROR, className]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      {...rest}
    />
  );
}
