/**
 * Pure Google-Calendar sync logic for the fleet schedule.
 *
 * Everything here is a deterministic function of its arguments — no gapi, no
 * Firestore, no React — mirroring how `utils/jadwalArmada.js` keeps the board's
 * date maths out of the page. The service layer (`services/calendarSync.js`)
 * wires these functions to the Google transport and the realtime collections;
 * the pieces that decide *what* to push and *how the event looks* live here so
 * they can be tested without a browser, a Google session or a mock Firebase.
 *
 * ## What syncs, and when
 *
 * A document is automatically pushed when it is neither cancelled nor outside
 * the sync window (`PAST_GRACE_DAYS` behind … `SYNC_HORIZON_DAYS` ahead of
 * today). Past bookings keep the events they already got: the diff only ever
 * *deletes* for two reasons — the document was cancelled, or it was removed
 * from Firestore entirely. That keeps a historical calendar from being erased
 * the first time an operator connects.
 *
 * ## Hashes instead of event dumps
 *
 * Whether an event needs a patch is decided by comparing a hash of the fields
 * that feed the event against the hash stored when we last pushed. No need to
 * fetch the remote event on every snapshot — and a hash that includes the
 * status field means approving or cancelling an order updates or removes the
 * calendar entry by itself.
 *
 * ## The end-exclusive convention
 *
 * `pemesanan.tanggalSelesai` is the day the unit comes back. Google's all-day
 * events are *also* end-exclusive (`end.date` is not part of the event), so a
 * bare date range maps 1:1 with no off-by-one adjustment — the same
 * convention `jadwalArmada.js` documents at length.
 */

import { addDays, bookingTone, startOfDay, toDate } from "./jadwalArmada";

export const SYNC_KINDS = {
  ORDER: "pemesanan",
  TRIP: "open_trips",
};

/** Statuses that must never produce a calendar event — and that clear one. */
export const CANCELLED_STATUSES = new Set(["ditolak", "dibatalkan"]);

/** How far past a booking may end and still be worth auto-syncing. */
export const PAST_GRACE_DAYS = 1;

/** Auto-sync horizon. Also bounds the adoption scan on first connect. */
export const SYNC_HORIZON_DAYS = 365;

export const TIMEZONE = "Asia/Jakarta";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

/** Stable key for one synced document. The id may itself contain ":". */
export const syncKey = (kind, id) => `${kind}:${id}`;

/** Inverse of `syncKey` for the parts — Firestore ids never contain "/". */
export const parseSyncKey = (key) => {
  const idx = String(key || "").indexOf(":");
  if (idx < 0) return { kind: "", id: "" };
  return { kind: key.slice(0, idx), id: key.slice(idx + 1) };
};

const pad = (n) => String(n).padStart(2, "0");

export const ymdLocal = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const clean = (v) => (v === null || v === undefined ? "" : String(v));

/* ── Syncability ───────────────────────────────────────────────────────── */

const isCancelled = (doc) =>
  CANCELLED_STATUSES.has(clean(doc && doc.status).toLowerCase());

export function isSyncableOrder(order, now = new Date()) {
  if (!order || !order.id || isCancelled(order)) return false;
  const start = toDate(order.tanggalMulai);
  const end = toDate(order.tanggalSelesai);
  if (!start || !end || end <= start) return false;
  const today = startOfDay(now);
  if (end <= addDays(today, -PAST_GRACE_DAYS)) return false;
  if (start > addDays(today, SYNC_HORIZON_DAYS)) return false;
  return true;
}

export function isSyncableTrip(trip, now = new Date()) {
  if (!trip || !trip.id || isCancelled(trip)) return false;
  const depart = toDate(trip.tanggalBerangkat);
  if (!depart) return false;
  const today = startOfDay(now);
  if (depart < addDays(today, -PAST_GRACE_DAYS)) return false;
  if (depart > addDays(today, SYNC_HORIZON_DAYS)) return false;
  return true;
}

export const isSyncable = (kind, doc, now = new Date()) =>
  kind === SYNC_KINDS.ORDER ? isSyncableOrder(doc, now) : isSyncableTrip(doc, now);

export const isCancelledDoc = (doc) => isCancelled(doc);

/* ── Hashes ────────────────────────────────────────────────────────────── */

export function orderEventHash(order) {
  return [
    order.tanggalMulai,
    order.tanggalSelesai,
    order.status,
    order.paymentStatus,
    order.namaClient,
    order.email,
    order.namaMobil,
    order.platNomor,
    order.rentalType,
    order.lokasiPenyerahan,
    order.titikTemuAddress,
    order.deliveryAddress,
    order.telepon,
    order.driverId,
    order.perkiraanHarga,
    order.dpAmount,
    order.bookingCode,
    order.kodeBooking,
  ]
    .map(clean)
    .join("|");
}

export function tripEventHash(trip) {
  return [
    trip.tanggalBerangkat,
    trip.waktuKumpul,
    trip.judul,
    trip.destinasi,
    trip.titikKumpul,
    trip.mobilUtama,
    trip.hargaPerPax,
    trip.kuotaTerisi,
    trip.kapasitasMaks,
    trip.status,
  ]
    .map(clean)
    .join("|");
}

export function eventHash(kind, doc) {
  return kind === SYNC_KINDS.ORDER ? orderEventHash(doc) : tripEventHash(doc);
}

/* ── Event resources ───────────────────────────────────────────────────── */

/** Google Calendar colour ids. Basil/Tangerine/Peacock/Blueberry/Lavender. */
export const TONE_COLOR_IDS = {
  paid: "6",
  pending: "3",
  driver: "7",
  selfdrive: "8",
  standby: "5",
  servis: "11",
};

export const TRIP_COLOR_ID = "9";

const privateProps = (kind, id) => ({
  c57sync: "1",
  c57: syncKey(kind, id),
});

const REMINDERS = {
  useDefault: false,
  overrides: [
    { method: "email", minutes: 24 * 60 },
    { method: "popup", minutes: 60 },
  ],
};

const rupiah = (value) =>
  `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;

/**
 * The calendar payload for one booking.
 *
 * A date-only range (`YYYY-MM-DD`, what every booking form writes) becomes an
 * all-day event whose `end.date` is passed through untouched — Google already
 * treats it as exclusive, which is the app's own convention. A range carrying
 * a time-of-day (the admin's `datetime-local` manual allocation) becomes a
 * timed event instead, so an afternoon handover is not rounded to midnight.
 */
export function orderEventResource(order) {
  const rawStart = clean(order.tanggalMulai).trim();
  const rawEnd = clean(order.tanggalSelesai).trim();
  const allDay = DATE_ONLY.test(rawStart) && DATE_ONLY.test(rawEnd);

  let start;
  let end;
  if (allDay) {
    start = { date: rawStart };
    end = { date: rawEnd };
  } else {
    const s = toDate(order.tanggalMulai);
    const e = toDate(order.tanggalSelesai);
    start = { dateTime: s.toISOString(), timeZone: TIMEZONE };
    end = { dateTime: e.toISOString(), timeZone: TIMEZONE };
  }

  const location =
    order.deliveryAddress ||
    (["rumah", "titik temu"].includes(clean(order.lokasiPenyerahan).toLowerCase())
      ? order.titikTemuAddress
      : "") ||
    "Garasi Cakra Lima Tujuh";

  const lines = [
    `Sewa ${order.namaMobil || "armada"}${order.platNomor ? ` (${order.platNomor})` : ""}`,
    `Klien: ${order.namaClient || order.email || "-"}`,
    `Tipe: ${order.rentalType || "Lepas Kunci"}`,
    `Status: ${order.status || "-"}`,
    `Total: ${rupiah(order.perkiraanHarga)} (DP ${rupiah(order.dpAmount)})`,
  ];
  if (order.telepon) lines.push(`Telepon: ${order.telepon}`);
  const ref = order.bookingCode || order.kodeBooking || clean(order.id).slice(0, 8).toUpperCase();
  if (ref) lines.push(`Ref: #${ref}`);

  return {
    summary: `Rental: ${order.namaMobil || "Armada"}${
      order.namaClient ? ` — ${order.namaClient}` : ""
    }`,
    location,
    description: lines.join("\n"),
    start,
    end,
    colorId: TONE_COLOR_IDS[bookingTone(order).id] || "8",
    reminders: REMINDERS,
    extendedProperties: { private: privateProps(SYNC_KINDS.ORDER, order.id) },
  };
}

/**
 * The calendar payload for one open trip.
 *
 * Always a timed event anchored on the gathering time (`waktu kumpul`, 07:00
 * when absent) so the reminder fires when passengers are supposed to assemble,
 * not at an arbitrary midnight. The instant is built with an explicit +07:00
 * offset so the event lands on the right wall-clock time even when the admin's
 * browser sits in another timezone. Duration is a nominal trip day (8h) —
 * Google has no notion of "until the tour ends", and the description carries
 * the real schedule.
 */
export function tripEventResource(trip) {
  const rawDay = clean(trip.tanggalBerangkat).trim();
  const day = DATE_ONLY.test(rawDay)
    ? rawDay
    : ymdLocal(toDate(trip.tanggalBerangkat));
  const gather = HHMM.test(clean(trip.waktuKumpul).trim())
    ? trip.waktuKumpul.trim()
    : "07:00";

  const startInstant = new Date(`${day}T${gather}:00+07:00`);
  const endInstant = new Date(startInstant.getTime() + 8 * 3600 * 1000);

  const lines = [
    `Destinasi: ${trip.destinasi || "-"}`,
    `Armada: ${trip.mobilUtama || "-"}`,
    `Waktu kumpul: ${gather} WIB`,
    `Tiket: ${rupiah(trip.hargaPerPax)} / pax`,
    `Kuota: ${trip.kuotaTerisi || 0}/${trip.kapasitasMaks || 0} terisi`,
    `Status: ${trip.status || "Tersedia"}`,
  ];

  return {
    summary: `Open Trip: ${trip.judul || trip.destinasi || "Jadwal Trip"}`,
    location: trip.titikKumpul || trip.destinasi || "",
    description: lines.join("\n"),
    start: { dateTime: startInstant.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: endInstant.toISOString(), timeZone: TIMEZONE },
    colorId: TRIP_COLOR_ID,
    reminders: REMINDERS,
    extendedProperties: { private: privateProps(SYNC_KINDS.TRIP, trip.id) },
  };
}

export function eventResource(kind, doc) {
  return kind === SYNC_KINDS.ORDER ? orderEventResource(doc) : tripEventResource(doc);
}

/* ── Diffing ───────────────────────────────────────────────────────────── */

/**
 * Decide what one snapshot round should do.
 *
 * `entries` maps `kind:id` to `{ eventId, hash }` — what this browser last
 * pushed. `docsComplete` must only be true once *both* collections have
 * delivered their first snapshot; before that, "not seen" would read as
 * "deleted" and wipe every just-adopted event.
 */
export function computeSyncActions({
  entries = {},
  orders = [],
  trips = [],
  now = new Date(),
  docsComplete = true,
} = {}) {
  const actions = [];
  const seen = new Set();

  const consider = (kind, doc) => {
    const key = syncKey(kind, doc.id);
    seen.add(key);
    const entry = entries[key];

    if (isCancelled(doc)) {
      if (entry) actions.push({ type: "delete", kind, id: doc.id, key, doc });
      return;
    }
    if (!isSyncable(kind, doc, now)) return;

    const hash = eventHash(kind, doc);
    if (!entry || entry.hash !== hash) {
      actions.push({ type: "upsert", kind, id: doc.id, key, hash, doc });
    }
  };

  orders.forEach((o) => consider(SYNC_KINDS.ORDER, o));
  trips.forEach((t) => consider(SYNC_KINDS.TRIP, t));

  if (docsComplete) {
    for (const key of Object.keys(entries)) {
      if (seen.has(key)) continue;
      const { kind, id } = parseSyncKey(key);
      if (!kind || !id) continue;
      actions.push({ type: "delete", kind, id, key, doc: null });
    }
  }

  return actions;
}

/* ── Badge state ───────────────────────────────────────────────────────── */

/**
 * The one-word label a badge renders for a document:
 *   offline — the admin has not connected Google yet
 *   pending — queued, in flight, or due on the next snapshot
 *   synced  — an event exists and matches the document
 *   error   — the last push failed (or a cancel-delete did)
 *   none    — nothing to sync (cancelled, malformed, or already historical
 *             without an event)
 */
export function deriveSyncState(kind, doc, { connected, entries = {}, pending = {}, errors = {} } = {}) {
  if (!connected) return "offline";
  const key = syncKey(kind, doc.id);
  if (pending[key]) return "pending";
  if (errors[key]) return "error";

  const entry = entries[key];
  if (!entry) {
    return isSyncable(kind, doc) ? "pending" : "none";
  }
  if (isCancelled(doc)) return "none";
  if (!isSyncable(kind, doc)) return "synced";
  return entry.hash === eventHash(kind, doc) ? "synced" : "pending";
}
