/**
 * ASEAN — 14 destinations.
 *
 * Editorial guide content for `destinationSpots.js` entries with
 * `region: "asean"`. Keyed by slug; see `./index.js` for the full guide shape
 * and the rules around `commercial`.
 *
 * The international entries are the ones most likely to drift into invented
 * detail — specific temple names, dive depths, visa rules, toll figures, exact
 * temple-hours. Copy written for this file is limited to durable, widely
 * published facts, and anything current (opening hours, prices, visa policy)
 * is left to the concierge rather than asserted in prose.
 *
 * `chocolate-hills` and `chocolate-hills-sunset` are the same Bohol landform
 * framed differently, and `grand-palace` / `phi-phi` / `chiang-mai` split
 * Thailand across Bangkok, the Krabi archipelago and the Lanna north. Each
 * guide stands on its own.
 *
 * Awaits copy. Exports an empty object so the module resolves; the detail page
 * falls back to its lean layout until entries land.
 */
/* Named so the module has an identity in React DevTools and so the
   anonymous-default-export lint rule is satisfied. */
const aseanGuides = {};

export default aseanGuides;
