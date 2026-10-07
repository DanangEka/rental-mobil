/**
 * Testimonial & documentation content model.
 *
 * Both the public page (`src/pages/Testimoni.js`) and the admin moderation
 * page (`src/pages/AdminTestimoni.js`) read the same `testimoni` collection and
 * share this taxonomy, so a submission typed by a guest is labelable by the
 * same admin who publishes it. One list, not one list per surface — the two
 * mockups each shipped their own category menu and they disagreed.
 *
 * Real quotes are client-owned, so they arrive through the Firestore collection
 * (either written by a guest on the public page or by an admin on the upload
 * form) rather than being authored here. No editorial seed rows are merged into
 * the public gallery: it shows exactly what has been published.
 */

export const CATEGORIES = [
  { id: "bromo",     label: "Open Trip Bromo & Ijen" },
  { id: "bali",      label: "Private Tour Bali" },
  { id: "overland",  label: "Overland Jawa & Jogja" },
  { id: "chauffeur", label: "Chauffeur VIP Korporat" },
  { id: "family",    label: "Family Vacation" },
  { id: "wedding",   label: "VIP Wedding Car" },
  { id: "transfer",  label: "Airport Transfer Juanda" },
  { id: "sewa",      label: "Sewa Mobil Lepas Kunci" },
];

export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label || "Layanan Lain";

/** Public filter pills. `all` is the catch-all and has no category entry. */
export const PUBLIC_FILTERS = [
  { id: "all",        label: "Semua Cerita" },
  { id: "bromo",      label: "Open Trip Bromo & Ijen" },
  { id: "bali",       label: "Private Tour Bali" },
  { id: "overland",   label: "Overland Jawa & Jogja" },
  { id: "chauffeur",  label: "VIP Executive Rental" },
  { id: "family",     label: "Family Vacation" },
];

/**
 * Aggregate proof points for the public stat band. These are brand claims, not
 * derived data — the count of published testimonials lives in the collection and
 * is counted at render time. Keep the two apart deliberately.
 */
export const BRAND_STATS = [
  { value: "850+",   label: "Ulasan Terverifikasi" },
  { value: "99.2%",  label: "Ketepatan Jadwal" },
  { value: "100%",   label: "Armada 2023–2025" },
  { value: "98.6%",  label: "Kepuasan Tamu" },
];

export const RATING_LABELS = {
  1: "Kurang Memadai",
  2: "Perlu Perbaikan",
  3: "Cukup Baik",
  4: "Sangat Baik",
  5: "Sempurna",
};

export const initialsOf = (name = "") => {
  const parts = name.replace(/[^A-Za-z\s&.]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
