/**
 * Indonesia (outside Jawa and Bali) — 10 destinations.
 *
 * Editorial guide content for `destinationSpots.js` entries with
 * `region: "indonesia"`. Keyed by slug; see `./index.js` for the full guide
 * shape and the rules around `commercial`.
 *
 * This is the region that makes the per-slug timezone map necessary: it spans
 * WIB (Danau Toba), WITA (Komodo, Rinjani, Labuan Bajo, Padar, Segara Anak,
 * Komodo Dragon) and WIT (Raja Ampat, both records).
 *
 * Several slugs are near-duplicates of one another and are still separate
 * destinations — `raja-ampat` vs `majestic-raja-ampat`, `komodo` vs
 * `komodo-dragon`. They are authored independently rather than derived from
 * one another, because the guide copy should be specific to what the traveller
 * actually sees from each.
 *
 * Awaits copy. Exports an empty object so the module resolves; the detail page
 * falls back to its lean layout until entries land.
 */
/* Named so the module has an identity in React DevTools and so the
   anonymous-default-export lint rule is satisfied. */
const indonesiaGuides = {};

export default indonesiaGuides;
