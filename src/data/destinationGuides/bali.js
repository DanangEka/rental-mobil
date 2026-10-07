/**
 * Bali — 10 destinations.
 *
 * Editorial guide content for `destinationSpots.js` entries with
 * `region: "bali"`. Keyed by slug; see `./index.js` for the full guide shape
 * and the rules around `commercial`.
 *
 * Two slug traps here, both of which have already caused a 404:
 *   - `tegalalang` (Bali rice terrace) is spelled with two `l`s, while
 *     `tegallalang-subak` (Subak Ceking, the specific subak) has three.
 *   - `uluwatu` and `uluwatu-temple` are the same Pura Luhur Uluwatu;
 *     `uluwatu-cliff` is the cliff. Different records, different guides.
 *
 * Awaits copy. Exports an empty object so the module resolves; the detail page
 * falls back to its lean layout for every Bali destination until entries land.
 */
/* Named so the module has an identity in React DevTools and so the
   anonymous-default-export lint rule is satisfied. */
const baliGuides = {};

export default baliGuides;
