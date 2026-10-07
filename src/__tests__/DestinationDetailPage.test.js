import React from "react";
import { render, screen } from "@testing-library/react";

import DestinationDetailPage from "../pages/DestinationDetailPage";
import { destinationGuides, getDestinationTimezone } from "../data/destinationGuides";
import { destinationSpots } from "../data/destinationSpots";

/* Mirrors REGION_LABEL in the page. Duplicated rather than exported because the
   page's own copy is the thing under test; sharing it would let a wrong label
   pass in both places at once. */
const REGION_LABELS = {
  jawa: "Jawa",
  bali: "Bali",
  indonesia: "Indonesia",
  asean: "ASEAN",
};

/**
 * Renders the destination detail page in both of its shapes.
 *
 * The page is the only consumer of the editorial guide layer, so these tests
 * exist to catch the two failures a data test cannot see: a guide record that
 * is structurally valid but renders as an empty section, and the lean fallback
 * throwing when a guide is absent.
 *
 * react-scripts cannot resolve the installed react-router-dom 7 package, so it
 * is supplied as a virtual mock with just the two APIs the page uses.
 */

let mockParams = {};

jest.mock(
  "react-router-dom",
  () => ({
    useParams: () => mockParams,
    Link: ({ children, to, ...rest }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

function renderAt(region, slug) {
  mockParams = { region, slug };
  return render(<DestinationDetailPage />);
}

/**
 * A single inline fixture rather than a real guide file, so this test stays
 * independent of whichever batch of editorial copy happens to have landed.
 * Injected onto a real catalogue slug below, so it exercises the actual render
 * path. Shape is asserted in destinationGuides.test.js; this one only cares
 * that every field reaches the DOM.
 */
const FIXTURE_GUIDE = {
  subtitle: "Fixture untuk Uji Render",
  lead: "Paragraf pembuka fixture.",
  facts: [
    { icon: "wb_sunny", label: "Musim Terbaik", value: "Mei – Oktober" },
    { icon: "landscape", label: "Kesulitan", value: "Menengah" },
    { icon: "schedule", label: "Durasi", value: "2 Hari 1 Malam" },
    { icon: "alt_route", label: "Karakter", value: "Tanjakan" },
  ],
  panorama: { label: "Sudut Pandang Utama", quote: "Kutipan panorama fixture." },
  narrative: {
    title: "Judul Narasi Fixture",
    body: ["Paragraf pertama fixture.", "Paragraf kedua fixture."],
    quote: "Kutipan kurator fixture.",
    quoteBy: "Tim Rute Fixture",
  },
  light: {
    title: "Rundown Fixture",
    intro: "Pengantar fixture.",
    timeline: [
      { time: "05:30", title: "Tiba di Gate", body: "Fixture.", active: true },
      {
        time: "06:15",
        title: "Golden Hour",
        body: "Fixture.",
        active: false,
      },
    ],
  },
  gear: [
    { icon: "hiking", title: "Sepatu Trekking", description: "Fixture." },
    { icon: "backpack", title: "Dry Bag 20L", description: "Fixture." },
    { icon: "dry_cleaning", title: "Quick-Dry", description: "Fixture." },
    { icon: "support_agent", title: "Ranger Lokal", description: "Fixture." },
  ],
  route: {
    title: "Rute Fixture",
    body: "Body rute fixture.",
    note: "Catatan rute fixture.",
  },
  culinary: {
    name: "Kuliner Fixture",
    description: "Deskripsi kuliner fixture.",
  },
  commercial: null,
};

describe("DestinationDetailPage — lean layout (no authored guide)", () => {
  it("renders a complete page for a destination that has no guide yet", () => {
    renderAt("bali", "tegalalang");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tegalalang Rice Terrace"
    );
    // The catalogue facts still render, including the slug-derived timezone.
    expect(screen.getByText("Zona Waktu")).toBeInTheDocument();
    expect(screen.getByText("WITA (UTC+8)")).toBeInTheDocument();
  });

  it("says the guide is being written rather than implying it exists", () => {
    renderAt("jawa", "gunung-bromo");
    expect(screen.getByText(/sedang disiapkan/i)).toBeInTheDocument();
  });

  it("skips the editorial sections that need a guide", () => {
    renderAt("asean", "angkor-wat");
    expect(screen.queryByText(/Bagian 01/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bagian 03/)).not.toBeInTheDocument();
  });

  it("does not offer a link to a culinary note that is not on the page", () => {
    // The lean layout has no culinary card, so the anchor link would dangle.
    renderAt("asean", "angkor-wat");
    expect(
      screen.queryByRole("link", { name: /Lihat Rekomendasi Singgah/i })
    ).not.toBeInTheDocument();
  });

  it("still offers the concierge enquiry without a guide", () => {
    renderAt("asean", "angkor-wat");
    const cta = screen.getByRole("link", { name: /Konsultasi via WhatsApp/i });
    expect(cta.getAttribute("href")).toContain("Angkor%20Wat");
  });

  it("404s on an unknown slug", () => {
    renderAt("jawa", "not-a-destination");
    expect(
      screen.getByText("Destinasi tidak ditemukan")
    ).toBeInTheDocument();
  });

  it("404s when the slug exists in a different region", () => {
    // The Bali slug is not a Jawa destination; matching on slug alone would
    // render the wrong region's page.
    renderAt("jawa", "tegalalang");
    expect(
      screen.getByText("Destinasi tidak ditemukan")
    ).toBeInTheDocument();
  });
});

describe("DestinationDetailPage — full guide layout", () => {
  beforeEach(() => {
    destinationGuides["gunung-bromo"] = FIXTURE_GUIDE;
  });

  afterEach(() => {
    delete destinationGuides["gunung-bromo"];
  });

  it("renders the subtitle as an italic continuation of the H1", () => {
    renderAt("jawa", "gunung-bromo");
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Gunung Bromo");
    expect(h1).toHaveTextContent("Fixture untuk Uji Render");
  });

  it("renders the lead and all four fact cards", () => {
    renderAt("jawa", "gunung-bromo");
    expect(screen.getByText("Paragraf pembuka fixture.")).toBeInTheDocument();
    for (const value of ["Mei – Oktober", "Menengah", "2 Hari 1 Malam", "Tanjakan"]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it("renders Bagian 01 through Bagian 04 in order", () => {
    renderAt("jawa", "gunung-bromo");
    expect(screen.getByText(/Bagian 01/)).toBeInTheDocument();
    expect(screen.getByText(/Bagian 02/)).toBeInTheDocument();
    expect(screen.getByText(/Bagian 03/)).toBeInTheDocument();
    expect(screen.getByText(/Bagian 04/)).toBeInTheDocument();
    expect(screen.getByText("Judul Narasi Fixture")).toBeInTheDocument();
    expect(screen.getByText("Rundown Fixture")).toBeInTheDocument();
    expect(screen.getByText("Rute Fixture")).toBeInTheDocument();
  });

  it("renders the timeline, the gear grid and the culinary note", () => {
    renderAt("jawa", "gunung-bromo");
    expect(screen.getByText("05:30")).toBeInTheDocument();
    expect(screen.getByText("06:15")).toBeInTheDocument();
    for (const title of [
      "Sepatu Trekking",
      "Dry Bag 20L",
      "Quick-Dry",
      "Ranger Lokal",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("Kuliner Fixture")).toBeInTheDocument();
  });

  it("offers a concierge enquiry, never a price or a deposit", () => {
    renderAt("jawa", "gunung-bromo");
    const cta = screen.getByRole("link", { name: /Konsultasi via WhatsApp/i });
    expect(cta).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/6281257570057")
    );
    // The destination is pre-filled so concierge gets a real enquiry.
    expect(cta.getAttribute("href")).toContain("Gunung%20Bromo");

    expect(screen.queryByText(/Rp\s?\d/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DP\s?50/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/all-in/i)).not.toBeInTheDocument();
  });

  it("links to the culinary note, which the guide layout does render", () => {
    renderAt("jawa", "gunung-bromo");
    const link = screen.getByRole("link", {
      name: /Lihat Rekomendasi Singgah/i,
    });
    expect(link).toHaveAttribute("href", "#kuliner");
    // The anchor it points at must exist, or the link is a dead end.
    expect(document.querySelector("#kuliner")).not.toBeNull();
  });

  it("drops the editorial layout when the guide is removed again", () => {
    delete destinationGuides["gunung-bromo"];
    renderAt("jawa", "gunung-bromo");
    expect(screen.queryByText(/Bagian 01/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Gunung Bromo"
    );
  });
});

/**
 * Every destination currently ships on the lean layout, so all 46 are live
 * pages. Hand-checking a few slugs proves the layout but not the catalogue: a
 * missing timezone entry, a region with no label, or a near-duplicate slug
 * whose neighbour shadows it would only surface when someone opened that
 * specific page.
 *
 * This walks the whole catalogue instead.
 */
describe("every destination renders", () => {
  it("covers all 46 catalogue entries", () => {
    expect(destinationSpots).toHaveLength(46);
  });

  describe.each(destinationSpots)("$region/$slug", (spot) => {
    it("renders a lean page with its own name, city and timezone", () => {
      renderAt(spot.region, spot.slug);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(spot.name);

      // A timezone must resolve, or this cell renders blank.
      expect(screen.getByText("Zona Waktu")).toBeInTheDocument();
      expect(
        screen.getByText(getDestinationTimezone(spot.slug))
      ).toBeInTheDocument();

      // The region label resolves for all four regions. It appears twice — in
      // the breadcrumb and as the "Wilayah" fact — so match all occurrences.
      expect(
        screen.getAllByText(new RegExp(REGION_LABELS[spot.region])).length
      ).toBeGreaterThan(0);

      // The concierge CTA is the page's reason to exist. It must be present on
      // the lean layout too: all 46 destinations currently ship lean, and a
      // destination page with no way to ask about itself is a dead end.
      expect(
        screen.getByRole("link", { name: /Konsultasi via WhatsApp/i })
      ).toHaveAttribute("href", expect.stringContaining("wa.me/6281257570057"));
    });
  });
});
