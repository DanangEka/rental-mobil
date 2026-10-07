#!/usr/bin/env python3
"""
Build the Material Symbols subset used by <Icon>.

The unsubsetted variable font is 2.2MB. This reduces it to the glyphs actually
used, which is 24.5KB.

Icon names come from two places:
  1. the 28 mockups in stitch_cakra57_travel_web_redesign/*/code.html
  2. EXTRA_ICONS below, for icons the app needs that the mockups did not use

Icons resolve by codepoint rather than ligature: the served font maps Private
Use Area codepoints directly to icon-name glyphs, so there is no `liga` feature
to parse and no ambiguity between an icon name and a typo'd word of text.

Usage:
    python3 scripts/build-icon-subset.py

Requires: fonttools, brotli
    pip3 install --user fonttools brotli
"""

import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCKUP_GLOB = os.path.join(ROOT, "stitch_cakra57_travel_web_redesign")
OUT_FONT = os.path.join(ROOT, "src", "assets", "fonts", "material-symbols-subset.woff2")
OUT_MAP = os.path.join(ROOT, "src", "icon-codepoints.json")

GOOGLE_CSS = (
    "https://fonts.googleapis.com/css2?"
    "family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0..1,-50..200"
)
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

# Icons the app needs that the mockups did not reference.
EXTRA_ICONS = [
    "visibility_off",  # password field toggle
    "logout",
    "menu",
    "close",
    "login",           # navbar auth entry points
    "assignment",      # admin "Pesanan" menu item
    "attach_money",    # tariff callout in the utility bar
    "vpn_key",         # "Sewa Lepas Kunci" service tile
    "support_agent",
    "local_taxi",      # "Dengan Driver" service tile
    # Landing page service grid
    "apartment",       # Corporate Trip  (Material Symbols has no `business`)
    "confirmation_number",  # Hotel & Tiket
    "place",           # map pin / address
    "family_restroom",  # Family Trip
    "design_services",  # Travel Planning
    "stars",            # Luxury Experience
    "call",
    "mail",
    "warning",         # toast warning state
]

# Legacy Material Icons names, mapped to the modern name the font exposes.
ALIASES = {
    "camera_alt": "photo_camera",
    "charging_station": "ev_station",
    "chat_bubble_outline": "chat",
    "drive_eta": "schedule",
    "file_download": "download",
    "gps_fixed": "my_location",
    "location_on": "place",
    "new_releases": "auto_awesome",
    "phone": "call",
    "phone_iphone": "mobile",
    "report_problem": "report",
    "terrain": "landscape",
}


def icons_from_mockups():
    names = set()
    if not os.path.isdir(MOCKUP_GLOB):
        return names
    for entry in sorted(os.listdir(MOCKUP_GLOB)):
        path = os.path.join(MOCKUP_GLOB, entry, "code.html")
        if not os.path.isfile(path):
            continue
        html = open(path, encoding="utf-8", errors="ignore").read()
        for m in re.finditer(r"material-symbols-outlined[^>]*>([a-z_0-9]+)", html):
            names.add(m.group(1))
    return names


def fetch_full_font(dest):
    req = urllib.request.Request(GOOGLE_CSS, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=60).read().decode()
    url = re.search(r"url\((https://[^)]+\.woff2)\)", css).group(1)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with open(dest, "wb") as fh:
        fh.write(urllib.request.urlopen(req, timeout=180).read())


def main():
    try:
        from fontTools.ttLib import TTFont
        from fontTools import subset
    except ImportError:
        sys.exit("fonttools is required: pip3 install --user fonttools brotli")

    wanted = icons_from_mockups() | set(EXTRA_ICONS)
    print(f"icon names requested : {len(wanted)}")

    full = os.path.join("/tmp", "_ms_full.woff2")
    fetch_full_font(full)
    print(f"downloaded full font : {os.path.getsize(full) / 1048576:.1f} MB")

    font = TTFont(full)
    cmap = font.getBestCmap()
    glyph_order = font.getGlyphOrder()

    name2cp, unresolved = {}, []
    for name in sorted(wanted):
        target = ALIASES.get(name, name)
        cp = next((c for c, g in cmap.items() if g == target), None)
        if cp is None:
            unresolved.append(name)
        else:
            name2cp[name] = cp

    if unresolved:
        print(f"UNRESOLVED ({len(unresolved)}): {unresolved}")
        print("  add each to ALIASES in this script, or remove it from EXTRA_ICONS")

    keep = set()
    for name, cp in name2cp.items():
        g = cmap[cp]
        keep.add(g)
        if g + ".fill" in glyph_order:
            keep.add(g + ".fill")

    options = subset.Options()
    options.layout_features = ["rclt", "rlig"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.drop_tables += ["DSIG"]

    s = subset.Subsetter(options=options)
    s.populate(glyphs=keep | {".notdef"})
    s.subset(font)

    # Drop GRAD and pin wght; keep only the FILL axis, which <Icon filled> uses.
    from fontTools.varLib import instancer

    font = instancer.instantiateVariableFont(
        font, {"GRAD": 0, "wght": 400}, updateFontNames=False
    )
    font.flavor = "woff2"

    os.makedirs(os.path.dirname(OUT_FONT), exist_ok=True)
    font.save(OUT_FONT)

    with open(OUT_MAP, "w") as fh:
        json.dump(
            {"codepoints": dict(sorted(name2cp.items())), "aliases": ALIASES},
            fh,
            indent=0,
        )

    size = os.path.getsize(OUT_FONT) / 1024
    print(f"resolved            : {len(name2cp)}/{len(wanted)}")
    print(f"glyphs kept         : {len(keep)}")
    print(f"subset written      : {OUT_FONT} ({size:.1f} KB)")


if __name__ == "__main__":
    main()
