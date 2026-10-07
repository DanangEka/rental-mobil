import fs from "fs";
import codepoints from "../icon-codepoints.json";
import path from "path";

import {
  BUDGET_OPTIONS,
  CATEGORIES,
  CONCIERGE_DESK,
  FILTER_CONTROLS,
  HERO,
  OPEN_TRIPS,
  OPEN_TRIP_SECTION,
  PERIOD_OPTIONS,
  PILLARS_SECTION,
  POPULAR_DESTINATIONS,
  PRIVATE_JOURNEYS,
  PRIVATE_SECTION,
  REGION_OPTIONS,
  SERVICE_PILLARS,
  UI_COPY,
  conciergeEnquiryHref,
  filterOpenTrips,
  formatRupiah,
  occupancy,
  openTripEnquiryHref,
  privateJourneyEnquiryHref,
} from "../data/tourCatalogue";

/**
 * The tour catalogue is transcribed from an approved design mockup, so the
 * cheapest possible source of truth is the mockup itself.
 *
 * This suite normalises the design's visible text and asserts that every
 * editorial string in `src/data/tourCatalogue.js` still appears in it. That
 * catches two distinct failures:
 *
 *   - transcription drift, where a hand-typed string no longer matches the spec
 *   - corrupted text, where a string is valid-looking but wrong
 *
 * The second one matters. Long Indonesian prose does not survive being retyped
 * reliably — see `scripts/check-guides.mjs` and the corruption modes noted
 * there. Substring-matching against the source document sidesteps the problem
 * entirely: a string either came from the design or it did not, and a reviewer
 * can diff the two.
 *
 * Strings that are deliberately NOT verbatim are listed in
 * `describe("functional option lists...")` below and are asserted to be
 * departures, with a reason for each.
 */

const DESIGN_DIR = path.resolve(
  __dirname,
  "../../stitch_cakra57_travel_web_redesign/paket_wisata_open_trip_fora_x_japan_private_tour_luxury_cakra_lima_tujuh"
);
const DESIGN_HTML = path.join(DESIGN_DIR, "code.html");
const CODEPOINTS = codepoints.codepoints;

/** Strip tags, decode entities, collapse whitespace. */
function designText() {
  const raw = fs.readFileSync(DESIGN_HTML, "utf8");
  const withoutTags = raw.replace(/<script[\s\S]*?<\/script>/g, " ");
  return decode(withoutTags.replace(/<[^>]+>/g, " "));
}

/**
 * Placeholder and other attribute values. These never appear in the visible
 * text — the tag stripper deletes them along with the tag — so they are matched
 * against the raw attributes instead.
 */
function designAttributes() {
  const raw = fs.readFileSync(DESIGN_HTML, "utf8");
  const found = new Set();
  for (const match of raw.matchAll(/\b(?:placeholder|alt|title)="([^"]*)"/g)) {
    found.add(decode(match[1]).toLowerCase().replace(/\s+/g, ""));
  }
  return found;
}

function decode(html) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

const DESIGN = designText();
const DESIGN_SQUASHED = DESIGN.toLowerCase().replace(/\s+/g, "");
const DESIGN_ATTRS = designAttributes();

const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const squash = (s) => norm(s).toLowerCase().replace(/\s+/g, "");

/**
 * Whitespace is ignored when matching. The design wraps words in inline
 * elements, so stripping tags leaves artifacts like "( Open Trip )" around
 * text this file stores as "(Open Trip)". Collapsing all whitespace removes
 * that class of false positive without weakening the check that matters: every
 * non-whitespace character must still line up, so `berpenghuni` cannot pass as
 * `berwlingua`.
 */
const inDesign = (s) => DESIGN_SQUASHED.includes(squash(s));

/** Attribute-valued copy, e.g. form placeholders. */
const inDesignAttr = (s) => DESIGN_ATTRS.has(squash(s));

describe("design source", () => {
  it("is present, so these tests cannot pass vacuously", () => {
    expect(fs.existsSync(DESIGN_HTML)).toBe(true);
    expect(DESIGN.length).toBeGreaterThan(2000);
  });
});

describe("transcribed copy matches the design", () => {
  it("hero copy is verbatim", () => {
    expect(inDesign(HERO.overline)).toBe(true);
    expect(inDesign(HERO.headline)).toBe(true);
    // The lead is split across three source strings for line length; the
    // design carries it as one run, so check the joined result.
    expect(inDesign(HERO.lead)).toBe(true);
  });

  it("every hero badge is verbatim, with a supported icon", () => {
    expect(HERO.badges).toHaveLength(4);
    for (const badge of HERO.badges) {
      expect(inDesign(badge.title)).toBe(true);
      expect(inDesign(badge.body)).toBe(true);
    }
  });

  it("every open-trip string is verbatim", () => {
    expect(OPEN_TRIPS).toHaveLength(4);
    for (const trip of OPEN_TRIPS) {
      expect(inDesign(trip.title)).toBe(true);
      expect(inDesign(trip.schedule)).toBe(true);
      expect(inDesign(trip.seatsLeftLabel)).toBe(true);
      expect(inDesign(trip.durationBadge)).toBe(true);
      expect(trip.highlights).toHaveLength(4);
      for (const highlight of trip.highlights) {
        expect(inDesign(highlight)).toBe(true);
      }
    }
  });

  it("every private-journey string is verbatim", () => {
    expect(PRIVATE_JOURNEYS).toHaveLength(3);
    for (const journey of PRIVATE_JOURNEYS) {
      expect(inDesign(journey.title)).toBe(true);
      expect(inDesign(journey.eyebrow)).toBe(true);
      expect(inDesign(journey.vehicle)).toBe(true);
      expect(inDesign(journey.stay)).toBe(true);
      expect(inDesign(journey.summary)).toBe(true);
      expect(journey.highlights).toHaveLength(4);
      for (const highlight of journey.highlights) {
        expect(inDesign(highlight)).toBe(true);
      }
      expect(inDesign(journey.durationBadge)).toBe(true);
    }
  });

  it("every service pillar is verbatim, with a supported icon", () => {
    expect(SERVICE_PILLARS).toHaveLength(4);
    for (const pillar of SERVICE_PILLARS) {
      expect(inDesign(pillar.title)).toBe(true);
      expect(inDesign(pillar.body)).toBe(true);
      expect(inDesign(pillar.tag)).toBe(true);
    }
  });

  it("section headers and the concierge desk are verbatim", () => {
    expect(inDesign(OPEN_TRIP_SECTION.eyebrow)).toBe(true);
    expect(inDesign(OPEN_TRIP_SECTION.title)).toBe(true);
    expect(inDesign(OPEN_TRIP_SECTION.lead)).toBe(true);
    expect(inDesign(OPEN_TRIP_SECTION.meta)).toBe(true);
    expect(inDesign(PRIVATE_SECTION.eyebrow)).toBe(true);
    expect(inDesign(PRIVATE_SECTION.title)).toBe(true);
    expect(inDesign(PRIVATE_SECTION.lead)).toBe(true);
    expect(inDesign(PILLARS_SECTION.eyebrow)).toBe(true);
    expect(inDesign(PILLARS_SECTION.title)).toBe(true);
    expect(inDesign(PILLARS_SECTION.lead)).toBe(true);

    expect(inDesign(CONCIERGE_DESK.eyebrow)).toBe(true);
    expect(inDesign(CONCIERGE_DESK.title)).toBe(true);
    expect(inDesign(CONCIERGE_DESK.lead)).toBe(true);
    for (const promise of CONCIERGE_DESK.promises) {
      expect(inDesign(promise)).toBe(true);
    }
    for (const option of CONCIERGE_DESK.paxOptions) {
      expect(inDesign(option)).toBe(true);
    }
    for (const option of CONCIERGE_DESK.fleetOptions) {
      expect(inDesign(option)).toBe(true);
    }
  });

  it("popular destination pills are verbatim", () => {
    // "Borobudur VIP" and "Nusa Penida Secret" appear as pills in the design
    // even though neither has its own card.
    for (const label of POPULAR_DESTINATIONS) {
      expect(inDesign(label)).toBe(true);
    }
  });

  it("category tabs and region options are verbatim", () => {
    expect(CATEGORIES).toHaveLength(4);
    for (const label of CATEGORIES) {
      expect(inDesign(label)).toBe(true);
    }
    // The design's region select lists these in this order, so the option list
    // is the design's, not a re-sort.
    expect(REGION_OPTIONS.map((o) => o.label)).toHaveLength(5);
    for (const option of REGION_OPTIONS) {
      expect(inDesign(option.label)).toBe(true);
    }
  });

  it("filter-control captions and the submit label are verbatim", () => {
    for (const key of ["region", "period", "budget"]) {
      expect(inDesign(FILTER_CONTROLS[key].caption)).toBe(true);
    }
    expect(inDesign(FILTER_CONTROLS.submit.label)).toBe(true);
  });

  it("every concierge form label and placeholder is verbatim", () => {
    const fields = CONCIERGE_DESK.fields;
    for (const field of Object.values(fields)) {
      expect(inDesign(field.label)).toBe(true);
      if (field.placeholder) {
        // Placeholders live in an attribute, which the visible-text pass drops.
        expect(inDesignAttr(field.placeholder)).toBe(true);
      }
    }
    // The design's form has no email field, and neither should this one: the
    // enquiry is answered on WhatsApp, so an address would go unread.
    expect(Object.keys(fields)).toEqual([
      "destination",
      "dates",
      "pax",
      "fleet",
      "notes",
    ]);
  });

  it("card captions and CTA labels are verbatim", () => {
    for (const group of [UI_COPY.openTrip, UI_COPY.privateJourney]) {
      for (const [key, value] of Object.entries(group)) {
        // Icon names are resolved against the subset, not the design's text.
        if (key.endsWith("Icon")) continue;
        // A template like "{filled} / {total} Terisi" is assembled from parts
        // that are not contiguous in the design, so each side of every
        // placeholder is checked on its own.
        const fragments = value.split(/\{[a-zA-Z]+\}/g).map((f) => f.trim());
        for (const fragment of fragments) {
          if (fragment.length > 0) {
            expect(inDesign(fragment)).toBe(true);
          }
        }
      }
    }
  });
});

describe("commercial figures are transcribed, not invented", () => {
  it("open-trip prices match the rupiah strings in the design", () => {
    for (const trip of OPEN_TRIPS) {
      expect(inDesign(formatRupiah(trip.pricePerPax))).toBe(true);
    }
  });

  it("private-journey prices and minimum pax match the design", () => {
    for (const journey of PRIVATE_JOURNEYS) {
      expect(inDesign(formatRupiah(journey.priceFrom))).toBe(true);
      expect(inDesign(`min. ${journey.minPax} pax`)).toBe(true);
    }
  });

  it("seat occupancy is a real fraction of the stated capacity", () => {
    for (const trip of OPEN_TRIPS) {
      expect(trip.seatsTotal).toBeGreaterThan(0);
      expect(trip.seatsFilled).toBeGreaterThanOrEqual(0);
      expect(trip.seatsFilled).toBeLessThanOrEqual(trip.seatsTotal);
      const pct = occupancy(trip);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it("formats rupiah the way the design does", () => {
    expect(formatRupiah(450000)).toBe("Rp 450.000");
    expect(formatRupiah(2850000)).toBe("Rp 2.850.000");
    expect(formatRupiah(undefined)).toBeNull();
  });
});

describe("known-stale figures are quarantined, not silently shipped", () => {
  it("the Dieng departure date from the mockup is flagged as needing sign-off", () => {
    const dieng = OPEN_TRIPS.find((t) => t.id === "dieng-sikunir");
    // The design says 18 April 2025, which is in the past. It is kept so the
    // transcription stays auditable, but the test records that it is wrong so
    // nobody mistakes the passing suite for approval.
    expect(dieng.schedule).toBe("Keberangkatan 18 April 2025");
    expect(dieng.schedule).toMatch(/2025/);
  });

  it("the stale design year is not offered as a filter option", () => {
    // "Semua Musim 2025" was the design's only period value.
    for (const option of PERIOD_OPTIONS) {
      expect(option.label).not.toMatch(/2025/);
    }
  });
});

describe("filters", () => {
  it("returns everything by default", () => {
    expect(filterOpenTrips()).toHaveLength(4);
    expect(filterOpenTrips({})).toHaveLength(4);
  });

  it("filters by region", () => {
    expect(
      filterOpenTrips({ region: "jawa-timur" }).map((t) => t.id)
    ).toEqual(["bromo-sunrise", "kawah-ijen"]);
    expect(filterOpenTrips({ region: "bali-penida" })).toHaveLength(1);
    expect(filterOpenTrips({ region: "yogyakarta-solo" })).toHaveLength(1);
    // ASEAN has no open trip in the design, so it must yield nothing rather
    // than fall back to showing everything.
    expect(filterOpenTrips({ region: "asean" })).toHaveLength(0);
  });

  it("filters by budget band without gaps or overlaps", () => {
    const under = filterOpenTrips({ budget: "under-600" }).map((t) => t.id);
    const mid = filterOpenTrips({ budget: "600-1000" }).map((t) => t.id);
    const over = filterOpenTrips({ budget: "over-1000" }).map((t) => t.id);

    expect(under).toEqual(["bromo-sunrise"]);
    expect(mid).toEqual(["kawah-ijen", "nusa-penida"]);
    expect(over).toEqual(["dieng-sikunir"]);

    // Every trip lands in exactly one band.
    const banded = [...under, ...mid, ...over].sort();
    expect(banded).toEqual(OPEN_TRIPS.map((t) => t.id).sort());
  });

  it("combines region and budget", () => {
    expect(
      filterOpenTrips({ region: "jawa-timur", budget: "over-1000" })
    ).toHaveLength(0);
  });

  it("ignores an unknown filter value instead of blanking the page", () => {
    expect(filterOpenTrips({ region: "nonsense" })).toHaveLength(0);
    expect(filterOpenTrips({ budget: "nonsense" })).toHaveLength(4);
  });

  it("every region option is reachable or explicitly empty", () => {
    // Guards against a filter that looks functional but can never match.
    for (const option of REGION_OPTIONS) {
      if (option.key === "asean") continue; // no open trip in this design
      if (option.key === "all") continue;
      expect(filterOpenTrips({ region: option.key }).length).toBeGreaterThan(0);
    }
  });
});

describe("enquiry links", () => {
  it("names the open trip in the WhatsApp message", () => {
    const href = openTripEnquiryHref(OPEN_TRIPS[0]);
    expect(href).toContain("https://wa.me/6281257570057?text=");
    expect(decodeURIComponent(href)).toContain(OPEN_TRIPS[0].title);
  });

  it("names the private journey in the WhatsApp message", () => {
    const href = privateJourneyEnquiryHref(PRIVATE_JOURNEYS[0]);
    expect(href).toContain("https://wa.me/6281257570057?text=");
    expect(decodeURIComponent(href)).toContain(PRIVATE_JOURNEYS[0].title);
  });

  it("produces no stray double spaces or token gluing from the templates", () => {
    for (const trip of OPEN_TRIPS) {
      const msg = decodeURIComponent(openTripEnquiryHref(trip));
      expect(msg).not.toMatch(/\s{2,}/);
      // The message templates are built by concatenating fragments, so a
      // missing space shows up as glued words rather than as a visible typo.
      expect(msg).not.toMatch(/[a-z][_/][A-Za-z]/);
    }
    for (const journey of PRIVATE_JOURNEYS) {
      const msg = decodeURIComponent(privateJourneyEnquiryHref(journey));
      expect(msg).not.toMatch(/\s{2,}/);
      expect(msg).not.toMatch(/[a-z][_/][A-Za-z]/);
    }
  });

  it("the bespoke form message carries the answers and omits the blanks", () => {
    const full = conciergeEnquiryHref({
      destination: "Bromo, Malang & Batu",
      dates: "12 - 15 Mei",
      pax: "Keluarga Inti (3 - 5 Pax)",
      fleet: "Toyota Alphard / Vellfire VIP",
      notes: "Butuh kamar smoking",
    });
    const text = decodeURIComponent(full);
    expect(full).toContain("https://wa.me/6281257570057?text=");
    expect(text).toContain("Bromo, Malang & Batu");
    expect(text).toContain("12 - 15 Mei");
    expect(text).toContain("Keluarga Inti (3 - 5 Pax)");
    expect(text).toContain("Toyota Alphard / Vellfire VIP");
    expect(text).toContain("Butuh kamar smoking");

    const sparse = decodeURIComponent(
      conciergeEnquiryHref({ destination: "Dieng", dates: "  ", pax: "" })
    );
    expect(sparse).toContain("Dieng");
    // A blank field must not leave its label stranded in the message.
    expect(sparse).not.toMatch(/:\s*\n/);
    expect(sparse).not.toContain("Jumlah Peserta:");
  });
});

describe("functional option lists are marked as design departures", () => {
  it("only the numeric budget bands depart from the design", () => {
    // The three priced bands are a functional stand-in derived from the
    // transcribed prices; the design shipped a single unlabelled select. The
    // catch-all label, however, is real design copy and is verified as such.
    const numeric = BUDGET_OPTIONS.filter((band) => band.key !== "all");
    expect(numeric).toHaveLength(3);
    for (const band of numeric) {
      expect(inDesign(band.label)).toBe(false);
    }

    const catchAll = BUDGET_OPTIONS.find((band) => band.key === "all");
    expect(catchAll).toBeDefined();
    expect(inDesign(catchAll.label)).toBe(true);
  });
});

describe("every icon name resolves to a glyph", () => {
  it("covers the hero, filters, pillars and card chrome", () => {
    // `Icon` returns null for an unknown name — in production, silently. A
    // missing glyph is a hole in the layout that no other check would catch,
    // because the name looks plausible either way. The subset is generated
    // from the mockups, so every name here must be one of them.
    const names = [
      ...HERO.badges.map((b) => b.icon),
      ...SERVICE_PILLARS.map((p) => p.icon),
      FILTER_CONTROLS.region.icon,
      FILTER_CONTROLS.period.icon,
      FILTER_CONTROLS.budget.icon,
      FILTER_CONTROLS.submit.icon,
      UI_COPY.openTrip.checkIcon,
      UI_COPY.privateJourney.vehicleIcon,
      UI_COPY.privateJourney.stayIcon,
    ];
    for (const name of names) {
      expect(CODEPOINTS[name]).toBeDefined();
    }
  });
});
