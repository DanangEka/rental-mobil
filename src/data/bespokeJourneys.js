/**
 * Curated private itineraries.
 *
 * These are editorial, hand-written journeys rather than rows an admin can
 * create: there is no Firestore collection behind them and no admin CRUD, so
 * this file is the single source of truth. `paket_wisata` and `open_trips`
 * remain the collections for anything an operator schedules or prices through
 * the admin tools.
 *
 * `hargaMulai` is a starting price, not a quote. Real prices come from the
 * consultation handover.
 */
export const bespokeJourneys = [
  {
    id: "royal-heritage",
    badge: "3 Hari 2 Malam Privat",
    region: "Yogyakarta & Solo Keraton",
    title: "The Royal Heritage & Sultanate Tour",
    description:
      "Menelusuri keagungan tradisi keraton Mataram, menikmati matahari terbit eksklusif di pelataran Borobudur sebelum dibuka untuk umum, dan bersantap malam ala bangsawan di Puro Mangkunegaran.",
    armada: "Toyota Alphard / HiAce Premio Luxury",
    akomodasi: "The Phoenix / Amanjiwo Partner",
    highlights: [
      "VIP Access Borobudur Sunrise",
      "Royal Dining Puro Mangkunegaran",
      "Batik Masterclass Solo",
      "Chauffeur Berbahasa Inggris",
    ],
    hargaMulai: 2850000,
    minPax: 4,
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Borobudur%2C_Java%2C_Indonesia%2C_20220817_1013_8739.jpg/1280px-Borobudur%2C_Java%2C_Indonesia%2C_20220817_1013_8739.jpg",
  },
  {
    id: "east-java-highland",
    badge: "4 Hari 3 Malam Privat",
    region: "Bromo, Batu & Lumajang",
    title: "East Java Highland & Safari",
    description:
      "Rangkaian privately escorted yang menyatukan matahari terbit di kaldera Bromo, CITRA Maltasewa yang hening, dan panorama Tumpak Sewu yang harus ditempuh bersama ranger berlisensi.",
    armada: "Toyota Fortuner GR Sport 4x4",
    akomodasi: "Java Resort & Spa Partner",
    highlights: [
      "Private Sunrise Viewpoint Bromo",
      "Picnic Breakfast di Pasir Berbisik",
      "Air Terjun Tumpak Sewu Panoramic",
      "Kebun Apel & Safari Prigen VIP",
    ],
    hargaMulai: 3400000,
    minPax: 4,
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Mount_Bromo_at_sunrise%2C_showing_its_volcanoes_and_Mount_Semeru_%28background%29.jpg/1280px-Mount_Bromo_at_sunrise%2C_showing_its_volcanoes_and_Mount_Semeru_%28background%29.jpg",
  },
  {
    id: "island-of-gods",
    badge: "4 Hari 3 Malam Privat",
    region: "Island of The Gods: Hidden Bali",
    title: "Island of The Gods: Hidden Bali",
    description:
      "Menembus sisi Bali yang belum banyak dilirik: pemandangan suci yang sunyi, terumbu terisolasi Menjangan, dan sunset di lounge Tanah Lot dengan akses privat tanpa antrean.",
    armada: "Toyota Alphard / Vellfire VIP",
    akomodasi: "Four Seasons Sayan Partner",
    highlights: [
      "Private Snorkeling Menjangan Island",
      "Sunset Tanah Lot VIP Lounge Access",
      "Private Chef BBQ Experience",
      "Chauffeur Dedikasi 24 Jam Penuh",
    ],
    hargaMulai: 3900000,
    minPax: 4,
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Bali_-_Pura_Tanah_Lot%2C_20220827_0957_1108.jpg/1280px-Bali_-_Pura_Tanah_Lot%2C_20220827_0957_1108.jpg",
  },
];

export const getBespokeById = (id) =>
  bespokeJourneys.find((journey) => journey.id === id) ?? null;
