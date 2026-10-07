/**
 * Per-route SEO metadata for the SPA.
 *
 * public/index.html carries the sitewide defaults (travel-agency identity);
 * this map overrides <title>, meta description, robots and canonical per
 * route so each page can target its own search intent without leaking
 * rental-mobil keywords onto travel pages (or vice versa).
 *
 * Keyword ownership (do not move keywords between pages casually):
 *   shared/default   : "Premium Travel Agen", "Travel Agen Terpercaya"
 *   /home            : "Rental Mobil Surabaya", "Rental Mobil Lidah Wetan"
 *   /open-trip       : "Travel Agen Surabaya"
 *   /company-profile : "Premium Travel Agen", "Travel Agen Terpercaya"
 */

export const SITE_NAME = "Cakra Lima Tujuh";
export const SITE_URL = "https://www.cakra57.com";

export const DEFAULT_TITLE = "Cakra Lima Tujuh — Premium Travel Agen Terpercaya di Surabaya";
export const DEFAULT_DESCRIPTION =
  "Premium travel agen terpercaya di Surabaya: open trip, private trip, dan airport transfer. " +
  "Rental mobil Surabaya & Lidah Wetan dengan armada premium.";

const PUBLIC_ROUTES = [
  "/",
  "/home",
  "/login",
  "/signup",
  "/company-profile",
  "/open-trip",
  "/tour-packages",
  "/testimoni",
  "/trip-planner",
];

const ROUTES = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  "/home": {
    title: "Rental Mobil Surabaya & Rental Mobil Lidah Wetan — Cakra Lima Tujuh",
    description:
      "Rental mobil Surabaya terpercaya — armada prima lepas kunci atau dengan driver. " +
      "Melayani rental mobil Lidah Wetan dan sekitar, harga transparan, booking mudah.",
  },
  "/open-trip": {
    title: "Travel Agen Surabaya & Open Trip — Cakra Lima Tujuh",
    description:
      "Travel agen Surabaya untuk open trip ke Jawa, Bali, dan Indonesia. " +
      "Itinerary terkurasi, guide berpengalaman, berangkat rutin bersama Cakra Lima Tujuh.",
  },
  "/company-profile": {
    title: "Premium Travel Agen Terpercaya — Cakra Lima Tujuh",
    description:
      "Kenali Cakra Lima Tujuh, premium travel agen terpercaya di Surabaya. " +
      "Visi, layanan, dan komitmen kami untuk perjalanan yang aman, personal, dan berkesan.",
  },
  "/tour-packages": {
    title: "Paket Wisata & Custom Trip — Cakra Lima Tujuh",
    description:
      "Paket wisata private, custom, dan corporate trip dengan itinerary terkurasi. " +
      "Konsultasi gratis bersama Cakra Lima Tujuh, travel agen Surabaya.",
  },
  "/testimoni": {
    title: "Testimoni & Ulasan — Cakra Lima Tujuh",
    description:
      "Kisah nyata dari pelanggan Cakra Lima Tujuh. Testimoni perjalanan yang " +
      "menegaskan layanan travel agen Surabaya terpercaya.",
  },
  "/trip-planner": {
    title: "Trip Planner — Rencanakan Perjalanan | Cakra Lima Tujuh",
    description:
      "Rancang rencana perjalanan Anda: destinasi, tanggal, dan preferensi. " +
      "Diracik tim Cakra Lima Tujuh, premium travel agen Surabaya.",
  },
  "/login": {
    title: "Masuk — Cakra Lima Tujuh",
    description: "Masuk ke akun Cakra Lima Tujuh untuk mengelola booking dan perjalanan Anda.",
  },
  "/signup": {
    title: "Daftar — Cakra Lima Tujuh",
    description: "Daftar akun Cakra Lima Tujuh dan mulai rencanakan perjalanan Anda.",
  },
  "/discovery": {
    title: "Jelajahi Destinasi — Cakra Lima Tujuh",
    description:
      "Jelajahi destinasi wisata Nusantara dan ASEAN bersama Cakra Lima Tujuh, " +
      "travel agen Surabaya.",
  },
  "/destinasi": {
    title: "Destinasi Wisata — Cakra Lima Tujuh",
    description:
      "Panduan destinasi wisata pilihan dari Cakra Lima Tujuh, premium travel agen Surabaya.",
  },
};

const TITLE_OVERRIDES = {
  "/discovery": "/discovery",
  "/destinasi": "/destinasi",
};

function normalize(pathname) {
  if (!pathname) return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Routes that are private app surfaces and must never appear in search. */
function isPublicRoute(path) {
  if (PUBLIC_ROUTES.includes(path)) return true;
  if (path === "/discovery" || path.startsWith("/discovery/")) return true;
  if (path === "/destinasi" || path.startsWith("/destinasi/")) return true;
  return false;
}

/**
 * Resolve SEO metadata for a pathname.
 * Dynamic routes (prefix matches) fall back to their base entry; unknown
 * routes get the sitewide defaults, marked noindex if they are private.
 */
export function resolveSeo(pathname) {
  const path = normalize(pathname);

  const exact = ROUTES[path];
  if (exact) {
    return {
      title: exact.title,
      description: exact.description || DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}${path === "/" ? "/" : path}`,
      robots: "index, follow",
    };
  }

  // Prefix match for dynamic routes: /destinasi/bali, /discovery/jawa, …
  const prefix = "/" + path.split("/")[1];
  const base = ROUTES[prefix];
  if (base && TITLE_OVERRIDES[prefix]) {
    return {
      title: base.title,
      description: base.description || DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}${path}`,
      robots: "index, follow",
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_URL}${path === "/" ? "/" : path}`,
    robots: isPublicRoute(path) ? "index, follow" : "noindex, nofollow",
  };
}
