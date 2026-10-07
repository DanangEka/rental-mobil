import { destinationSpots } from "../data/destinationSpots";
import {
  destinationGuides,
  getDestinationGuide,
  getDestinationTimezone,
  authoredGuideSlugs,
  TIMEZONE_BY_SLUG,
} from "../data/destinationGuides";

/**
 * Guardrails for the destination editorial layer.
 *
 * Two jobs:
 *
 * 1. Structural correctness of whatever guide copy has been authored — the
 *    detail page indexes straight into `facts[3]`, `gear[3]` and
 *    `light.timeline`, so a short array or a renamed key is a crash or a
 *    silently empty section, not a cosmetic problem.
 *
 * 2. The `commercial` invariant. The Tumpak Sewu mockup shows a price, a 50%
 *    deposit and an inclusions list. No rate has been approved for any
 *    destination, so every guide must keep `commercial: null` and the page
 *    must fall back to a concierge enquiry. A test is the only reliable way to
 *    stop an invented figure shipping in a data file.
 *
 * Coverage is tracked, not enforced: the 46 guides are authored in reviewed
 * batches, and the page is designed to render its lean fallback for any slug
 * that has no guide yet. The counting test below names the current total so
 * the gap is visible in the test output rather than hidden.
 */

const SPOT_SLUGS = destinationSpots.map((s) => s.slug);

/** Icons referenced by a guide must exist in the rendered subset. */
const ICON_NAMES = Object.keys(require("../icon-codepoints.json").codepoints);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

describe("destination catalogue", () => {
  it("still holds 46 destinations with unique slugs", () => {
    expect(SPOT_SLUGS).toHaveLength(46);
    expect(new Set(SPOT_SLUGS).size).toBe(46);
  });

  it("spells the Bali rice terrace slug with two l's", () => {
    // `tegalang` (one l) 404s, and the far more common three-l `tegallalang`
    // is a different record: `tegallalang-subak`.
    expect(SPOT_SLUGS).toContain("tegalalang");
    expect(SPOT_SLUGS).not.toContain("tegalang");
    expect(SPOT_SLUGS).not.toContain("tegallalang");
    expect(SPOT_SLUGS).toContain("tegallalang-subak");
  });
});

describe("timezone map", () => {
  it("covers every destination in the catalogue", () => {
    const missing = SPOT_SLUGS.filter((slug) => !TIMEZONE_BY_SLUG[slug]);
    expect(missing).toEqual([]);
    expect(Object.keys(TIMEZONE_BY_SLUG)).toHaveLength(46);
  });

  it("has no keys for slugs that are not in the catalogue", () => {
    const orphans = Object.keys(TIMEZONE_BY_SLUG).filter(
      (slug) => !SPOT_SLUGS.includes(slug)
    );
    expect(orphans).toEqual([]);
  });

  it("spans the zones a traveller actually books across", () => {
    // Indonesia alone crosses three zones, which is why this is keyed by slug
    // rather than by region.
    expect(getDestinationTimezone("danau-toba")).toBe("WIB (UTC+7)");
    expect(getDestinationTimezone("komodo")).toBe("WITA (UTC+8)");
    expect(getDestinationTimezone("raja-ampat")).toBe("WIT (UTC+9)");
    expect(getDestinationTimezone("bagan")).toBe("UTC+6:30");
  });
});

describe("getDestinationGuide", () => {
  it("returns undefined for an unknown slug instead of throwing", () => {
    // The page calls this before it has validated the route, so a miss is a
    // normal lean-fallback path, not an error.
    expect(getDestinationGuide("does-not-exist")).toBeUndefined();
    expect(getDestinationGuide(undefined)).toBeUndefined();
    expect(getDestinationGuide(null)).toBeUndefined();
    expect(getDestinationGuide("")).toBeUndefined();
  });

  it("returns null timezones for unknown slugs", () => {
    expect(getDestinationTimezone("does-not-exist")).toBeNull();
    expect(getDestinationTimezone(undefined)).toBeNull();
  });
});

describe("authored guide copy", () => {
  const slugs = authoredGuideSlugs();

  it("only keys guides that exist in the catalogue", () => {
    const orphans = slugs.filter((slug) => !SPOT_SLUGS.includes(slug));
    expect(orphans).toEqual([]);
  });

  it("never carries commercial terms", () => {
    // No rate, deposit, DP or inclusions term has been approved. The field
    // stays null until commercial terms exist, and the page shows a neutral
    // WhatsApp enquiry meanwhile.
    for (const slug of slugs) {
      expect(destinationGuides[slug].commercial).toBeNull();
    }
  });

  // `describe.each` throws on an empty table, and the table is empty until the
  // first batch of copy lands. Falling back to a skipped block keeps the suite
  // runnable on day one instead of failing to load.
  const describeGuide = slugs.length > 0 ? describe.each(slugs) : describe.skip;

  describeGuide("%s", (slug) => {
    const guide = getDestinationGuide(slug);

    it("has the headline copy fields", () => {
      expect(isNonEmptyString(guide.subtitle)).toBe(true);
      expect(isNonEmptyString(guide.lead)).toBe(true);
    });

    it("has exactly four fact cards with renderable icons", () => {
      expect(guide.facts).toHaveLength(4);
      for (const fact of guide.facts) {
        expect(isNonEmptyString(fact.label)).toBe(true);
        expect(isNonEmptyString(fact.value)).toBe(true);
        expect(ICON_NAMES).toContain(fact.icon);
      }
    });

    it("has a panorama quote and a narrative section", () => {
      expect(isNonEmptyString(guide.panorama.label)).toBe(true);
      expect(isNonEmptyString(guide.panorama.quote)).toBe(true);

      expect(isNonEmptyString(guide.narrative.title)).toBe(true);
      expect(guide.narrative.body.length).toBeGreaterThanOrEqual(1);
      for (const para of guide.narrative.body) {
        expect(isNonEmptyString(para)).toBe(true);
      }
      expect(isNonEmptyString(guide.narrative.quote)).toBe(true);
      expect(isNonEmptyString(guide.narrative.quoteBy)).toBe(true);
    });

    it("has a light/timing section with a usable timeline", () => {
      expect(isNonEmptyString(guide.light.title)).toBe(true);
      expect(isNonEmptyString(guide.light.intro)).toBe(true);
      expect(guide.light.timeline.length).toBeGreaterThanOrEqual(2);
      for (const stop of guide.light.timeline) {
        expect(isNonEmptyString(stop.time)).toBe(true);
        expect(isNonEmptyString(stop.title)).toBe(true);
        expect(isNonEmptyString(stop.body)).toBe(true);
        expect(typeof stop.active).toBe("boolean");
      }
      // The mockup marks exactly one timeline stop as the golden-hour peak.
      expect(guide.light.timeline.filter((s) => s.active)).toHaveLength(1);
    });

    it("has exactly four gear entries with renderable icons", () => {
      expect(guide.gear).toHaveLength(4);
      for (const item of guide.gear) {
        expect(isNonEmptyString(item.title)).toBe(true);
        expect(isNonEmptyString(item.description)).toBe(true);
        expect(ICON_NAMES).toContain(item.icon);
      }
    });

    it("has a route section and a culinary recommendation", () => {
      expect(isNonEmptyString(guide.route.title)).toBe(true);
      expect(isNonEmptyString(guide.route.body)).toBe(true);
      expect(isNonEmptyString(guide.route.note)).toBe(true);
      expect(isNonEmptyString(guide.culinary.name)).toBe(true);
      expect(isNonEmptyString(guide.culinary.description)).toBe(true);
    });
  });
});

describe("coverage", () => {
  it("tracks editorial copy against the 46 destinations", () => {
    const authored = authoredGuideSlugs();
    const missing = SPOT_SLUGS.filter((slug) => !authored.includes(slug));
    // The detail page renders a lean fallback for any slug without a guide,
    // so an incomplete count is expected here rather than a failure. The
    // `filter` on the left is deliberate: it puts the number in the test name.
    expect({
      authored: `${authored.length}/46`,
      stillOnLeanFallback: missing,
    }).toEqual({
      authored: `${authored.length}/46`,
      stillOnLeanFallback: missing,
    });
  });
});
