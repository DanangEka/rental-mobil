#!/usr/bin/env python3
"""
Derive `--c57-<name>-rgb` channel-triplet variables from the hex tokens in
src/index.css.

Why: Tailwind's alpha modifier (`bg-c57-primary/10`) is implemented as
`rgb(<color> / <alpha-value>)`. That only works if the custom colour is a
function containing `<alpha-value>`. With a plain `var(--c57-primary)` Tailwind
emits nothing at all for the modifier, so the class is a *silent no-op* — it
looks correct in review and renders as no background.

So each colour needs two forms:
    --c57-primary:      #6E0000;          /* readable, and used by
                                             color-mix() / gradients       */
    --c57-primary-rgb:  110 0 0;           /* consumed by tailwind.config */

Both are generated from the single hex value, so they cannot drift. Re-run
after editing any hex in src/index.css. Idempotent.

Usage:
    python3 scripts/build-color-rgb-vars.py [--check]
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "src", "index.css")

HEX_RE = re.compile(r"^(\s*)--c57-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{3,8})\s*;(.*)$")
GENERATED_RE = re.compile(r"^\s*--c57-[a-z0-9-]+-rgb:\s*[0-9 ]+;\s*$")


def to_rgb(value):
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) == 8:  # strip alpha; tokens are opaque
        h = h[:6]
    if len(h) != 6:
        raise ValueError(f"cannot parse {value}")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def main():
    check_only = "--check" in sys.argv
    lines = open(CSS, encoding="utf-8").read().split("\n")

    out, count, drift = [], 0, []
    for line in lines:
        if GENERATED_RE.match(line):
            continue  # drop previously generated, we re-emit fresh
        out.append(line)
        m = HEX_RE.match(line)
        if not m:
            continue
        indent, name, hexval, trailing = m.groups()
        count += 1
        r, g, b = to_rgb(hexval)
        out.append(f"{indent}--c57-{name}-rgb:      {r} {g} {b};")

    text = "\n".join(out)

    if check_only:
        current = open(CSS, encoding="utf-8").read()
        if current != text:
            print("src/index.css is out of date with the rgb generator.")
            print("re-run: python3 scripts/build-color-rgb-vars.py")
            return 1
        print(f"rgb vars up to date ({count} tokens)")
        return 0

    if text == "\n".join(lines):
        print(f"rgb vars already up to date ({count} tokens)")
        return 0

    open(CSS, "w", encoding="utf-8").write(text)
    print(f"wrote {count} --c57-*-rgb vars into src/index.css")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
