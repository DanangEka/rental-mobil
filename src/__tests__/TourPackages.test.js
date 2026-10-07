import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import TourPackages from "../pages/TourPackages";
import {
  CATEGORIES,
  CONCIERGE_DESK,
  HERO,
  OPEN_TRIPS,
  PRIVATE_JOURNEYS,
} from "../data/tourCatalogue";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...a) => ({ __collection: a })),
  query: jest.fn((...a) => ({ __query: a })),
  orderBy: jest.fn((...a) => ({ __orderBy: a })),
  onSnapshot: jest.fn(),
}));

jest.mock("../services/firebase", () => ({ db: { __db: true } }));

const { onSnapshot } = require("firebase/firestore");

/** Resolve the Firestore subscription with the given CMS rows. */
function withPackages(rows) {
  onSnapshot.mockImplementation((_q, onNext) => {
    onNext({
      docs: rows.map((row, i) => ({ id: row.id || `pkg-${i}`, data: () => row })),
    });
    return () => {};
  });
}

function renderPage() {
  return render(<TourPackages />);
}

beforeEach(() => {
  onSnapshot.mockReset();
  window.open = jest.fn();
  withPackages([]);
});

describe("curated catalogue", () => {
  it("renders the hero, every open trip and every private journey", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(HERO.headline)).toBeDefined();
    });

    for (const trip of OPEN_TRIPS) {
      expect(screen.getByText(trip.title)).toBeDefined();
    }
    for (const journey of PRIVATE_JOURNEYS) {
      expect(screen.getByText(journey.title)).toBeDefined();
    }
  });

  it("shows the design's price and availability per open trip", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    expect(screen.getByText("Rp 450.000")).toBeDefined();
    expect(screen.getByText("5 / 8 Terisi")).toBeDefined();
    expect(screen.getByText("Sisa 3 Kursi")).toBeDefined();
  });

  it("renders the service pillars and the concierge desk", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    expect(screen.getByText("Bebas Biaya Tersembunyi")).toBeDefined();
    expect(screen.getByText(CONCIERGE_DESK.title)).toBeDefined();
    expect(screen.getByText(CONCIERGE_DESK.submitLabel)).toBeDefined();
  });

  it("points every open-trip CTA at WhatsApp with the trip named", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    const link = screen.getAllByText("Reservasi Kursi")[0].closest("a");
    expect(link.getAttribute("href")).toContain("https://wa.me/6281257570057?text=");
    expect(decodeURIComponent(link.getAttribute("href"))).toContain(OPEN_TRIPS[0].title);
  });
});

describe("filtering", () => {
  it("narrows the grid to the selected region once the schedule is applied", async () => {
    const baliTrip = OPEN_TRIPS.find((t) => t.region === "bali-penida");
    expect(baliTrip).toBeDefined();
    const dropped = OPEN_TRIPS.find((t) => t.region !== "bali-penida");

    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    // Staged, not applied: the grid is unchanged before the submit control.
    const select = screen.getByLabelText("Wilayah Eksplorasi");
    fireEvent.change(select, { target: { value: "bali-penida" } });
    expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined();

    fireEvent.click(screen.getByText("Tampilkan Jadwal"));

    await waitFor(() => {
      expect(screen.queryByText(dropped.title)).toBeNull();
    });
    expect(screen.getByText(baliTrip.title)).toBeDefined();
  });

  it("explains an empty result rather than rendering a blank grid", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    fireEvent.change(screen.getByLabelText("Wilayah Eksplorasi"), {
      target: { value: "asean" },
    });
    fireEvent.click(screen.getByText("Tampilkan Jadwal"));

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada perjalanan yang cocok/)).toBeDefined();
    });
  });

  it("scopes the page to a category tab", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    // The private tab keeps the private journeys and drops the open trips.
    fireEvent.click(screen.getByRole("tab", { name: CATEGORIES[2] }));
    expect(screen.queryByText(OPEN_TRIPS[0].title)).toBeNull();
    expect(screen.getByText(PRIVATE_JOURNEYS[0].title)).toBeDefined();

    // The bespoke tab drops both grids and shows the request desk.
    fireEvent.click(screen.getByRole("tab", { name: CATEGORIES[3] }));
    expect(screen.queryByText(PRIVATE_JOURNEYS[0].title)).toBeNull();
    expect(screen.getByText(CONCIERGE_DESK.title)).toBeDefined();
  });
});

describe("bespoke request form", () => {
  it("carries the answers into the WhatsApp message", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(OPEN_TRIPS[0].title)).toBeDefined());

    fireEvent.change(screen.getByLabelText("Destinasi Tujuan"), {
      target: { value: "Bromo, Malang & Batu" },
    });
    fireEvent.change(screen.getByLabelText("Catatan Khusus / Preferensi Akomodasi"), {
      target: { value: "Butuh kamar smoking" },
    });

    fireEvent.click(screen.getByText(CONCIERGE_DESK.submitLabel));

    expect(window.open).toHaveBeenCalledTimes(1);
    const href = window.open.mock.calls[0][0];
    expect(href).toContain("https://wa.me/6281257570057?text=");
    const message = decodeURIComponent(href);
    expect(message).toContain("Bromo, Malang & Batu");
    expect(message).toContain("Butuh kamar smoking");
    // Untouched fields must not leave a stranded label behind.
    expect(message).not.toContain("Estimasi Tanggal");
  });
});

describe("admin-managed CMS catalogue", () => {
  it("still lists Firestore packages below the curated sections", async () => {
    // A price distinct from the curated trips, so the assertion cannot pass on
    // an open-trip card instead of the CMS one.
    withPackages([
      {
        judul: "Paket uji dari admin",
        destinasi: "Bromo",
        durasi: "2D1N",
        harga: 925000,
        description: "1. Mobil AC\n2. Tour guide",
        imageUrl: "https://example.test/bromo.jpg",
      },
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByText("Paket uji dari admin")).toBeDefined());

    // Present, and not folded into the design's open-trip grid.
    expect(screen.getByText("Katalog Paket Wisata")).toBeDefined();
    expect(screen.getByText("Rp 925.000")).toBeDefined();
  });


  it("shows the empty state when the CMS has no rows", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Belum ada Paket Wisata")).toBeDefined();
    });
  });
});
