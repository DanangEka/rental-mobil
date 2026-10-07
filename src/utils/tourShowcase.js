/**
 * Pure logic for the Tour Showcase page.
 *
 * The page reads two Firestore collections whose documents were written by two
 * different admin tools and therefore have different shapes. Everything that
 * has to reconcile those shapes — quota arithmetic, price formatting, the
 * region and period buckets, and the WhatsApp handover message — lives here so
 * it can be tested without a renderer or a database.
 */

export const WHATSAPP_NUMBER = "6281257570053";

/**
 * Wilayah buckets, in the order the filter panel lists them.
 *
 * `keywords` are matched against the free-text `destinasi` field that
 * `AdminOpenTrip` writes, so the mapping has to be loose enough to catch how
 * staff actually type ("Jatim", "Bromo & Malang", "Bali"). A destination that
 * matches nothing falls into `other` and is only visible under "Semua
 * Wilayah" rather than being hidden.
 */
export const REGION_BUCKETS = [
  {
    key: "jatim",
    label: "Jawa Timur (Bromo & Ijen)",
    keywords: [
      "bromo",
      "ijen",
      "probolinggo",
      "lumajang",
      "malang",
      "batu",
      "jatim",
      "jawa timur",
      "semeru",
      "tumpak",
      "kelud",
      "blitar",
      "kediri",
      "pasuruan",
    ],
  },
  {
    key: "bali",
    label: "Bali & Nusa Penida",
    keywords: [
      "bali",
      "denpasar",
      "ubud",
      "tanah lot",
      "uluwatu",
      "kelingking",
      "nusa penida",
      "canggu",
      "seminyak",
      "kuta",
      "gianyar",
      "badung",
    ],
  },
  {
    key: "yogyakarta",
    label: "Yogyakarta & Solo Heritage",
    keywords: [
      "yogyakarta",
      "jogja",
      "solo",
      "surakarta",
      "borobudur",
      "prambanan",
      "mangkunegaran",
      "keraton",
      "dieng",
      "kudus",
    ],
  },
  {
    key: "asean",
    label: "Eksotisme ASEAN",
    keywords: [
      "asean",
      "thailand",
      "bangkok",
      "chiang",
      "vietnam",
      "hanoi",
      "laos",
      "luang",
      "kamboja",
      "cambodia",
      "siem reap",
      "singapura",
      "singapore",
      "myanmar",
      "kualalumpur",
      "malaysia",
      "filipina",
      "nusa",
    ],
  },
];

export const PRICE_BUCKETS = [
  { key: "semua", label: "Semua Kisaran Tarif", min: 0, max: Infinity },
  { key: "hemat", label: "Di Bawah Rp 500.000", min: 0, max: 500000 },
  { key: "menengah", label: "Rp 500.000 — Rp 1.000.000", min: 500000, max: 1000000 },
  { key: "premium", label: "Di Atas Rp 1.000.000", min: 1000000, max: Infinity },
];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Firestore returns Timestamps; the admin form can also leave a value as a
 * plain ISO string. Both have to become a `Date` here, and an unparseable
 * value has to become `null` rather than an Invalid Date that would poison
 * every later comparison.
 */
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * `fasilitas` is written as a single newline-delimited string by
 * `AdminTourPackages`, so it has to be split before it can be listed.
 */
export const splitFasilitas = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

/**
 * Bucket a destination by keyword.
 *
 * Case-folding uses `localeCompare` rather than `toLowerCase` so the Turkish
 * dotless-i case cannot misfire; the strings here are place names, so the
 * simple fold is enough as long as it is applied consistently on both sides.
 */
export const regionForDestination = (destination) => {
  const haystack = String(destination ?? "").toLowerCase();
  if (!haystack.trim()) return "other";
  const hit = REGION_BUCKETS.find((bucket) =>
    bucket.keywords.some((keyword) => haystack.includes(keyword))
  );
  return hit ? hit.key : "other";
};

/**
 * Reduce a raw `open_trips` document to the shape the card renders.
 *
 * `kapasitasMaks` is a stored snapshot, not a live booking count, so the
 * remaining seats are what the admin tool last wrote. A trip whose capacity is
 * missing or zero would divide by zero here, so it is coerced to a floor of 1
 * and the percentage is clamped to 100.
 */
export const normalizeOpenTrip = (trip) => {
  const kapasitasMaks = Math.max(1, toNumber(trip.kapasitasMaks));
  const kuotaTerisi = Math.min(
    kapasitasMaks,
    Math.max(0, toNumber(trip.kuotaTerisi))
  );
  const tanggal = toDate(trip.tanggalBerangkat);
  const hargaPerPax = toNumber(trip.hargaPerPax);

  return {
    ...trip,
    tanggal,
    kapasitasMaks,
    kuotaTerisi,
    hargaPerPax,
    // `harga` is the canonical price key that `filterJourneys` reads, so the
    // price filter works the same over an open trip and a tour package. The
    // card keeps displaying `hargaPerPax` because that is what the field means.
    harga: hargaPerPax,
    sisaKursi: kapasitasMaks - kuotaTerisi,
    persenTerisi: Math.round((kuotaTerisi / kapasitasMaks) * 100),
    region: regionForDestination(trip.destinasi),
    tanggalLabel: tanggal
      ? `${tanggal.getDate()} ${MONTHS[tanggal.getMonth()]} ${tanggal.getFullYear()}`
      : "Jadwal menyusul",
    periodeLabel: tanggal ? `${MONTHS[tanggal.getMonth()]} ${tanggal.getFullYear()}` : null,
  };
};

/** Same reduction for a `paket_wisata` document. */
export const normalizePaketWisata = (paket) => ({
  ...paket,
  harga: toNumber(paket.harga),
  fasilitas: splitFasilitas(paket.fasilitas),
  region: regionForDestination(paket.destinasi),
});

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

/**
 * The three filters are conjunctive, and a bucket the data does not cover
 * should show an empty state rather than silently behaving like "semua".
 */
export const filterJourneys = (items, { region = "semua", price = "semua" } = {}) => {
  const band = PRICE_BUCKETS.find((b) => b.key === price) ?? PRICE_BUCKETS[0];
  return items.filter((item) => {
    const regionOk = region === "semua" || item.region === region;
    const priceOk = item.harga >= band.min && item.harga < band.max;
    return regionOk && priceOk;
  });
};

/**
 * The period filter only offers periods that actually occur in the data, so an
 * admin who has never scheduled a March trip is not offered March.
 */
export const availablePeriods = (items) => {
  const seen = new Map();
  items.forEach((item) => {
    if (item.periodeLabel && !seen.has(item.periodeLabel)) {
      seen.set(item.periodeLabel, item.periodeLabel);
    }
  });
  return [...seen.keys()].sort();
};

export const filterByPeriod = (items, period) =>
  !period || period === "semua" ? items : items.filter((i) => i.periodeLabel === period);

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

/** Rupiah formatting, without decimals, matching how prices are quoted. */
export const formatRupiah = (value) => {
  const n = Math.round(toNumber(value));
  return `Rp ${n.toLocaleString("id-ID")}`;
};

/* ------------------------------------------------------------------ */
/* WhatsApp handover                                                   */
/* ------------------------------------------------------------------ */

export const PAX_OPTIONS = [
  { value: "2", label: "Pasangan (2 Pax)" },
  { value: "3-5", label: "Keluarga Inti (3 - 5 Pax)" },
  { value: "6-10", label: "Rombongan Kecil (6 - 10 Pax)" },
  { value: "10+", label: "Delegasi Korporat (> 10 Pax)" },
];

export const ARMADA_OPTIONS = [
  "Toyota Alphard / Vellfire VIP",
  "Toyota HiAce Premio Luxury Captain",
  "Toyota Innova Zenix Hybrid",
  "Isuzu Elf Long Coaster Executive",
  "Belum Ditentukan (Rekomendasi Concierge)",
];

/**
 * Compose the consultation message.
 *
 * The user agreed to hand off to WhatsApp rather than write to Firestore, so
 * this is the only artefact the form produces. Optional fields are omitted
 * rather than sent as "null" so the concierge reads a clean list.
 */
export const buildConsultationMessage = ({
  destination = "",
  schedule = "",
  pax = "",
  armada = "",
  notes = "",
} = {}) => {
  const lines = [
    "Halo Cakra Lima Tujuh, saya ingin mendiskusikan rencana perjalanan privat.",
    "",
    "Detail Rencana:",
  ];
  if (destination.trim()) lines.push(`• Destinasi: ${destination.trim()}`);
  if (schedule.trim()) lines.push(`• Estimasi Tanggal / Durasi: ${schedule.trim()}`);
  if (pax) lines.push(`• Jumlah Peserta: ${pax}`);
  if (armada) lines.push(`• Preferensi Armada: ${armada}`);
  if (notes.trim()) lines.push(`• Catatan Khusus: ${notes.trim()}`);

  lines.push("", "Mohon informasi ketersediaan dan estimasi tarifnya. Terima kasih.");
  return lines.join("\n");
};

export const whatsappLink = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/** Deep-link straight into a specific trip, for the per-card Reservasi CTA. */
export const tripInquiryMessage = (trip) => {
  const lines = [
    `Halo Cakra Lima Tujuh, saya tertarik membuka kursi pada Open Trip: ${trip.judul}.`,
    "",
    `Detail: ${trip.destinasi} · ${trip.tanggalLabel} · ${formatRupiah(trip.hargaPerPax)}/pax`,
  ];
  if (trip.sisaKursi > 0) {
    lines.push(`Sisa kursi yang tercatat: ${trip.sisaKursi} dari ${trip.kapasitasMaks}.`);
  }
  lines.push("", "Mohon informasi soal reservasi dan skema DP 50%-nya. Terima kasih.");
  return lines.join("\n");
};
