/**
 * Custom Trip Planner — bespoke route calculator.
 *
 * Like `bespokeJourneys`, this is editorial data, not a Firestore collection:
 * the fleet units and destinations are the concierge's premium bespoke
 * catalogue (HiAce Premio, Alphard, Fortuner GR…) rather than the CRUD rows in
 * `mobil` / `paket_wisata`. Prices are *live estimates*, not guaranteed quotes
 * — the real quote comes from the concierge consultation / trip_requests
 * handover, exactly the contract `bespokeJourneys` already documents.
 *
 * The calculator mirrors the `custom_trip_planner_kalkulator_rute` mockup.
 * The pick-up zone `multiplier` follows the mockup's per-origin intent: a
 * Malang & Batu start lifts the fleet subtotal by 10%, surfaced as its own
 * line item in the quote panel.
 */

/** Short tint of the brand for the header badge / hero. */
export const TRIP_PLANNER = {
  breadcrumb: ["Layanan Chauffeur", "Jawa Timur Bespoke"],
  current: "Trip Planner Interaktif",
  badge: "Bespoke Travel Experience",
  titleLead: "Rancang Rute Liburan",
  titleAccent: "Impian Anda",
  description:
    "Kustomisasi destinasi singgah, pilihan armada premium dengan sopir profesional berstandar hospitality, dan dapatkan kalkulasi biaya instan secara transparan dengan jaminan skema pembayaran uang muka wajib DP 50%.",
  trustBadge: {
    title: "100% Bebas Biaya Tak Terduga",
    desc: "Termasuk BBM, Driver, Tol & Parkir Wisata",
  },
  guarantee: [
    { icon: "shield", title: "100% Transparan", desc: "Tanpa tips supir paksaan" },
    { icon: "badge", title: "Supir Tersertifikasi", desc: "Uji tes bebas narkoba berkala" },
    { icon: "event_repeat", title: "Reschedule Fleksibel", desc: "Bebas jadwal ulang H-3" },
  ],
};

export const ORIGINS = [
  {
    id: "juanda",
    title: "Bandara Internasional Juanda (SUB)",
    desc: "Terminal 1 (Domestik) / Terminal 2 VIP Meet & Greet",
    icon: "flight_land",
    multiplier: 1,
  },
  {
    id: "surabaya-hotel",
    title: "Hotel / Resor Surabaya",
    desc: "Penjemputan lobi hotel seluruh Surabaya Pusat/Barat/Timur",
    icon: "hotel",
    multiplier: 1,
  },
  {
    id: "stasiun",
    title: "Stasiun Surabaya Pasar Turi / Gubeng",
    desc: "Pintu Utama & Jalur Penjemputan VIP Dropzone",
    icon: "train",
    multiplier: 1,
  },
  {
    id: "malang",
    title: "Area Kota Malang & Batu",
    desc: "Penjemputan langsung villa/kediaman private",
    icon: "apartment",
    multiplier: 1.1,
  },
];

export const TIME_SLOTS = [
  "00:30 WIB (Bromo Sunrise Expedition)",
  "06:00 WIB (Pagi Nyaman)",
  "09:00 WIB (Perjalanan Santai)",
  "14:00 WIB (Siang / Sore Hari)",
];

export const DESTINATIONS = [
  {
    id: "bromo",
    name: "Gunung Bromo Sunrise & Pasir Berbisik",
    keyword: "Bromo Sunrise Expedition",
    region: "Probolinggo",
    icon: "landscape",
    tagline:
      "Penanjakan 1, Kawah Bromo, Bukit Teletubbies, dan jeep shuttle 4x4 privat.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDNqWSIUciNVqhokBwhZJyn2kDepAfmnaW-2tRKRRgunXhMp95kdtvRBVz3riXGvSLGEHldq0jXfAwHfGf0JWp5dzBHU_KROqs_5PaFH901CiKkzlZUiyiPe3Mae4jm-4kHZmckzs36INpEd3HOjzW1RyaaiMYryGHQV9GROe_YJMivXnBFk5ARGzkSt8gtKzFqVeKnB3k_gWO8V91rPA3WADxK7oUed6HDGnRmyom0V7rOL767QtJ0jw",
  },
  {
    id: "madakaripura",
    name: "Air Terjun Madakaripura",
    keyword: "Madakaripura & Lembah",
    region: "Probolinggo",
    icon: "water",
    tagline: "Ngarai abadi dengan tirai air megah petilasan Patih Gajah Mada.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBWmgAdIIuTdYcay64WJySPh9Cy82y3PZP8MoMe0NqUyd7_6hPFHkICBt3Nq3RaUSz9NediYAsEvr87n34mRRN4-3lZMg2B8OGONkzsfAU39y8fGKNBvKvxD806aVmVFFsr4NcHfHYAC0ALmOpOFRV_KtmkEaQg7bKH55dsVV0DjjO7nEga1F2DqCAh2TsosVKLZFV14sp3txWH_rDDcifN9Vv5ZiTdSdzL56wTxvsmvJLGEUji64sb1Q",
  },
  {
    id: "batu",
    name: "Petik Apel & Museum Angkut Batu",
    keyword: "Batu Malang (Petik Apel / Angkut)",
    region: "Kota Batu",
    icon: "local_florist",
    tagline: "Kebun apel organik pegunungan dan atraksi sejarah otomotif dunia.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuALOKJbS33-NUHui9JjuJx6yID04ZzTufzuy6YtHGEPC-aAUAFDdJEmpdqGO2NvvQ9ip3Lhynr-WEy6AVLpRrPdpW1wBG6Fu_qurZ6p1K37dSww4-V5lHsTm4DKXlsPnpWkY7LX2J0K38IW52YEIgWDS6LPO_ME_7SfnT1JIX9a55Ni3_GW4ajloetst3_7vMOUYgXOZeHA8NrR3iHJOVxtlZQAi0uvKE43znmSKmVyZvdcy8ULV7Wpbw",
  },
  {
    id: "tumpaksewu",
    name: "Air Terjun Tumpak Sewu",
    keyword: "Tumpak Sewu Lumajang",
    region: "Lumajang",
    icon: "water_drop",
    tagline: "Air terjun tirai megah berjuluk 'Niagara van Java' di kaki Semeru.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB64D-sieWzdh31pzrFS-3R9sBnJhoqkTZTsUyRvSTA8yPkKMIpXCY0wap-NsfwjhlDYp5oR2a-wtZyXoucXyqx7pI08hVjzO5DqdGWDOimlpNXIZH1bD-lEccBnH9ylLg-LNj-DHuKGeDzeVUGRV82aTVzeXZumNRIitpeP-6tyicXSA92-G7E9J1hnGWdy27iVfo4x9pTzUT3hoYECCyH5Iqwk13mR0JpnqNHToGHH1rkT-BDSQLltA",
  },
  {
    id: "ijen",
    name: "Kawah Ijen Blue Fire",
    keyword: "Kawah Ijen Blue Fire",
    region: "Banyuwangi",
    icon: "local_fire_department",
    tagline: "Fenomena api biru alami dunia dan danau belerang toska.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAf8IRxA-C5Osq1t0iAY6bgV9BDapzJtNKoauSuQzm__6_KOMbpF4ZNNCmUUj_S232HM2odOybgQ_UPv5Mvcz-tCYHIQBxbm-EBBPAsG2YCCYeO8GkBRYlPoRQ3cdksoEQ2zvMCKn2OH_P2hPWK9qSiyfNZAX4nLiHnyHONXTlmM3oScttl1KovooNOAal7lWfeqys2h_fIxiqWTpN1j9D3_XkVPyGpCgu-m34accBNPvJJFd7uJ_P6YA",
  },
  {
    id: "pantai",
    name: "Pantai Balekambang & Asmara",
    keyword: "Pantai Balekambang",
    region: "Malang Selatan",
    icon: "beach_access",
    tagline: "Gugusan karang eksotis, pura di atas pulau karang, dan pasir putih bersih.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD7dVMIGcfkQX_spEue4MrA9fF_grWit7P38RXjvN_GzyvSdKl6pE_rgoKa7_WowSdXbAlwUCR__SiZiR7bGi2or0dIfe3LqxPA88PO8F3sGIBRHFccWeAWx7shz-B8BCszH0Foj1HsnYMvpIQHZxIklKipXYzvXL5bKynxSHh1hBi3cgulUDRqYI_HznBH6oxLINEaS3BJgFADJK1GthwOoIPtl4t8zneQoE5ZtfuRDltwWpCCUa01Cg",
  },
];

export const FLEETS = [
  {
    id: "hiace",
    badge: "Paling Populer Wisata Keluarga",
    title: "Toyota HiAce Premio Luxury",
    desc: "VIP 10 Captain Seats • Suspensi Reclining Halus",
    spec: "10 Penumpang • 7 Koper",
    driver: "Supir Standar VIP",
    driverTone: "neutral",
    rate: 1650000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAyvgV_SzBKJ54b96-v-ZxjGx3JFwYSiukErzdd5bqgbKqxPxWerHIy1TQ1pg_V0r64O1xQ7auEqNUtRRfv5qwVa9ETR7ZHHT5AZvY7gcPFmMwL1hG5QrS4Ry8DcSimGWOw6ias9Lox4K6JR2zjDPSjm3teCbk_KNnwfLeQ8U3QzjxYbTY-BXb05-DVTU8Y1-RmAZJn8iE50uEAEGwSB7vhgjTEsd5MxId41GG5oOjpbqofs84TvBwiaw",
  },
  {
    id: "zenix",
    badge: "Efisiensi & Ketenangan",
    title: "Innova Zenix Hybrid VIP",
    desc: "Sunroof Panoramic • Kabin Nyaman Senyap",
    spec: "6 Penumpang • 4 Koper",
    driver: "Eco-Luxury Chauffeur",
    driverTone: "neutral",
    rate: 1250000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAhfdEftXt2vGJfZSPuU7vu2bj2vLgHDSxzw7-GMc8IP4RE69B24aHZBkOsFmQ_X7X6-lVqD-JiipmqBTDpqLgwoZLRQnryn_PQbZwMbwquXUBCRf0lmHtNlHRKh9XFNUDUxNx18R1WyXBFZLmwTp01lJOIWiLim0jfjvlbZ78ytIIC8ETpq3w__OZ6A9o10hra2eQfPAWz4MtsY1ndaEiq_hIjURjO5bCsjpHyz7-1IBrmSUjF0QJk_w",
  },
  {
    id: "alphard",
    badge: "First-Class Executive",
    title: "Toyota Alphard VIP",
    desc: "Ottoman Seats • Privasi Maksimal Pejabat & Artis",
    spec: "5 Penumpang • 5 Koper",
    driver: "Chauffeur Berdasi",
    driverTone: "accent",
    rate: 2600000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC7xoWD7pbI8rg-6P3X8vAPHidjQCqVJdgpB6p3vxgZdF1DZbpUMTNj0Tv-wlzabRWhmEZXXUK3tqaRcFVkgBV_8aayZxUwmV2hgLXagsXBhVyGm3J0LyvQ6eLPElx9BHZcEr20lvQEJcT07LcmPoaAa7RKfvMdX-hI8d52qPj4t0xUF-jItsql7iH5pMgvg2qsMAwAbdjFVs6E57XJ-JOBEd3yCkWy6DzfcnW_7Rh10sdWXnJn-Rk9aQ",
  },
  {
    id: "fortuner",
    badge: "Tangguh Medan Gunung",
    title: "Fortuner GR Sport 4x4",
    desc: "Kemampuan Tanjakan Ekstrem & Nyaman Berkelas",
    spec: "6 Penumpang • 4 Koper",
    driver: "Supir Medan Terjal",
    driverTone: "neutral",
    rate: 1750000,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCjfKdf4YNfRq_qC9cNHeTtqoCpb0ieL3HC46jwsR16lJOlkAC4hCkIxESRO8Vl740wvodohIuMuL8DR93QissIdRILPtc4uDNeZN20_KycxryCtdfjM8tP7JqY2a9cW4IgVgkMdHwI_8py4VYq2hhiZMSphhph98c72MLQEuCeKP--sHVhcDF4IFsmX3Qj1OV3s1EATAAeZGWQ4x2Z23YgcAOTBKBSCSPEH17HdIXsxcOLf4rW8KOCfQ",
  },
];

export const ADDONS = [
  {
    id: "photo",
    title: "Dedicated Travel Photographer & Drone Pilot",
    desc: "Dokumentasi kamera Sony Alpha, all unedited files + 20 edited highlights siap tayang medsos.",
    amount: 500000,
    per: "/hari perjalanan",
    perDay: true,
    defaultOn: true,
  },
  {
    id: "seat",
    title: "Child Safety Car Seat ISOFIX Standard",
    desc: "Keamanan dan kenyamanan maksimal bagi balita (0-4 tahun) berstandar sertifikasi Eropa.",
    amount: 75000,
    per: "/hari penggunaan",
    perDay: true,
    defaultOn: false,
  },
  {
    id: "snack",
    title: "Snack Box Premium & Welcome Local Coffee / Herbal Drink",
    desc: "Pilihan kudapan artisan khas Jawa Timur, mineral water botol kaca, dan kopi tubruk Bromo hangat.",
    amount: 35000,
    per: "/pax perjalanan (6 pax)",
    perDay: false,
    defaultOn: true,
  },
];

/** Pricing & routing constants carried from the mockup engine. */
export const ESTIMATED_KM = 420;
export const SEASONAL_DISCOUNT = 160000;
export const ADDON_SNACK_PAX = 6;
export const MIN_DAYS = 1;
export const MAX_DAYS = 10;
export const DEFAULT_DAYS = 3;