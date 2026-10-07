/**
 * Curated tour catalogue for the public `/tour-packages` page.
 *
 * Transcribed from the design
 * `stitch_cakra57_travel_web_redesign/paket_wisata_open_trip_fora_x_japan_private_tour_luxury_cakra_lima_tujuh/code.html`.
 * Copy is verbatim from that spec, not re-typed from memory;
 * `src/__tests__/tourCatalogue.test.js` asserts every string here still
 * appears in the design file, so drift is caught.
 *
 * ── Why this is separate from Firestore ──────────────────────────────────
 * `TourPackages` still reads the `paket_wisata` collection, which is the
 * admin-managed CMS catalogue. That is kept and rendered unchanged, further
 * down the page. This file is the curated editorial layer: the scheduled open
 * trips and the bespoke private journeys the design specifies, with the
 * availability, inclusions and service promises that a generic CMS row cannot
 * express.
 *
 * ── Commercial and operational data ─────────────────────────────────────
 * The prices, seat counts and departure dates below are transcribed from a
 * design mockup. They are placeholder figures for layout purposes and are NOT
 * approved commercial terms. They are isolated in the two blocks marked
 * "NEEDS SIGN-OFF" so one review pass can correct or remove every number
 * without reading this file end to end. `tourCatalogue.test.js` re-asserts
 * that isolation, so new invented numbers cannot be scattered elsewhere.
 *
 * Two figures are known-stale as of the transcription date and are called out
 * inline: the design's "18 April 2025" Dieng departure (in the past) and its
 * "Semua Musim 2025" period label.
 */

const WHATSAPP_NUMBER = "6281257570057";

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const HERO = {
  overline: "Curated Overland & Archipelago Expeditions",
  headline: "Jelajahi Setiap Detik, Rencanakan Kenangan Terbaik.",
  lead:
    "Pilih petualangan terjadwal bersama sesama penikmat lanskap Nusantara " +
    "(Open Trip) atau nikmati kenyamanan privat tanpa kompromi bersama " +
    "keluarga dan kolega (Private Trip & Bespoke Itinerary).",
  badges: [
    { icon: "event_available", title: "Pasti Berangkat", body: "Tanpa Kuota Minimum" },
    { icon: "verified_user", title: "Pemandu Lisensi", body: "BNSP & HPI Resmi" },
    { icon: "directions_car", title: "Armada Muda", body: "Maksimal 3 Tahun Pakai" },
    { icon: "security", title: "Skema DP 50%", body: "Aman & Terproteksi" },
  ],
};

/* ── Filter bar ────────────────────────────────────────────────────────── */

export const CATEGORIES = [
  "Semua Kategori",
  "Open Trip Terjadwal",
  "Paket Wisata Privat",
  "Bespoke Itinerary",
];

export const REGIONS = [
  "Semua Wilayah",
  "Jawa Timur (Bromo & Ijen)",
  "Bali & Nusa Penida",
  "Yogyakarta & Solo Heritage",
  "Eksotisme ASEAN",
];

/* Keys must match `region` on the open trips below for the filter to work. */
export const REGION_OPTIONS = [
  { key: "all", label: "Semua Wilayah" },
  { key: "jawa-timur", label: "Jawa Timur (Bromo & Ijen)" },
  { key: "bali-penida", label: "Bali & Nusa Penida" },
  { key: "yogyakarta-solo", label: "Yogyakarta & Solo Heritage" },
  { key: "asean", label: "Eksotisme ASEAN" },
];

/* ── NEEDS SIGN-OFF: budget bands ──────────────────────────────────────── */
/* The design shows only "Semua Kisaran Tarif" as a static control. The bands
   below are a functional stand-in built from the transcribed per-pax figures
   so the filter has something to filter on. They are display thresholds, not
   quoted prices, and need confirming. */
export const BUDGET_OPTIONS = [
  { key: "all", label: "Semua Kisaran Tarif" },
  { key: "under-600", label: "Di Bawah Rp 600.000" },
  { key: "600-1000", label: "Rp 600.000 – 1.000.000" },
  { key: "over-1000", label: "Di Atas Rp 1.000.000" },
];

/* Period control. The design's single value, "Semua Musim 2025", is stale, so
   it is not offered as an option; the verbatim field label is used instead. */
export const PERIOD_OPTIONS = [{ key: "all", label: "Periode Keberangkatan" }];

/**
 * Filter-control chrome. Each design control is a labelled panel: an uppercase
 * caption, a glyph, and a value. Kept here so the captions are held to the same
 * verbatim check as the editorial copy.
 */
export const FILTER_CONTROLS = {
  region: { caption: "Wilayah Eksplorasi", icon: "explore" },
  period: { caption: "Periode Keberangkatan", icon: "calendar_month" },
  budget: { caption: "Rentang Investasi", icon: "payments" },
  submit: { label: "Tampilkan Jadwal", icon: "search" },
};

export const POPULAR_DESTINATIONS = [
  "Bromo Sunrise",
  "Kawah Ijen Blue Fire",
  "Borobudur VIP",
  "Nusa Penida Secret",
  "Dieng Highland",
];

/* ── Section 1: scheduled open trips ───────────────────────────────────── */

/**
 * The design's own heading for the open-trip grid. It was never transcribed:
 * the section rendered with an `aria-label` only, so 670px of cards appeared
 * on the page under no heading at all while every other section carried one.
 * Transcribed verbatim from
 * `stitch_cakra57_travel_web_redesign/paket_wisata_.../code.html`.
 */
export const OPEN_TRIP_SECTION = {
  eyebrow: "Koleksi Terjadwal",
  title: "Jadwal Open Trip Terdekat",
  lead:
    "Edisi kelompok kecil yang intim (Maksimal 8 Peserta per grup). Suasana " +
    "hangat, fleksibel, dan terorganisir paripurna.",
  meta: "Pemberangkatan: Hub Juanda Surabaya & Malang",
};

export const OPEN_TRIPS = [
  {
    id: "bromo-sunrise",
    region: "jawa-timur",
    durationBadge: "Midnight - 1D",
    schedule: "Setiap Jumat - Minggu",
    title: "Bromo Sunrise & Lautan Pasir Berbisik",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAR_ZsLurEcr5RQsJxhX44b91HBreO9lbt6JE__NKJxX-Fd5RM7HIKEVgUMoEYMbLxLosf1Wq0rKMtqaeJvHxSb6Wtq7cfKDNARD2IEo_u6oWJL87QDP0Ma8J88Bra6YvswufJnVFELBmch6c_z7RkiXFjWPoXKcW2psIHEot_TXdlZIXzLR5h-lbO2sHaWKYVT2tBTIj7nfMJXnrhclTCPO25LrQfuX-FEIIHlwwI3JrpdJeoirTWiQA",
    highlights: [
      "Jeep 4x4 Khusus Bromo",
      "Tiket Masuk TNBTS Resmi",
      "Sopir & Pemandu Wisata",
      "Dokumentasi Foto Resolusi Tinggi",
    ],
    /* NEEDS SIGN-OFF: price and seat counts transcribed from the mockup. */
    pricePerPax: 450000,
    seatsTotal: 8,
    seatsFilled: 5,
    seatsLeftLabel: "Sisa 3 Kursi",
  },
  {
    id: "kawah-ijen",
    region: "jawa-timur",
    durationBadge: "2D1N Ekspedisi",
    schedule: "Pemberangkatan Tiap Sabtu",
    title: "Kawah Ijen Blue Fire & Hutan De Djawatan",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDiD1AW_stT8UYOT8_SKTP16An2KickubD8PojWIK5s97gVWxrdWQGKOTUUMDiWlWQ_T6C23mt_jJH_L8zPgyEBDOHrmxlUBBdkey9BP3IHbe-kXwPSnG1WLMcKw6K7eAvbbrhgTx1R2W84cnmYnUIy1URtmxBg0Zuzlc8id4iosxP20-MVwjEKdoidcij9GlASvmtRj-TryY5hNJrGHJDgS60W6qDi_SC2mJ9DBrpY9SZocWUBapfbVA",
    highlights: [
      "Masker Gas Pro & Local Guide Ijen",
      "Homestay Eksklusif AC Banyuwangi",
      "Armada HiAce Premio Luxury",
      "Kunjungan Hutan 'Lord of The Rings'",
    ],
    /* NEEDS SIGN-OFF */
    pricePerPax: 750000,
    seatsTotal: 8,
    seatsFilled: 6,
    seatsLeftLabel: "Sisa 2 Kursi",
  },
  {
    id: "dieng-sikunir",
    region: "yogyakarta-solo",
    durationBadge: "3D2N Escape",
    /* NEEDS SIGN-OFF: the design's date has passed. Replace with a real
       departure schedule before this page is published. */
    schedule: "Keberangkatan 18 April 2025",
    title: "Dieng Golden Sikunir & Heritage Telaga Warna",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCULeqg71OrgsQAtZJjIidFKql5AQuXukoVf0wA6kgN5s_2aV1_Lvx1oslGiRs1i60Yo0wu_022Sq09vpB__QHYumBuLTXfMSBk4kW6RL_chhM98DnaZoL4By6N0OnBDIaFWhF4gWGcxh-6jwmloG-6CxT8p6ZkroHkkh-DpgOFuBbsi4UtETbuUKUYpBIgCXOL0G36Z9Gpvfv_qZCNH6HeluvBvdvCJbXGs4hjnUWban33QIrhw0NkMA",
    highlights: [
      "Golden Sunrise Puncak Sikunir",
      "Eksplor Kompleks Candi Arjuna",
      "Penginapan Highland Berpemanas",
      "Kuliner Mie Ongklok & Carica",
    ],
    /* NEEDS SIGN-OFF */
    pricePerPax: 1150000,
    seatsTotal: 8,
    seatsFilled: 4,
    seatsLeftLabel: "Sisa 4 Kursi",
  },
  {
    id: "nusa-penida",
    region: "bali-penida",
    durationBadge: "2D1N Island",
    schedule: "Keberangkatan Tiap Selasa & Sabtu",
    title: "Nusa Penida: Kelingking & Broken Beach",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAh9_QpMWj68sMVwm9RCrQK3YKtarD426HVGFdd-eif0_ksOrbxMGbOeQnt_wqNgW1NOsmenmET5nwfwlTCh17U0Im9V5K1vv7Bn_4deHnD7J_qgW51WIo3WHIa1imYUsuE7xOovtmu2_TJ5mpuVSkASwQ1niWBLBxTcslI3c3V2HJg6puDBjpbF7qM84BDAlr1UfAx5KKgM8QQT1XFiQoGfgLcO5pBFAM7txh0DGe4jJ8Uq_ynCNXT6Q",
    highlights: [
      "Speedboat Sanur - Penida PP",
      "Mobil Privat Berpendingin AC",
      "Makan Siang & Retribusi Lengkap",
      "Pemandu Lokal Spesialis Foto",
    ],
    /* NEEDS SIGN-OFF */
    pricePerPax: 650000,
    seatsTotal: 8,
    seatsFilled: 3,
    seatsLeftLabel: "Slot Tersedia",
  },
];

/* ── Section 2: bespoke private journeys ───────────────────────────────── */

export const PRIVATE_SECTION = {
  eyebrow: "Bespoke Journeys",
  title: "Paket Wisata Privat Eksklusif",
  lead:
    "Dirancang untuk Anda yang mengutamakan privasi tak terbatas, ritme " +
    "perjalanan santai yang disesuaikan, serta kurasi akomodasi bintang lima " +
    "dan armada kelas premier.",
};

export const PRIVATE_JOURNEYS = [
  {
    id: "yogyakarta-solo",
    durationBadge: "3 Hari 2 Malam Privat",
    eyebrow: "The Royal Heritage & Sultanate Tour",
    title: "Yogyakarta & Solo Keraton",
    region: "yogyakarta-solo",
    summary:
      "Menelusuri keagungan tradisi keraton Mataram, menikmati matahari " +
      "terbit eksklusif di pelataran Borobudur sebelum dibuka untuk umum, dan " +
      "bersantap malam ala bangsawan di Puro Mangkunegaran.",
    vehicle: "Toyota Alphard / HiAce Premio Luxury",
    stay: "The Phoenix / Amanjiwo Partner",
    highlights: [
      "VIP Access Borobudur Sunrise",
      "Royal Dining Puro Mangkunegaran",
      "Batik Masterclass Solo",
      "Chauffeur Berbahasa Inggris",
    ],
    /* NEEDS SIGN-OFF: transcribed from the mockup, not a quoted rate. */
    priceFrom: 2850000,
    minPax: 4,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBzFlrkpHzCNnDJpi6fTO6rXPbktlhjftQUxaOqDHjfIK6hCAgJWz7W5eqN6XRGuR5wqk7J-UOWX87yG8Gb42JnpT8SS5YG3ozCzvUAD97rla2fE2wYblDbYmlIxzkebM9NyY3LNz4Ds6tojF0cnag3ld7mUz7W4Q4C8F3KfofQpzOt5ZOp5DfPij4nZ6WPFONwMKq1-YUnEx0bKQGbEn0rcBvclBOdL4mWyUdUvtWX81eVmnM0mZaJPg",
  },
  {
    id: "east-java-highland",
    durationBadge: "4 Hari 3 Malam Privat",
    eyebrow: "Bromo, Batu & Lumajang",
    title: "East Java Highland & Safari Adventure",
    region: "jawa-timur",
    summary:
      "Kombinasi spektakuler kemegahan sunrise di puncak Pananjakan Bromo," +
        "menginap di resort kabin lereng pegunungan, eksplorasi safari alam" +
        "liar, hingga panorama air terjun tirai megah Tumpak Sewu.",
    vehicle: "HiAce Captain Suite + Private Land Cruiser 4x4",
    stay: "Plataran Bromo / Jiwa Jawa Resort",
    highlights: [
      "Private Sunrise Viewpoint Bromo",
      "Picnic Breakfast di Pasir Berbisik",
      "Air Terjun Tumpak Sewu Panoramic",
      "Kebun Apel & Safari Prigen VIP",
    ],
    /* NEEDS SIGN-OFF */
    priceFrom: 3400000,
    minPax: 4,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAOdOqmNX8Bfib9a-aQBXHiJAez2l6H5ouWBHkQjLWjRsb9VPKBt2IionSGncUE0OnxlmSka27l9Yp3nvhCHAVx63BdfQtDfbCwnN503zyC5E98PCuBvodKNYzw-MgfDlYydg-W4QqReO6Q9axSgyIg0raqGAff-1lxKCL2WIuKljblqetQx_aDeLxCKQ1A5HV_1ufzJJz4L9afR9heVv1Q-XOYLVwvSBEbiSHadISD03qqq8Ed0tVhrQ",
  },
  {
    id: "island-of-the-gods",
    durationBadge: "4 Hari 3 Malam Privat",
    eyebrow: "Ubud Sanctuary & West Bali National Park",
    title: "Island of The Gods: West & East Bali Hidden Gems",
    region: "bali-penida",
    summary:
      "Menjauh dari keramaian urban menuju ketenangan suaka Ubud, pesona" +
        "terumbu karang pulau tak berpenghuni Menjangan, serta eksklusivitas" +
        "sunset lounge Tanah Lot dengan akses privat.",
    vehicle: "Toyota Innova Zenix Hybrid / Alphard VIP",
    stay: "Mandapa / Maya Ubud Sanctuary",
    highlights: [
      "Private Snorkeling Menjangan Island",
      "Sunset Tanah Lot VIP Lounge Access",
      "Private Chef BBQ Experience",
      "Chauffeur Dedikasi 24 Jam Penuh",
    ],
    /* NEEDS SIGN-OFF */
    priceFrom: 3900000,
    minPax: 4,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBB85khqlCX9RLViBLB9oCMsXDej_gj6r3SzO6xbltq3CCq2fFvxi0E7mArXfquv_gSKNrgtydhn3U1psl6LEdlD2EiaRSkvaZoNQEhuVx3ihQd_B7SBsKnF0UkEmqOFYfNo0BAGDyZqW_QUJZbgkYlAZvjvsRQeJStPd6naqla1w5Ca8k2uIeRCQ2Ludsj93QeN2obtxVrc429JWtTB1R4cQGr2m_8rzmMHse_nyGbw4Y_l9lg4yHRhA",
  },
];

/* ── Section 3: service standards ──────────────────────────────────────── */

export const PILLARS_SECTION = {
  eyebrow: "Komitmen Unggul",
  title: "Standar Layanan & Transparansi Mutlak",
  lead:
    "Setiap jengkal perjalanan dikawal oleh kepastian standar kelas " +
    "hospitality, memastikan momen berharga Anda berlangsung hening, aman, " +
    "dan tanpa kejutan tak terduga.",
};

export const SERVICE_PILLARS = [
  {
    icon: "receipt_long",
    title: "Bebas Biaya Tersembunyi",
    body:
      "Tarif all-in telah mencakup bahan bakar, tol, tiket retribusi, " +
      "parkir, hingga akomodasi & konsumsi chauffeur. Tidak ada pungutan " +
      "susulan di tengah perjalanan.",
    tag: "Transparansi 100%",
  },
  {
    icon: "minor_crash",
    title: "Armada Bintang Lima",
    body:
      "Semua kendaraan dirawat berkala hanya di bengkel resmi ATPM dengan " +
      "rekam jejak presisi. Kabin disterilisasi sebelum penjemputan, wangi " +
      "aromaterapi alami, dan AC ganda prima.",
    tag: "Inspeksi 21 Titik",
  },
  {
    icon: "badge",
    title: "Chauffeur Beretika & Santun",
    body:
      "Dididik khusus dalam tata krama hospitality VIP dan bersertifikasi" +
        "BNSP pariwisata. Menguasai navigasi alternatif tercanggih, ramah, dan" +
        "sigap menjaga privasi keluarga Anda.",
    tag: "Pemandu Berlisensi",
  },
  {
    icon: "history_toggle_off",
    title: "Fleksibilitas Reschedule",
    body:
      "Kunci tanggal keberangkatan dengan DP 50% terlindungi invoice legal PT. " +
      "Tersedia kelonggaran penyesuaian tanggal perjalanan (H-7) tanpa penalti " +
      "biaya pembatalan tersembunyi.",
    tag: "Faktur Legal PT Resmi",
  },
];

/* ── Section 4: bespoke request desk ───────────────────────────────────── */

export const CONCIERGE_DESK = {
  eyebrow: "Private Concierge Desk",
  title: "Punya Rencana Perjalanan Impian Sendiri?",
  lead:
    "Ceritakan preferensi waktu, preferensi kuliner, atau tema khusus " +
    "perjalanan Anda. Tim Concierge Cakra Lima Tujuh akan menyusun rute " +
    "terpersonalisasi, perhitungan estimasi tarif, dan konfirmasi unit armada " +
    "terbaik.",
  promises: [
    "Respons konsultasi kilat dalam waktu kurang dari 15 menit",
    "Kustomisasi rute intercity tanpa batasan titik singgah",
    "Dukungan hotline 24 jam selama ekspedisi berlangsung",
  ],
  paxOptions: [
    "Pasangan (2 Pax)",
    "Keluarga Inti (3 - 5 Pax)",
    "Rombongan Kecil (6 - 10 Pax)",
    "Delegasi Korporat (> 10 Pax)",
  ],
  fleetOptions: [
    "Toyota Alphard / Vellfire VIP",
    "Toyota HiAce Premio Luxury Captain",
    "Toyota Innova Zenix Hybrid",
    "Isuzu Elf Long Coaster Executive",
    "Belum Ditentukan (Rekomendasi Concierge)",
  ],
  submitLabel: "Konsultasikan Rencana",
  responseNote: "< 15 Menit",
  staffNote: "Concierge Aktif: 2 Petugas Siaga",
  /**
   * The design's form panel has five fields and deliberately no email: the
   * enquiry is answered over WhatsApp, so collecting an address here would be
   * a field nobody reads.
   */
  fields: {
    destination: {
      label: "Destinasi Tujuan",
      placeholder: "Contoh: Bromo, Malang & Batu",
    },
    dates: {
      label: "Estimasi Tanggal / Durasi",
      placeholder: "Contoh: 12 - 15 Mei 2025 (4D3N)",
    },
    pax: { label: "Jumlah Peserta" },
    fleet: { label: "Pilihan Preferensi Armada" },
    notes: {
      label: "Catatan Khusus / Preferensi Akomodasi",
      placeholder:
        "Sertakan detail hotel bintang lima impian, diet makanan khusus, " +
        "atau titik jemput bandara...",
    },
  },
};

/**
 * Card-level captions and CTA labels. Held here rather than in the components
 * so the design's own wording is covered by the same verbatim check as the
 * editorial copy, and so a wording change is a one-line diff in one file.
 */
export const UI_COPY = {
  openTrip: {
    highlightsCaption: "Fasilitas Utama:",
    availabilityLabel: "Keterisian Kuota",
    availabilityFormat: "{filled} / {total} Terisi",
    priceCaption: "Tarif per Orang",
    priceSuffix: "/ pax all-in",
    ctaLabel: "Reservasi Kursi",
    ctaNote: "(DP 50%)",
    checkIcon: "check_circle",
  },
  privateJourney: {
    vehicleLabel: "Armada Pilihan",
    vehicleIcon: "directions_car",
    stayLabel: "Kurasi Akomodasi",
    stayIcon: "hotel",
    highlightsCaption: "Pengalaman Eksklusif:",
    priceLabel: "Investasi Mulai",
    priceSuffix: "/ orang (min. {minPax} pax)",
    ctaLabel: "Rancang Paket Ini",
  },
};

export { WHATSAPP_NUMBER };

/* ── Derived helpers ───────────────────────────────────────────────────── */

/** Rupiah, formatted the way the design shows it. */
export function formatRupiah(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/** Seat-occupancy ratio, clamped, for the availability bar. */
export function occupancy(trip) {
  if (!trip.seatsTotal) return 0;
  return Math.min(100, Math.round((trip.seatsFilled / trip.seatsTotal) * 100));
}

/**
 * Open trips matching the active filters. `region` and `budget` keys come from
 * REGION_OPTIONS / BUDGET_OPTIONS; anything unmatched is ignored rather than
 * throwing, so a stale filter in the URL cannot blank the page.
 */
export function filterOpenTrips({ region = "all", budget = "all" } = {}) {
  return OPEN_TRIPS.filter((trip) => {
    if (region !== "all" && trip.region !== region) return false;
    if (budget === "under-600" && trip.pricePerPax >= 600000) return false;
    if (budget === "600-1000" && (trip.pricePerPax < 600000 || trip.pricePerPax > 1000000)) {
      return false;
    }
    if (budget === "over-1000" && trip.pricePerPax <= 1000000) return false;
    return true;
  });
}

/** WhatsApp deep link for a scheduled open trip, with the trip named. */
export function openTripEnquiryHref(trip) {
  const message =
    `Halo Concierge Cakra Lima Tujuh, saya ingin reservasi kursi untuk ` +
    `${trip.title} (${trip.durationBadge}). Boleh info ketersediaan dan tarifnya?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** WhatsApp deep link for a bespoke private journey. */
export function privateJourneyEnquiryHref(journey) {
  const message =
    `Halo Concierge Cakra Lima Tujuh, saya tertarik private itinerary: ` +
    `${journey.title}. Boleh request info itinerary dan estimasi tarifnya?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * WhatsApp deep link for the bespoke-request form. The wording is ours — the
 * design specifies the fields, not the outgoing message — so only the filled
 * answers are carried across, skipping blanks so the message never contains a
 * dangling label.
 */
export function conciergeEnquiryHref({ destination, dates, pax, fleet, notes }) {
  const lines = [
    ["Destinasi Tujuan", destination],
    ["Estimasi Tanggal / Durasi", dates],
    ["Jumlah Peserta", pax],
    ["Pilihan Preferensi Armada", fleet],
    ["Catatan Khusus", notes],
  ]
    .filter(([, value]) => String(value || "").trim().length > 0)
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  const message =
    `Halo Concierge Cakra Lima Tujuh, saya ingin menyusun itinerary ` +
    `bespoke.\n\n${lines.join("\n")}\n\n` +
    `Boleh estimasi tarif dan ketersediaan armadanya?`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
