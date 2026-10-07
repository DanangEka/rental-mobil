import jawaGuides from "./jawa";
import baliGuides from "./bali";
import indonesiaGuides from "./indonesia";
import aseanGuides from "./asean";

/**
 * Editorial "definitive guide" content for the destination detail page
 * (`/destinasi/:region/:slug`).
 *
 * Why this is separate from `destinationSpots.js`
 * ----------------------------------------------
 * `destinationSpots.js` is the *catalogue*: one record per destination, used by
 * the Discovery grid, the region listings and the filter chips. It is short on
 * purpose — name, city, category, mood, image.
 *
 * This module is the *long-form editorial layer*: a second, independently
 * authored record keyed by the same `slug`, holding the prose that the detail
 * page renders. Splitting the two means the catalogue stays cheap to read and
 * the guide content can be reviewed, written and corrected on its own
 * schedule without touching discovery surfaces.
 *
 * Guide shape
 * -----------
 * {
 *   subtitle:    string,   // Playfair italic continuation of the H1
 *   lead:        string,   // one editorial paragraph under the H1
 *   facts:       [         // exactly four, in the design's order
 *     { icon, label, value },
 *   ],
 *   panorama:    { label, quote },
 *   narrative:   { title, body: [string], quote, quoteBy },
 *   light:       { title, intro, timeline: [ { time, title, body, active } ] },
 *   gear:        [ { icon, title, description } ],   // exactly four
 *   route:       { title, body, note },
 *   culinary:    { name, description },
 *   commercial:  null,     // see the note below
 * }
 *
 * About `commercial`
 * ------------------
 * The Tumpak Sewu mockup shows a price, a 50% deposit, an inclusions list and
 * a "Pesan Perjalanan Ini (Bayar DP 50%)" button. None of those numbers are
 * approved, and inventing a rate for 46 destinations would be worse than
 * showing nothing. So `commercial` is `null` everywhere today and the page
 * renders a neutral concierge enquiry instead.
 *
 * The field is kept in the schema on purpose: it is the documented seam where
 * real pricing drops in later, and a validator asserts it is `null` so a
 * stray number cannot ship by accident.
 *
 * Facts about the copy
 * --------------------
 * Season windows, difficulty labels and the timings in `light.timeline` are
 * general-knowledge editorial drafts for the destination, not a statement of
 * what Cakra 57 actually operates. Nothing here is a promise.
 */

/**
 * Local time zone per destination, used by the page to show how a destination
 * lines up against WIB when a traveller books from Indonesia.
 *
 * Keyed by slug rather than region because a region spans several zones:
 * `indonesia` alone covers WIB (Danau Toba), WITA (Komodo, Rinjani) and WIT
 * (Raja Ampat). Note `tegalalang` — the Bali slug has two `l`s, matching
 * `destinationSpots.js` and not the more common single-`l` spelling.
 */
export const TIMEZONE_BY_SLUG = {
  // Jawa — WIB
  "gunung-bromo": "WIB (UTC+7)",
  "candi-borobudur": "WIB (UTC+7)",
  "candi-prambanan": "WIB (UTC+7)",
  "kawah-ijen": "WIB (UTC+7)",
  malioboro: "WIB (UTC+7)",
  semeru: "WIB (UTC+7)",
  "batok-caldera": "WIB (UTC+7)",
  "ketandan-malioboro": "WIB (UTC+7)",
  "borobudur-stupa": "WIB (UTC+7)",
  "prambanan-sunset": "WIB (UTC+7)",
  "bromo-plain": "WIB (UTC+7)",
  "prambanan-gate": "WIB (UTC+7)",

  // Bali — WITA
  "tanah-lot": "WITA (UTC+8)",
  uluwatu: "WITA (UTC+8)",
  tegalalang: "WITA (UTC+8)",
  "uluwatu-cliff": "WITA (UTC+8)",
  kelingking: "WITA (UTC+8)",
  "monkey-forest": "WITA (UTC+8)",
  "tanah-lot-sunset": "WITA (UTC+8)",
  "uluwatu-temple": "WITA (UTC+8)",
  "tegallalang-subak": "WITA (UTC+8)",
  "benoa-beach": "WITA (UTC+8)",

  // Indonesia — mixed
  "raja-ampat": "WIT (UTC+9)",
  "majestic-raja-ampat": "WIT (UTC+9)",
  komodo: "WITA (UTC+8)",
  "danau-toba": "WIB (UTC+7)",
  rinjani: "WITA (UTC+8)",
  "labuan-bajo": "WITA (UTC+8)",
  waerebo: "WITA (UTC+8)",
  "padar-island": "WITA (UTC+8)",
  "segara-anak": "WITA (UTC+8)",
  "komodo-dragon": "WITA (UTC+8)",

  // ASEAN
  "angkor-wat": "UTC+7",
  "ha-long-bay": "UTC+7",
  "grand-palace": "UTC+7",
  petronas: "UTC+8",
  "sapa-terrace": "UTC+7",
  "marina-bay": "UTC+8",
  "el-nido": "UTC+8",
  bagan: "UTC+6:30",
  "phi-phi": "UTC+7",
  boracay: "UTC+8",
  "luang-prabang": "UTC+7",
  "chocolate-hills": "UTC+8",
  "chiang-mai": "UTC+7",
  "chocolate-hills-sunset": "UTC+8",
};

/**
 * Every authored guide, flattened into one slug-keyed object.
 *
 * A later region file wins on a duplicate slug. That is deliberate: it makes a
 * copy-paste collision between two region files loud during review rather than
 * silent. `src/__tests__/destinationGuides.test.js` asserts the total is
 * exactly 46, so a collision shows up as a failing count.
 */
export const destinationGuides = {
  ...jawaGuides,
  ...baliGuides,
  ...indonesiaGuides,
  ...aseanGuides,
};

/**
 * Look up the editorial guide for a slug.
 *
 * Returns `undefined` when a destination has no guide yet — the detail page
 * treats that as a normal state, not an error, and falls back to a lean
 * layout built from the catalogue record plus a concierge enquiry. Every one
 * of the 46 destinations is reachable that way on day one.
 */
export function getDestinationGuide(slug) {
  if (!slug) return undefined;
  return destinationGuides[slug];
}

/** Local time zone for a slug, or `null` when the slug is not in the map. */
export function getDestinationTimezone(slug) {
  if (!slug) return null;
  return TIMEZONE_BY_SLUG[slug] || null;
}

/** Slugs that have editorial copy, sorted — used by the test suite for coverage. */
export function authoredGuideSlugs() {
  return Object.keys(destinationGuides).sort();
}
