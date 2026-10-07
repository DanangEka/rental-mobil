/**
 * Timeline logic for the admin fleet-availability board.
 *
 * Everything here is a pure function of its arguments — no Firestore, no React
 * state, no component scope. The page reads two realtime collections and calls
 * into this module; keeping the date arithmetic, occupancy tiling, category
 * inference and KPI maths out of the component is what makes them testable
 * without standing up a mock Firebase and a full render tree.
 *
 * ## The end-exclusive convention
 *
 * `pemesanan.tanggalSelesai` is the day the unit comes *back*, not a day it is
 * still out on. A 15-to-18 booking has `durasiHari: 3` and occupies 15, 16 and
 * 17 only. That is the same convention `bookingService.checkBookingOverlap`
 * uses (`newStart < b.end && newEnd > b.start`), so a unit returns to the pool
 * on the same morning a new booking is allowed to start. Every day-occupancy
 * test here inherits it.
 *
 * ## Day arithmetic across DST
 *
 * `Date` differences in milliseconds are not days. A 23-hour or 25-hour DST
 * day makes a naive `Math.floor((a - b) / 86400000)` drift by one and shift a
 * whole bar by a column. `dayDiff` therefore projects both ends onto a UTC
 * midnight built from their *local* Y/M/D and divides that, so the result is
 * always an exact integer.
 */

const MS_PER_DAY = 86400000;

/* ── Date primitives ───────────────────────────────────────────────────── */

export function startOfDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Midnight of the Monday in `value`'s week. Weeks in this app are Mon–Sun. */
export function mondayOf(value) {
  const d = startOfDay(value);
  if (!d) return null;
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function addDays(value, count) {
  const d = startOfDay(value);
  if (!d) return null;
  d.setDate(d.getDate() + count);
  return d;
}

const utcMidnight = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole local days from `a` to `b`; negative when `b` precedes `a`. */
export function dayDiff(a, b) {
  if (!a || !b) return 0;
  return Math.round((utcMidnight(b) - utcMidnight(a)) / MS_PER_DAY);
}

export function sameDay(a, b) {
  return dayDiff(a, b) === 0;
}

const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const DAY_LONG = [
  "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const MONTH_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const WEEKEND = (d) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Coerce the several date shapes Firestore holds onto one `Date`.
 *
 * `tanggalMulai` reaches this page as an ISO string from the booking forms
 * (they write the raw `<input type="date">` value), as a `Date` from the
 * Firestore SDK, or as a `Timestamp` if a future writer adds one. Reading
 * them through the same funnel is the difference between a populated board and
 * an empty one.
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  // Bare `YYYY-MM-DD` is parsed by `new Date()` as UTC midnight, which in a
  // negative-offset timezone renders as the *previous* day. Pin it to local.
  if (typeof value === "string") {
    const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (bare) {
      const d = new Date(
        Number(bare[1]),
        Number(bare[2]) - 1,
        Number(bare[3])
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ── Zoom windows ──────────────────────────────────────────────────────── */

export const ZOOMS = [
  { value: 1, label: "24 Jam" },
  { value: 7, label: "7 Hari" },
  { value: 14, label: "14 Hari" },
  { value: 30, label: "30 Hari" },
];

export const DEFAULT_ZOOM = 7;

/**
 * Snap a window start to the containing week.
 *
 * A one-day window is deliberately *not* snapped: "24 Jam" is a today-view, so
 * aligning it to Monday would hide the current day six days out.
 */
export function windowStartFor(startDate, days) {
  if (days <= 1) return startOfDay(startDate);
  return mondayOf(startDate);
}

/** The `days` day objects the board renders, left to right. */
export function buildWindow(startDate, days, now = new Date()) {
  const start = windowStartFor(startDate, days);
  if (!start) return [];
  const today = startOfDay(now);

  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      index: i,
      isToday: sameDay(date, today),
      isWeekend: WEEKEND(date),
      dayShort: DAY_SHORT[(date.getDay() + 6) % 7],
      dayLong: DAY_LONG[(date.getDay() + 6) % 7],
      dayOfMonth: date.getDate(),
      monthShort: MONTH_SHORT[date.getMonth()],
      monthLong: MONTH_LONG[date.getMonth()],
      year: date.getFullYear(),
    };
  });
}

const fmtDate = (d) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;

/**
 * "Minggu Ini: 12 - 18 Okt 2026" — the label on the pager.
 *
 * The month is printed once when both ends fall inside it, which is what the
 * mockup does and what keeps a 7-day label short. It is repeated across a
 * month boundary, where eliding it would leave "29 - 2 Okt" reading as though
 * the week ran backwards.
 */
export function windowLabel(startDate, days) {
  const start = windowStartFor(startDate, days);
  if (!start) return "";
  const end = addDays(start, days - 1);
  if (days <= 1) {
    return `Hari Ini: ${fmtDate(start)} ${start.getFullYear()}`;
  }
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const range = sameMonth
    ? `${start.getDate()} - ${fmtDate(end)}`
    : `${fmtDate(start)} - ${fmtDate(end)}`;
  const spansYears = start.getFullYear() !== end.getFullYear();
  return `Minggu Ini: ${range}${
    spansYears ? ` ${start.getFullYear()} - ${end.getFullYear()}` : ` ${end.getFullYear()}`
  }`;
}

/* ── Fleet categories ──────────────────────────────────────────────────── */

export const CATEGORIES = [
  {
    id: "luxury",
    label: "Luxury Passenger Van",
    hint: "Commuter & Premium",
    keywords: ["hiace", "commuter", "premio", "hino", "kronos", "golden dragon"],
  },
  {
    id: "executive",
    label: "First-Class Executive",
    hint: "Alphard & Vellfire",
    keywords: ["alphard", "vellfire", "v class", "v-class", "viano", "maybach"],
  },
  {
    id: "mpv",
    label: "Family & Business MPV",
    hint: "Innova & Segala Series",
    keywords: ["innova", "xpander", "avanza", "suzuki", "raize", "ignis", "brio"],
  },
  {
    id: "suv",
    label: "SUV & 4x4 All-Terrain",
    hint: "Off-Road & Touring",
    keywords: ["fortuner", "pajero", "terios", "suv", "4x4", "trailblazer", "jeep"],
  },
  { id: "other", label: "Lainnya", hint: "Di luar kategori utama", keywords: [] },
];

export const CATEGORY_ICON = {
  luxury: "airport_shuttle",
  executive: "star",
  mpv: "electric_car",
  suv: "terrain",
  other: "directions_car",
};

/**
 * `mobil` has no category field — CarManagement writes nama, harga, layanan,
 * seats and the amenity flags, and nothing else. The board still has to group
 * rows, so the class is inferred from the model name.
 *
 * The first category in declaration order that matches wins, which makes the
 * order of `CATEGORIES` the precedence table: a hypothetical "Alphard Commuter"
 * lands in `luxury` because the van range is checked before the MPV range.
 */
export function deriveCategory(mobil) {
  const name = String(mobil?.nama || "").toLowerCase();
  if (!name) return CATEGORIES[CATEGORIES.length - 1];
  for (const category of CATEGORIES) {
    if (category.keywords.some((k) => name.includes(k))) return category;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

/* ── Tones ─────────────────────────────────────────────────────────────── */

export const TONES = {
  paid: {
    id: "paid",
    label: "DP 50% Lunas",
    bar: "bg-c57-primary-container text-c57-on-primary",
    meta: "text-c57-primary-fixed-dim",
    dot: "bg-c57-primary-container",
    pill: { variant: "signature" },
  },
  pending: {
    id: "pending",
    label: "Menunggu Pelunasan",
    bar: "bg-c57-tertiary-container text-c57-on-tertiary-container",
    meta: "text-c57-on-tertiary-container",
    dot: "bg-c57-tertiary-container",
    pill: { variant: "sand" },
  },
  driver: {
    id: "driver",
    label: "Bespoke / Private Tour",
    bar: "bg-c57-secondary text-c57-on-secondary",
    meta: "text-c57-secondary-fixed-dim",
    dot: "bg-c57-secondary",
    pill: { variant: "neutral" },
  },
  selfdrive: {
    id: "selfdrive",
    label: "Lepas Kunci",
    bar: "bg-c57-surface-container-highest text-c57-on-surface",
    meta: "text-c57-on-surface-variant",
    dot: "bg-c57-surface-container-highest",
    pill: { variant: "neutral" },
  },
  standby: {
    id: "standby",
    label: "Standby Pool",
    bar: "bg-c57-available-bg text-c57-available-text",
    meta: "text-c57-available-text",
    dot: "bg-c57-available-bg",
    pill: { variant: "available" },
  },
  servis: {
    id: "servis",
    label: "Servis & Detailing",
    bar: "bg-c57-surface-container text-c57-on-surface",
    meta: "text-c57-on-surface-variant",
    dot: "bg-c57-surface-container",
    pill: { variant: "neutral" },
  },
};

/* Booking states that hold the unit. `ditolak`/`dibatalkan` must not appear:
   a cancelled order occupies no days, and leaving it in would paint a bar over
   dates the unit is actually free on. */
const OCCUPYING_STATUS = new Set([
  "diproses",
  "disetujui",
  "disetujui_cash",
  "menunggu pembayaran",
  "menunggu konfirmasi lunas",
  "pembayaran berhasil",
  "disewa",
  "tugas aktif",
  "lunas",
  "selesai",
]);

/**
 * Colour a booking bar.
 *
 * Payment state is the primary axis, because it is what an operator scans for
 * first: anything still owing is sand regardless of how it is being used. Once
 * the money is settled the bar falls back to the rental mode, which is what
 * distinguishes a corporate run from a self-drive hire in the same week.
 */
export function bookingTone(booking) {
  if (!booking) return TONES.standby;
  const status = String(booking.status || "").toLowerCase();
  if (!OCCUPYING_STATUS.has(status)) return TONES.standby;
  if (status === "lunas" || status === "selesai") return TONES.paid;

  const settled =
    status === "pembayaran berhasil" ||
    status === "disewa" ||
    status === "tugas aktif" ||
    String(booking.paymentStatus || "").toLowerCase() === "fully_paid";

  if (!settled) return TONES.pending;

  const rentalType = String(booking.rentalType || "").toLowerCase();
  return rentalType.includes("driver") ? TONES.driver : TONES.selfdrive;
}

/** True when the order holds the unit for any part of `date`. */
export function coversDay(booking, date) {
  if (!booking || !booking._start || !booking._end || !date) return false;
  const offset = dayDiff(booking._start, date);
  return offset >= 0 && offset < dayDiff(booking._start, booking._end);
}

/* ── Occupancy tiling ──────────────────────────────────────────────────── */

export const SEGMENT_KINDS = { booking: "booking", standby: "standby", servis: "servis" };

/**
 * Tile the visible window for one vehicle into contiguous runs.
 *
 * The board renders run-length segments rather than per-day cells so that a
 * three-day booking is one bar spanning three columns — the mockup's whole
 * point. Run-length compression is what makes that cheap: a 30-day window over
 * 14 vehicles is 420 occupancy tests and typically 60 segments.
 *
 * A serviced unit has no recorded service-end date, so it is tiled across the
 * entire window rather than guessed at.
 */
export function buildSegments(mobil, bookings, window) {
  const inService = mobil?.status === "servis";
  const segments = [];

  window.forEach((day, index) => {
    const booking = inService
      ? null
      : (bookings || []).find((b) => coversDay(b, day.date)) || null;
    const kind = inService
      ? SEGMENT_KINDS.servis
      : booking
        ? SEGMENT_KINDS.booking
        : SEGMENT_KINDS.standby;
    const key = booking?.id || null;

    const last = segments[segments.length - 1];
    if (last && last.kind === kind && last.key === key) {
      last.span += 1;
      return;
    }

    segments.push({
      kind,
      key,
      booking,
      startIndex: index,
      span: 1,
      tone: booking ? bookingTone(booking) : TONES[kind],
    });
  });

  return segments;
}

/** One segment per day, for the Grid view's cell matrix. */
export function buildDayCells(mobil, bookings, window) {
  return window.map((day) => {
    if (mobil?.status === "servis") {
      return { day, kind: SEGMENT_KINDS.servis, booking: null, tone: TONES.servis };
    }
    const booking = (bookings || []).find((b) => coversDay(b, day.date)) || null;
    return {
      day,
      kind: booking ? SEGMENT_KINDS.booking : SEGMENT_KINDS.standby,
      booking,
      tone: booking ? bookingTone(booking) : TONES.standby,
    };
  });
}

export function inService(mobil) {
  return mobil?.status === "servis";
}

/** Bookings touching the window, clipped. The 24-hour view still needs this. */
export function bookingsInWindow(bookings, window) {
  if (!bookings || !window || window.length === 0) return [];
  const from = window[0].date;
  const to = addDays(window[window.length - 1].date, 1);
  return bookings.filter(
    (b) => b._start && b._end && b._start < to && b._end > from
  );
}

/* ── Row status ────────────────────────────────────────────────────────── */

const ROW_STATUS = {
  standby: { label: "Standby", pill: "available" },
  active: { label: "On Duty", pill: "signature" },
  ending: { label: "Ending Today", pill: "signature" },
  starting: { label: "Mulai Besok", pill: "outline" },
  servis: { label: "Servis Berkala", pill: "neutral" },
};

/**
 * The row's live badge, read from *today's* occupancy rather than from
 * `mobil.tersedia`.
 *
 * `tersedia` is a single instantaneous boolean, so a unit booked three weeks
 * out is still `tersedia: true` until the hire starts. Deriving the badge from
 * the same day-tiles the bars are drawn from keeps the two halves of the row
 * from contradicting each other.
 */
export function rowStatus(mobil, bookings, today = new Date()) {
  if (inService(mobil)) return { ...ROW_STATUS.servis, icon: "build" };

  const day = startOfDay(today);
  const current = (bookings || []).find((b) => coversDay(b, day));
  if (current) {
    // "Ending Today" only means something when the hire started earlier — a
    // same-day booking that both starts and returns today reads as On Duty.
    const endsToday = sameDay(addDays(current._end, -1), day);
    const startsToday = sameDay(current._start, day);
    if (endsToday && !startsToday) return { ...ROW_STATUS.ending, icon: "hourglass_top" };
    return { ...ROW_STATUS.active, icon: "route" };
  }

  const tomorrow = addDays(day, 1);
  if ((bookings || []).some((b) => coversDay(b, tomorrow))) {
    return { ...ROW_STATUS.starting, icon: "event" };
  }
  return { ...ROW_STATUS.standby, icon: "check_circle" };
}

/* ── Grouping ──────────────────────────────────────────────────────────── */

/** Group fleet rows by derived category, preserving CATEGORIES order. */
export function groupByCategory(mobil) {
  return CATEGORIES.map((category) => ({
    category,
    rows: mobil
      .filter((m) => deriveCategory(m).id === category.id)
      .sort((a, b) => String(a.nama).localeCompare(String(b.nama), "id")),
  })).filter((group) => group.rows.length > 0);
}

/** Normalise an order once so the day tests never re-parse its dates. */
export function normalizeOrder(order) {
  const start = toDate(order.tanggalMulai);
  const end = toDate(order.tanggalSelesai);
  if (!start || !end || end <= start) return null;
  return {
    ...order,
    _start: startOfDay(start),
    _end: startOfDay(end),
    _days: dayDiff(start, end),
  };
}

/**
 * Index normalised orders by the vehicle they hold.
 *
 * Two documents can claim the same unit for overlapping dates — a client
 * booking and an admin manual booking that predates the overlap check, say.
 * Keeping the earlier-created one lets both bars render at their true
 * positions instead of the later one silently vanishing.
 */
export function indexBookingsByVehicle(orders) {
  const map = new Map();
  for (const order of orders || []) {
    const normalized = normalizeOrder(order);
    if (!normalized) continue;
    const list = map.get(normalized.mobilId) || [];
    list.push(normalized);
    map.set(normalized.mobilId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a._start - b._start);
  }
  return map;
}

/* ── KPIs ──────────────────────────────────────────────────────────────── */

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/**
 * Utilisation: booked vehicle-days over operational vehicle-days in the window.
 *
 * Serviced units are excluded from the denominator rather than counted as idle.
 * A unit in the workshop is not spare capacity, and letting it deflate the
 * percentage would make a maintenance backlog look like spare fleet.
 */
export function utilisation(mobil, bookingsByVehicle, window) {
  if (window.length === 0) return 0;
  const operational = mobil.filter((m) => !inService(m));
  if (operational.length === 0) return 0;

  const denominator = operational.length * window.length;
  const numerator = operational.reduce((sum, m) => {
    const days = bookingsInWindow(bookingsByVehicle.get(m.id) || [], window).reduce(
      (n, b) => n + Math.max(0, dayDiff(b._start, b._end)), 0
    );
    return sum + Math.min(days, window.length);
  }, 0);

  return pct(numerator, denominator);
}

const round1 = (n) => Math.round(n * 10) / 10;

/** The five bento tiles. `wow` compares against the preceding equal window. */
export function computeKpis(mobil, bookingsByVehicle, window, now = new Date()) {
  const total = mobil.length;
  const servis = mobil.filter(inService).length;
  const operational = mobil.filter((m) => !inService(m));

  const day = { date: startOfDay(now) };
  const onDuty = operational.filter((m) =>
    (bookingsByVehicle.get(m.id) || []).some((b) => coversDay(b, day.date))
  );
  const ready = operational.filter(
    (m) => !(bookingsByVehicle.get(m.id) || []).some((b) => coversDay(b, day.date))
  );

  const nowUtil = utilisation(mobil, bookingsByVehicle, window);
  const prevWindow = buildWindow(addDays(window[0]?.date || now, -(window.length || 7)), window.length, now);
  const prevUtil = utilisation(mobil, bookingsByVehicle, prevWindow);
  const wow = round1(nowUtil - prevUtil);

  return {
    total,
    onDuty: onDuty.length,
    ready: ready.length,
    servis,
    utilisation: round1(nowUtil),
    onDutyPct: Math.round(pct(onDuty.length, total)),
    readyPct: Math.round(pct(ready.length, total)),
    wow,
  };
}

/* ── Formatting ────────────────────────────────────────────────────────── */

export const rupiah = (value) => `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;

export const formatDateID = (value) => {
  const d = toDate(value);
  if (!d) return "-";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatTimeWIB = (value) => {
  const d = toDate(value);
  if (!d) return "-";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const shortRef = (order) => {
  const code = order?.bookingCode || order?.kodeBooking;
  if (code) return `#${code}`;
  if (order?.id) return `#${String(order.id).slice(0, 8).toUpperCase()}`;
  return "#TANPA-ID";
};

/* ── Export ────────────────────────────────────────────────────────────── */

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function buildScheduleRows(mobil, bookingsByVehicle, window) {
  const inWindow = bookingsInWindow([...bookingsByVehicle.values()].flat(), window);
  const unitById = new Map(mobil.map((m) => [m.id, m]));

  return inWindow
    .map((booking) => {
      const unit = unitById.get(booking.mobilId);
      return {
        Unit: unit?.nama || booking.namaMobil || "-",
        Kategori: deriveCategory(unit).label,
        "No. Pesanan": shortRef(booking),
        Klien: booking.namaClient || "-",
        "Tipe Sewa": booking.rentalType || "-",
        Mulai: formatDateID(booking._start),
        Selesai: formatDateID(booking._end),
        "Durasi (Hari)": booking.durasiHari || booking._days || 0,
        Status: booking.status || "-",
        Pembayaran: booking.paymentStatus || "-",
        DP: booking.dpAmount || 0,
        Total: booking.perkiraanHarga || 0,
      };
    })
    .sort(
      (a, b) =>
        String(a.Mulai).localeCompare(String(b.Mulai)) ||
        String(a.Unit).localeCompare(String(b.Unit))
    );
}

export function toCsv(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\n");
}
