import {
  addDays,
  bookingTone,
  buildDayCells,
  buildScheduleRows,
  buildSegments,
  buildWindow,
  computeKpis,
  coversDay,
  deriveCategory,
  dayDiff,
  groupByCategory,
  indexBookingsByVehicle,
  mondayOf,
  normalizeOrder,
  rowStatus,
  sameDay,
  toDate,
  toCsv,
  utilisation,
  windowLabel,
  windowStartFor,
  TONES,
} from "../utils/jadwalArmada";

/* 2026-10-12 is a Monday, which is what the mockup's week header depicts. */
const MONDAY = "2026-10-12";
const WEDNESDAY = "2026-10-14";
const THURSDAY = "2026-10-15";
const SATURDAY = "2026-10-17";
const SUNDAY = "2026-10-18";
const NEXT_MONDAY = "2026-10-19";

const mobil = (over = {}) => ({
  id: "m1",
  nama: "Toyota HiAce Premio Luxury",
  platNomor: "L 1957 CK",
  seats: 10,
  layanan: "Dengan Driver",
  status: "normal",
  tersedia: true,
  ...over,
});

/** A bare "YYYY-MM-DD" range, the shape the booking forms actually write. */
const order = (over = {}) => ({
  id: "o1",
  mobilId: "m1",
  namaClient: "Hendra Wijaya",
  rentalType: "Dengan Driver",
  status: "pembayaran berhasil",
  paymentStatus: "paid_transfer",
  tanggalMulai: THURSDAY,
  tanggalSelesai: SUNDAY,
  ...over,
});

const normalized = (over) => normalizeOrder(order(over));

/**
 * Local YYYY-MM-DD.
 *
 * `toISOString().slice(0, 10)` is the wrong assertion for a local date: the
 * app runs on Asia/Jakarta, so local midnight is 17:00 the previous day in UTC
 * and every expected value would come back a day early.
 */
const ymd = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ─── Date primitives ─────────────────────────────────────────────────── */

describe("date primitives", () => {
  it("snaps a window start to the containing Monday", () => {
    expect(ymd(mondayOf(THURSDAY))).toBe(MONDAY);
    // Sunday belongs to the week that began the day before, not a new one.
    expect(ymd(mondayOf(SUNDAY))).toBe(MONDAY);
  });

  it("does not snap a 24-hour window, which is a today-view", () => {
    expect(ymd(windowStartFor(THURSDAY, 1))).toBe(THURSDAY);
    expect(ymd(windowStartFor(THURSDAY, 7))).toBe(MONDAY);
    expect(ymd(windowStartFor(THURSDAY, 30))).toBe(MONDAY);
  });

  it("counts whole local days, so a DST day does not shift a bar a column", () => {
    // Jakarta has no DST, but the board is date-arithmetic-generic and a naive
    // millisecond division is off by one on any 23- or 25-hour day.
    expect(dayDiff(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2);
    expect(dayDiff(new Date(2026, 9, 15), new Date(2026, 9, 12))).toBe(-3);
    expect(sameDay(new Date(2026, 9, 15, 23, 59), new Date(2026, 9, 15, 0, 1))).toBe(true);
  });

  it("parses a bare YYYY-MM-DD as local midnight, not UTC midnight", () => {
    // `new Date("2026-10-15")` is UTC midnight, which is the previous day for
    // any negative-offset timezone. Left unhandled the whole bar shifts.
    const parsed = toDate(THURSDAY);
    expect(parsed.getDate()).toBe(15);
    expect(parsed.getMonth()).toBe(9);
  });

  it("accepts Dates, Timestamps and ISO strings alike", () => {
    const expected = 15;
    expect(toDate(new Date(2026, 9, 15)).getDate()).toBe(expected);
    expect(toDate({ toDate: () => new Date(2026, 9, 15) }).getDate()).toBe(expected);
    expect(toDate("2026-10-15T08:30:00.000Z").getDate()).toBe(15);
  });

  it("rejects unusable values instead of producing an Invalid Date", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate("")).toBeNull();
    expect(toDate("bukan tanggal")).toBeNull();
    expect(toDate(new Date("nope"))).toBeNull();
  });
});

/* ─── Windows ─────────────────────────────────────────────────────────── */

describe("buildWindow", () => {
  it("lays out Monday to Sunday for a 7-day view", () => {
    const window = buildWindow(THURSDAY, 7, new Date(2026, 9, 15));
    expect(window).toHaveLength(7);
    expect(window[0].dayShort).toBe("Sen");
    expect(window[6].dayShort).toBe("Min");
    expect(window[3].isToday).toBe(true);
    expect(window[0].isToday).toBe(false);
  });

  it("flags Saturday and Sunday as weekend", () => {
    const window = buildWindow(MONDAY, 7, new Date(2026, 9, 15));
    expect(window.filter((d) => d.isWeekend).map((d) => d.dayShort)).toEqual(["Sab", "Min"]);
  });

  it("paginates forward and back by whole windows", () => {
    const start = windowStartFor(THURSDAY, 7);
    expect(ymd(addDays(start, 7))).toBe(NEXT_MONDAY);
    expect(ymd(addDays(start, -7))).toBe("2026-10-05");
  });

  it("labels the pager the way the mockup does", () => {
    expect(windowLabel(THURSDAY, 7)).toBe("Minggu Ini: 12 - 18 Okt 2026");
    expect(windowLabel(THURSDAY, 1)).toBe("Hari Ini: 15 Okt 2026");
  });
});

/* ─── End-exclusive occupancy ─────────────────────────────────────────── */

describe("occupancy is end-exclusive", () => {
  const booking = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SUNDAY });

  it("occupies the start day but not the return day", () => {
    expect(coversDay(booking, new Date(2026, 9, 15))).toBe(true);
    expect(coversDay(booking, new Date(2026, 9, 16))).toBe(true);
    expect(coversDay(booking, new Date(2026, 9, 17))).toBe(true);
    expect(coversDay(booking, new Date(2026, 9, 18))).toBe(false);
  });

  it("leaves a gap-free handover between two adjacent bookings", () => {
    const first = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SATURDAY });
    const second = normalized({ tanggalMulai: SATURDAY, tanggalSelesai: NEXT_MONDAY });
    // Adjacent and non-overlapping — exactly what createUnitBooking permits,
    // because the return day is free for the next pickup.
    expect(coversDay(first, new Date(2026, 9, 15))).toBe(true);
    expect(coversDay(first, new Date(2026, 9, 16))).toBe(true);
    expect(coversDay(first, new Date(2026, 9, 17))).toBe(false);
    expect(coversDay(second, new Date(2026, 9, 16))).toBe(false);
    expect(coversDay(second, new Date(2026, 9, 17))).toBe(true);
  });

  it("rejects an order with no usable range", () => {
    expect(normalizeOrder({ tanggalMulai: THURSDAY })).toBeNull();
    expect(
      normalizeOrder({ tanggalMulai: SUNDAY, tanggalSelesai: THURSDAY })
    ).toBeNull();
  });
});

/* ─── Segments ────────────────────────────────────────────────────────── */

describe("buildSegments", () => {
  const window = buildWindow(MONDAY, 7, new Date(2026, 9, 15));

  it("emits one run per contiguous stretch of the same occupancy", () => {
    // 15 -> 18 occupies Thu/Fri/Sat and returns on Sunday, so the week is
    // standby | booking | standby rather than a single bar running to the edge.
    const booking = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SUNDAY });
    const segments = buildSegments(mobil(), [booking], window);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ kind: "standby", startIndex: 0, span: 3 });
    expect(segments[1]).toMatchObject({ kind: "booking", startIndex: 3, span: 3 });
    expect(segments[2]).toMatchObject({ kind: "standby", startIndex: 6, span: 1 });
  });

  it("tiles the entire window with no gaps and no overlap", () => {
    const bookings = [
      normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SATURDAY }),
      normalized({ id: "o2", tanggalMulai: SUNDAY, tanggalSelesai: NEXT_MONDAY }),
    ];
    const segments = buildSegments(mobil(), bookings, window);
    const covered = segments.reduce((sum, s) => sum + s.span, 0);
    expect(covered).toBe(window.length);
    expect(segments.map((s) => s.startIndex)).toEqual(
      segments.map((s, i) => i === 0 ? 0 : segments[i - 1].startIndex + segments[i - 1].span)
    );
  });

  it("keeps two back-to-back bookings as two bars, not one merged run", () => {
    const bookings = [
      normalized({ id: "o1", tanggalMulai: MONDAY, tanggalSelesai: WEDNESDAY }),
      normalized({ id: "o2", tanggalMulai: WEDNESDAY, tanggalSelesai: SATURDAY }),
    ];
    const segments = buildSegments(mobil(), bookings, window);
    const bookingSegments = segments.filter((s) => s.kind === "booking");
    expect(bookingSegments).toHaveLength(2);
    expect(bookingSegments[0].key).not.toBe(bookingSegments[1].key);
  });

  it("clips a booking that starts before the window", () => {
    const booking = normalized({ tanggalMulai: "2026-10-01", tanggalSelesai: WEDNESDAY });
    const segments = buildSegments(mobil(), [booking], window);
    const first = segments[0];
    expect(first.kind).toBe("booking");
    expect(first.startIndex).toBe(0);
    expect(first.span).toBe(2);
  });

  it("excludes a booking entirely outside the window", () => {
    const booking = normalized({ tanggalMulai: "2026-11-01", tanggalSelesai: "2026-11-05" });
    const segments = buildSegments(mobil(), [booking], window);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("standby");
  });

  it("tiles a serviced unit across the whole window, ignoring bookings", () => {
    const booking = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SUNDAY });
    const segments = buildSegments(mobil({ status: "servis" }), [booking], window);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("servis");
    expect(segments[0].span).toBe(7);
  });

  it("falls back to standby for a unit with no bookings at all", () => {
    const segments = buildSegments(mobil(), [], window);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ kind: "standby", span: 7, tone: TONES.standby });
  });

  it("builds one cell per day for the Grid view", () => {
    const booking = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SATURDAY });
    const cells = buildDayCells(mobil(), [booking], window);
    expect(cells).toHaveLength(7);
    expect(cells.map((c) => c.kind)).toEqual([
      "standby", "standby", "standby", "booking", "booking", "standby", "standby",
    ]);
  });
});

/* ─── Tones ───────────────────────────────────────────────────────────── */

describe("bookingTone", () => {
  it("reads unsettled bookings as awaiting payment", () => {
    expect(bookingTone({ status: "menunggu pembayaran" })).toBe(TONES.pending);
    expect(bookingTone({ status: "diproses" })).toBe(TONES.pending);
  });

  it("reads a settled driver booking as bespoke", () => {
    expect(
      bookingTone({ status: "pembayaran berhasil", rentalType: "Dengan Driver" })
    ).toBe(TONES.driver);
  });

  it("reads a settled self-drive booking as lepas kunci", () => {
    expect(
      bookingTone({ status: "pembayaran berhasil", rentalType: "Lepas Kunci" })
    ).toBe(TONES.selfdrive);
  });

  it("lets payment state win over rental mode", () => {
    expect(
      bookingTone({ status: "menunggu pembayaran", rentalType: "Dengan Driver" })
    ).toBe(TONES.pending);
  });

  it("treats a completed hire as paid regardless of mode", () => {
    expect(bookingTone({ status: "lunas", rentalType: "Lepas Kunci" })).toBe(TONES.paid);
    expect(bookingTone({ status: "selesai", rentalType: "Dengan Driver" })).toBe(TONES.paid);
  });

  it("never paints a bar over a cancelled order", () => {
    expect(bookingTone({ status: "ditolak" })).toBe(TONES.standby);
    expect(bookingTone({ status: "dibatalkan" })).toBe(TONES.standby);
  });
});

/* ─── Row status ──────────────────────────────────────────────────────── */

describe("rowStatus", () => {
  const today = new Date(2026, 9, 15);

  it("reports standby for a free unit", () => {
    expect(rowStatus(mobil(), [], today)).toMatchObject({ label: "Standby" });
  });

  it("reports On Duty mid-hire", () => {
    const booking = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: NEXT_MONDAY });
    expect(rowStatus(mobil(), [booking], today)).toMatchObject({ label: "On Duty" });
  });

  it("reports Ending Today on the last day out, but not on a same-day hire", () => {
    // 15 -> 17 is out on the 15th and the 16th, and back in the pool on the 17th.
    const ending = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SATURDAY });
    const lastDayOut = new Date(2026, 9, 16);
    expect(rowStatus(mobil(), [ending], lastDayOut)).toMatchObject({ label: "Ending Today" });
    expect(rowStatus(mobil(), [ending], new Date(2026, 9, 15))).toMatchObject({
      label: "On Duty",
    });

    // A 15 -> 16 same-day hire is On Duty all day, never "Ending Today".
    const sameDay = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: "2026-10-16" });
    expect(rowStatus(mobil(), [sameDay], new Date(2026, 9, 15, 8, 0))).toMatchObject({
      label: "On Duty",
    });
  });

  it("reads a serviced unit as service, not as idle", () => {
    expect(rowStatus(mobil({ status: "servis" }), [], today)).toMatchObject({
      label: "Servis Berkala",
    });
  });

  it("prefers today's booking over tomorrow's", () => {
    const current = normalized({ tanggalMulai: THURSDAY, tanggalSelesai: SATURDAY });
    const next = normalized({ id: "o2", tanggalMulai: SATURDAY, tanggalSelesai: NEXT_MONDAY });
    expect(rowStatus(mobil(), [current, next], today)).toMatchObject({ label: "On Duty" });
  });

  it("flags a unit whose hire starts tomorrow", () => {
    // Free today, out from the 16th onward.
    const tomorrow = normalized({ tanggalMulai: "2026-10-16", tanggalSelesai: NEXT_MONDAY });
    expect(coversDay(tomorrow, new Date(2026, 9, 15))).toBe(false);
    expect(coversDay(tomorrow, new Date(2026, 9, 16))).toBe(true);
    expect(rowStatus(mobil(), [tomorrow], today)).toMatchObject({ label: "Mulai Besok" });
  });
});

/* ─── Categories ──────────────────────────────────────────────────────── */

describe("deriveCategory", () => {
  it.each([
    ["Toyota HiAce Premio Luxury", "luxury"],
    ["Toyota HiAce Commuter Standard", "luxury"],
    ["Toyota Alphard Transformer VIP", "executive"],
    ["Toyota Alphard Vellfire Executive", "executive"],
    ["Toyota Innova Zenix Hybrid VIP", "mpv"],
    ["Mitsubishi Xpander Ultimate", "mpv"],
    ["Toyota Fortuner GR Sport 4x4", "suv"],
    ["Mitsubishi Pajero Sport", "suv"],
  ])("groups %s as %s", (nama, expected) => {
    expect(deriveCategory(mobil({ nama })).id).toBe(expected);
  });

  it("falls back rather than dropping an unrecognised unit", () => {
    expect(deriveCategory(mobil({ nama: "Daihatsu Terios X" })).id).toBe("suv");
    expect(deriveCategory(mobil({ nama: "Mobil" })).id).toBe("other");
    expect(deriveCategory({}).id).toBe("other");
  });

  it("keeps every unit in a group, in a stable order", () => {
    const fleet = [
      mobil({ id: "a", nama: "Toyota Innova Zenix" }),
      mobil({ id: "b", nama: "Toyota HiAce Premio" }),
      mobil({ id: "c", nama: "Toyota Alphard" }),
    ];
    const groups = groupByCategory(fleet);
    expect(groups.map((g) => g.category.id)).toEqual(["luxury", "executive", "mpv"]);
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(3);
  });
});

/* ─── Indexing ────────────────────────────────────────────────────────── */

describe("indexBookingsByVehicle", () => {
  it("keys orders by their unit", () => {
    const index = indexBookingsByVehicle([order({ mobilId: "m7" })]);
    expect(index.get("m7")).toHaveLength(1);
  });

  it("drops unusable orders rather than blanking the row", () => {
    const index = indexBookingsByVehicle([{ mobilId: "m1" }, order()]);
    expect(index.get("m1")).toHaveLength(1);
  });

  it("sorts each unit's bookings by start so the earliest renders first", () => {
    const index = indexBookingsByVehicle([
      order({ id: "late", tanggalMulai: SUNDAY, tanggalSelesai: NEXT_MONDAY }),
      order({ id: "early", tanggalMulai: MONDAY, tanggalSelesai: WEDNESDAY }),
    ]);
    expect(index.get("m1").map((b) => b.id)).toEqual(["early", "late"]);
  });
});

/* ─── KPIs ────────────────────────────────────────────────────────────── */

describe("computeKpis", () => {
  const window = buildWindow(MONDAY, 7, new Date(2026, 9, 15));

  it("counts on duty, ready and serviced units from today's occupancy", () => {
    const fleet = [
      mobil({ id: "m1" }),
      mobil({ id: "m2" }),
      mobil({ id: "m3", status: "servis" }),
    ];
    const index = indexBookingsByVehicle([
      order({ mobilId: "m1", tanggalMulai: THURSDAY, tanggalSelesai: SUNDAY }),
    ]);
    const kpis = computeKpis(fleet, index, window, new Date(2026, 9, 15));

    expect(kpis.total).toBe(3);
    expect(kpis.onDuty).toBe(1);
    expect(kpis.ready).toBe(1);
    expect(kpis.servis).toBe(1);
  });

  it("does not divide by zero on an empty fleet", () => {
    const kpis = computeKpis([], new Map(), window);
    expect(kpis).toMatchObject({ total: 0, onDutyPct: 0, readyPct: 0, utilisation: 0 });
  });

  it("measures utilisation in booked vehicle-days over the window", () => {
    // 2 operational units x 7 days = 14; one occupies 3 of them.
    const fleet = [mobil({ id: "m1" }), mobil({ id: "m2" })];
    const index = indexBookingsByVehicle([
      order({ tanggalMulai: THURSDAY, tanggalSelesai: SUNDAY }),
    ]);
    expect(utilisation(fleet, index, window)).toBeCloseTo((3 / 14) * 100, 5);
  });

  it("excludes a serviced unit from the utilisation denominator", () => {
    // 1 operational + 1 serviced: the serviced unit is not spare capacity, so
    // it must not halve the figure. One full-width hire is therefore 100%.
    const fleet = [mobil({ id: "m1" }), mobil({ id: "m2", status: "servis" })];
    const index = indexBookingsByVehicle([
      order({ tanggalMulai: MONDAY, tanggalSelesai: NEXT_MONDAY }),
    ]);
    expect(utilisation(fleet, index, window)).toBeCloseTo(100, 5);
  });

  it("caps a single booking at one window-length, so it cannot exceed 100%", () => {
    const fleet = [mobil({ id: "m1" })];
    const index = indexBookingsByVehicle([
      order({ tanggalMulai: "2026-01-01", tanggalSelesai: "2026-12-31" }),
    ]);
    expect(utilisation(fleet, index, window)).toBeCloseTo(100, 5);
  });

  it("compares against the preceding window of equal length", () => {
    const fleet = [mobil({ id: "m1" }), mobil({ id: "m2" })];
    const index = indexBookingsByVehicle([
      order({ tanggalMulai: MONDAY, tanggalSelesai: NEXT_MONDAY }),
    ]);
    // One of two units is out for the whole week: 7/14 = 50%, against 0% the
    // week before, so the tile reports +50 WoW.
    expect(computeKpis(fleet, index, window, new Date(2026, 9, 15)).utilisation).toBe(50);
    expect(computeKpis(fleet, index, window, new Date(2026, 9, 15)).wow).toBe(50);
  });
});

/* ─── Export ──────────────────────────────────────────────────────────── */

describe("schedule export", () => {
  const window = buildWindow(MONDAY, 7, new Date(2026, 9, 15));

  it("emits one row per in-window booking, earliest first", () => {
    const fleet = [mobil({ id: "m1" })];
    const index = indexBookingsByVehicle([
      order({ id: "b", tanggalMulai: SATURDAY, tanggalSelesai: NEXT_MONDAY }),
      order({ id: "a", tanggalMulai: THURSDAY, tanggalSelesai: SATURDAY }),
      order({ id: "c", mobilId: "m9", tanggalMulai: "2026-12-01", tanggalSelesai: "2026-12-03" }),
    ]);
    const rows = buildScheduleRows(fleet, index, window);
    expect(rows).toHaveLength(2);
    expect(rows[0]["No. Pesanan"]).toBe("#A");
    expect(rows[0].Mulai).toBe("15 Okt 2026");
    expect(rows[0].Selesai).toBe("17 Okt 2026");
  });

  it("headers the CSV and quotes any cell holding a delimiter", () => {
    const fleet = [mobil({ id: "m1" })];
    const index = indexBookingsByVehicle([
      order({ namaClient: 'PT "Telkomsel", Regional' }),
    ]);
    const csv = toCsv(buildScheduleRows(fleet, index, window));
    const [header, ...body] = csv.split("\n");
    expect(header).toContain("No. Pesanan");
    expect(body[0]).toContain('"PT ""Telkomsel"", Regional"');
  });

  it("returns an empty string rather than a lone header for no bookings", () => {
    expect(toCsv(buildScheduleRows([], new Map(), window))).toBe("");
  });
});
