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
  { id: "open_trip",    label: "Open Trip" },
  { id: "private_trip", label: "Private Trip" },
  { id: "rental_mobil", label: "Rental Mobil" },
];

export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label || "Layanan Lain";

/** Public filter pills. `all` is the catch-all and has no category entry. */
export const PUBLIC_FILTERS = [
  { id: "all",          label: "Semua Cerita" },
  { id: "open_trip",    label: "Open Trip" },
  { id: "private_trip", label: "Private Trip" },
  { id: "rental_mobil", label: "Rental Mobil" },
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
