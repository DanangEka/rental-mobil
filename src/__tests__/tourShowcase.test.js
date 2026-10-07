import {
  ARMADA_OPTIONS,
  PRICE_BUCKETS,
  REGION_BUCKETS,
  availablePeriods,
  buildConsultationMessage,
  filterByPeriod,
  filterJourneys,
  formatRupiah,
  normalizeOpenTrip,
  normalizePaketWisata,
  regionForDestination,
  splitFasilitas,
  toDate,
  tripInquiryMessage,
  whatsappLink,
  WHATSAPP_NUMBER,
} from "../utils/tourShowcase";

/* A `Timestamp`-shaped stub, since firebase/firestore is not loaded here. */
const stamp = (iso) => ({ toDate: () => new Date(iso) });

const rawTrip = (over = {}) => ({
  id: "t1",
  judul: "Bromo Sunrise & Lautan Pasir Berbisik",
  destinasi: "Bromo, Probolinggo",
  mobilUtama: "Innova Reborn",
  tanggalBerangkat: stamp("2026-11-14T00:00:00.000Z"),
  hargaPerPax: 450000,
  kapasitasMaks: 8,
  kuotaTerisi: 5,
  ...over,
});

const rawPaket = (over = {}) => ({
  id: "p1",
  judul: "Bromo, Batu & Lumajang",
  destinasi: "Bromo, Batu & Lumajang",
  harga: 3400000,
  durasi: "4H3M",
  fasilitas: "Armada privat\nDriver\nHotel bintang empat",
  ...over,
});

describe("toDate", () => {
  it("reads a Firestore Timestamp", () => {
    expect(toDate(stamp("2026-11-14T00:00:00.000Z")).getUTCFullYear()).toBe(2026);
  });

  it("reads an ISO string, which the admin form can also write", () => {
    expect(toDate("2026-11-14").getDate()).toBe(14);
  });

  it("returns null for empty and unparseable values instead of an Invalid Date", () => {
    // An Invalid Date would compare false against everything and silently drop
    // the trip from every period bucket.
    [null, undefined, "", "not-a-date"].forEach((value) => {
      expect(toDate(value)).toBeNull();
    });
  });
});

describe("regionForDestination", () => {
  it("buckets Jatim place names, including how staff abbreviate them", () => {
    ["Bromo, Probolinggo", "Kawah Ijen", "Tumpak Sewu Lumajang", "Malang & Batu", "Jatim"].forEach(
      (destination) => {
        expect(regionForDestination(destination)).toBe("jatim");
      }
    );
  });

  it("buckets Bali and Nusa Penida", () => {
    ["Bali & Nusa Penida", "Ubud Sanctuary", "Kelingking"].forEach((d) => {
      expect(regionForDestination(d)).toBe("bali");
    });
  });

  it("buckets the heritage routes", () => {
    ["Yogyakarta & Solo Keraton", "Borobudur VIP", "Dieng Highland"].forEach((d) => {
      expect(regionForDestination(d)).toBe("yogyakarta");
    });
  });

  it("buckets ASEAN destinations", () => {
    ["Siem Reap, Kamboja", "Hanoi, Vietnam", "Luang Prabang, Laos"].forEach((d) => {
      expect(regionForDestination(d)).toBe("asean");
    });
  });

  it("falls back to 'other' so an unknown destination is never silently hidden", () => {
    expect(regionForDestination("Raja Ampat")).toBe("other");
    expect(regionForDestination("")).toBe("other");
    expect(regionForDestination(null)).toBe("other");
  });
});

describe("normalizeOpenTrip", () => {
  it("derives remaining seats and percentage from the quota snapshot", () => {
    const trip = normalizeOpenTrip(rawTrip());
    expect(trip.sisaKursi).toBe(3);
    expect(trip.persenTerisi).toBe(63);
  });

  it("clamps a filled trip to zero remaining rather than going negative", () => {
    const trip = normalizeOpenTrip(rawTrip({ kuotaTerisi: 12 }));
    expect(trip.sisaKursi).toBe(0);
    expect(trip.persenTerisi).toBe(100);
  });

  it("survives a missing capacity without dividing by zero", () => {
    const trip = normalizeOpenTrip(rawTrip({ kapasitasMaks: 0, kuotaTerisi: 0 }));
    expect(Number.isFinite(trip.persenTerisi)).toBe(true);
    expect(trip.kapasitasMaks).toBe(1);
  });

  it("coerces a string price, which is what the admin form stores", () => {
    expect(normalizeOpenTrip(rawTrip({ hargaPerPax: "450000" })).hargaPerPax).toBe(450000);
  });

  it("falls back to a label when the departure date is unusable", () => {
    const trip = normalizeOpenTrip(rawTrip({ tanggalBerangkat: "" }));
    expect(trip.tanggal).toBeNull();
    expect(trip.tanggalLabel).toBe("Jadwal menyusul");
    expect(trip.periodeLabel).toBeNull();
  });
});

describe("normalizePaketWisata", () => {
  it("splits the newline-delimited fasilitas string the admin form writes", () => {
    expect(normalizePaketWisata(rawPaket()).fasilitas).toEqual([
      "Armada privat",
      "Driver",
      "Hotel bintang empat",
    ]);
  });

  it("passes an already-split array through", () => {
    expect(splitFasilitas(["A", "B", "", null])).toEqual(["A", "B"]);
  });

  it("returns an empty list for a missing fasilitas rather than throwing", () => {
    expect(splitFasilitas(undefined)).toEqual([]);
    expect(splitFasilitas({})).toEqual([]);
  });
});

describe("filterJourneys", () => {
  const trips = [
    normalizeOpenTrip(rawTrip({ id: "jatim-cheap", hargaPerPax: 450000 })),
    normalizeOpenTrip(
      rawTrip({ id: "bali-premium", destinasi: "Bali & Nusa Penida", hargaPerPax: 1500000 })
    ),
  ];

  it("returns everything for the default filters", () => {
    expect(filterJourneys(trips)).toHaveLength(2);
  });

  it("filters by region bucket", () => {
    expect(filterJourneys(trips, { region: "bali" }).map((t) => t.id)).toEqual([
      "bali-premium",
    ]);
  });

  it("filters by price band, treating the upper bound as exclusive", () => {
    expect(filterJourneys(trips, { price: "hemat" }).map((t) => t.id)).toEqual([
      "jatim-cheap",
    ]);
    expect(filterJourneys(trips, { price: "premium" }).map((t) => t.id)).toEqual([
      "bali-premium",
    ]);
  });

  it("treats a band boundary as belonging to the higher band only", () => {
    const boundary = [normalizeOpenTrip(rawTrip({ id: "b", hargaPerPax: 500000 }))];
    expect(filterJourneys(boundary, { price: "hemat" })).toHaveLength(0);
    expect(filterJourneys(boundary, { price: "menengah" })).toHaveLength(1);
  });

  it("applies region and price together", () => {
    expect(filterJourneys(trips, { region: "bali", price: "hemat" })).toHaveLength(0);
  });

  it("an unknown bucket falls back to the widest band rather than hiding everything", () => {
    expect(PRICE_BUCKETS[0].key).toBe("semua");
    expect(filterJourneys(trips, { price: "nonsense" })).toHaveLength(2);
  });
});

describe("period filtering", () => {
  const trips = [
    normalizeOpenTrip(rawTrip({ id: "nov", tanggalBerangkat: stamp("2026-11-14T00:00:00.000Z") })),
    normalizeOpenTrip(rawTrip({ id: "dec", tanggalBerangkat: stamp("2026-12-02T00:00:00.000Z") })),
  ];

  it("only offers periods that actually occur in the data", () => {
    expect(availablePeriods(trips)).toEqual(["Desember 2026", "November 2026"]);
  });

  it("excludes trips whose date could not be parsed from the period list", () => {
    const withBad = [...trips, normalizeOpenTrip(rawTrip({ id: "bad", tanggalBerangkat: "" }))];
    expect(availablePeriods(withBad)).toEqual(["Desember 2026", "November 2026"]);
  });

  it("filters to one period", () => {
    expect(filterByPeriod(trips, "Desember 2026").map((t) => t.id)).toEqual(["dec"]);
  });

  it("passes everything through for the 'semua' sentinel", () => {
    expect(filterByPeriod(trips, "semua")).toHaveLength(2);
    expect(filterByPeriod(trips, null)).toHaveLength(2);
  });
});

describe("formatRupiah", () => {
  it("formats with Indonesian thousands separators and no decimals", () => {
    expect(formatRupiah(450000)).toBe("Rp 450.000");
    expect(formatRupiah(3800000)).toBe("Rp 3.800.000");
  });

  it("coerces strings and clamps instead of printing NaN", () => {
    expect(formatRupiah("450000")).toBe("Rp 450.000");
    expect(formatRupiah(undefined)).toBe("Rp 0");
    expect(formatRupiah("abc")).toBe("Rp 0");
  });
});

describe("buildConsultationMessage", () => {
  it("includes every supplied field", () => {
    const message = buildConsultationMessage({
      destination: "Bromo, Malang & Batu",
      schedule: "12 - 15 Mei 2026 (4D3N)",
      pax: "3-5",
      armada: ARMADA_OPTIONS[0],
      notes: "Hotel bintang lima, vegetarian",
    });
    expect(message).toContain("Destinasi: Bromo, Malang & Batu");
    expect(message).toContain("Estimasi Tanggal / Durasi: 12 - 15 Mei 2026 (4D3N)");
    expect(message).toContain("Jumlah Peserta: 3-5");
    expect(message).toContain(ARMADA_OPTIONS[0]);
    expect(message).toContain("Catatan Khusus: Hotel bintang lima, vegetarian");
  });

  it("omits empty optional fields rather than sending blanks", () => {
    const message = buildConsultationMessage({ destination: "Bromo" });
    expect(message).toContain("Destinasi: Bromo");
    expect(message).not.toContain("Catatan Khusus");
    expect(message).not.toContain("Estimasi Tanggal");
  });

  it("trims surrounding whitespace", () => {
    const message = buildConsultationMessage({ destination: "  Bromo  " });
    expect(message).toContain("Destinasi: Bromo\n");
  });

  it("still produces a usable greeting with no input at all", () => {
    const message = buildConsultationMessage();
    expect(message).toContain("Halo Cakra Lima Tujuh");
    expect(message.trim().split("\n").length).toBeGreaterThan(1);
  });
});

describe("whatsappLink", () => {
  it("targets the business number and URL-encodes the message", () => {
    const link = whatsappLink("Halo & selamat siang");
    expect(link.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(link).toContain("%26");
    expect(link).not.toContain(" ");
  });
});

describe("tripInquiryMessage", () => {
  it("names the trip and states the remaining seats", () => {
    const message = tripInquiryMessage(normalizeOpenTrip(rawTrip()));
    expect(message).toContain("Bromo Sunrise & Lautan Pasir Berbisik");
    expect(message).toContain("Sisa kursi yang tercatat: 3 dari 8");
    expect(message).toContain("Rp 450.000/pax");
  });

  it("omits the seat line once the trip is full", () => {
    const message = tripInquiryMessage(normalizeOpenTrip(rawTrip({ kuotaTerisi: 8 })));
    expect(message).not.toContain("Sisa kursi");
  });
});
