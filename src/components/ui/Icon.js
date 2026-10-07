import codepoints from "../../icon-codepoints.json";

/**
 * Material Symbols Outlined, subset to exactly the glyphs the redesign
 * mockups use (~25KB versus 2.2MB unsubsetted). The glyph list and the
 * generated woff2 are owned by scripts/build-icon-subset.py -- run it after
 * changing src/icon-codepoints.json; do not hand-edit the font.
 *
 * Icons resolve by codepoint rather than ligature: the subset is driven from
 * src/icon-codepoints.json, generated from the mockups, so there is no
 * ligature parsing at runtime and no ambiguity between an icon name and a
 * typo'd word of text.
 */
const CODEPOINTS = codepoints.codepoints;

const SIZES = {
  xs: 12,
  sm: 14,
  md: 16, // mockups' most common size (237 uses)
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
};

export default function Icon({
  name,
  size = "md",
  filled = false,
  className = "",
  title,
  ...rest
}) {
  const cp = CODEPOINTS[name];

  // Failing loudly beats rendering an empty box: a missing glyph is a
  // bug in icon-codepoints.json, not a runtime condition to swallow.
  if (!cp) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[Icon] "${name}" is not in the Material Symbols subset. ` +
          `Add it to the allowlist and re-run scripts/build-icon-subset.py.`
      );
    }
    return null;
  }

  const px = typeof size === "number" ? size : SIZES[size] || SIZES.md;

  // The subset retains only the FILL axis, so this is the whole variation
  // story. `.fill` glyph names are handled by the FILL axis, not a second
  // codepoint.
  const style = {
    fontSize: `${px}px`,
    width: `${px}px`,
    height: `${px}px`,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0`,
  };

  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : "true"}
      className={`material-symbols-outlined ${className}`.trim()}
      style={style}
      {...rest}
    >
      {String.fromCodePoint(cp)}
    </span>
  );
}

export { SIZES as ICON_SIZES };
