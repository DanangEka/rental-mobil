import {
  computeSyncActions,
  deriveSyncState,
  eventHash,
  isSyncableOrder,
  isSyncableTrip,
  orderEventHash,
  orderEventResource,
  parseSyncKey,
  SYNC_KINDS,
  syncKey,
  tripEventHash,
  tripEventResource,
} from "../utils/calendarSync";

/* Fixed "now": Wednesday 14 October 2026, local time. */
const NOW = new Date(2026, 9, 14, 12, 0, 0);

const order = (over = {}) => ({
  id: "o1",
  uid: "u1",
  email: "klien@example.com",
  namaClient: "Hendra Wijaya",
  namaMobil: "Toyota HiAce Premio",
  platNomor: "L 1957 CK",
  rentalType: "Dengan Driver",
  status: "pembayaran berhasil",
  paymentStatus: "paid_transfer",
  tanggalMulai: "2026-10-16",
  tanggalSelesai: "2026-10-19",
  perkiraanHarga: 2400000,
  dpAmount: 1200000,
  lokasiPenyerahan: "Titik Temu",
  titikTemuAddress: "Bandara Juanda T1",
  ...over,
});

const trip = (over = {}) => ({
  id: "t1",
  judul: "Explore Bromo Midnight",
  destinasi: "Surabaya - Bromo - Malang",
  tanggalBerangkat: "2026-10-20",
  waktuKumpul: "23:30",
  titikKumpul: "Alun-Alun Sidoarjo",
  mobilUtama: "Hiace Premio",
  hargaPerPax: 350000,
  kuotaTerisi: 4,
  kapasitasMaks: 14,
  status: "Tersedia",
  ...over,
});

describe("syncability window", () => {
  test("a future date-only booking is syncable", () => {
    expect(isSyncableOrder(order(), NOW)).toBe(true);
  });

  test("a booking ending yesterday is out of the window", () => {
    expect(
      isSyncableOrder(order({ tanggalMulai: "2026-10-12", tanggalSelesai: "2026-10-13" }), NOW)
    ).toBe(false);
  });

  test("a booking ending today still counts", () => {
    expect(
      isSyncableOrder(order({ tanggalMulai: "2026-10-13", tanggalSelesai: "2026-10-14" }), NOW)
    ).toBe(true);
  });

  test("a booking beyond the horizon is not auto-synced", () => {
    expect(
      isSyncableOrder(order({ tanggalMulai: "2027-12-01", tanggalSelesai: "2027-12-05" }), NOW)
    ).toBe(false);
  });

  test("cancelled and malformed orders never sync", () => {
    expect(isSyncableOrder(order({ status: "dibatalkan" }), NOW)).toBe(false);
    expect(isSyncableOrder(order({ status: "ditolak" }), NOW)).toBe(false);
    expect(isSyncableOrder(order({ tanggalSelesai: "" }), NOW)).toBe(false);
    expect(isSyncableOrder(order({ tanggalSelesai: "2026-10-16" }), NOW)).toBe(false);
    expect(isSyncableOrder(null, NOW)).toBe(false);
  });

  test("open trips follow the departure date", () => {
    expect(isSyncableTrip(trip(), NOW)).toBe(true);
    expect(isSyncableTrip(trip({ tanggalBerangkat: "2026-10-10" }), NOW)).toBe(false);
    expect(isSyncableTrip(trip({ status: "dibatalkan" }), NOW)).toBe(false);
    expect(isSyncableTrip(trip({ tanggalBerangkat: "bad-date" }), NOW)).toBe(false);
  });
});

describe("hashes", () => {
  test("the same booking hashes identically", () => {
    expect(orderEventHash(order())).toBe(orderEventHash(order()));
  });

  test("status, dates and payment changes flip the hash", () => {
    const base = orderEventHash(order());
    expect(orderEventHash(order({ status: "lunas" }))).not.toBe(base);
    expect(orderEventHash(order({ tanggalMulai: "2026-10-17" }))).not.toBe(base);
    expect(orderEventHash(order({ paymentStatus: "fully_paid" }))).not.toBe(base);
  });

  test("trip hashes track departure, gather time and quota", () => {
    const base = tripEventHash(trip());
    expect(tripEventHash(trip())).toBe(base);
    expect(tripEventHash(trip({ waktuKumpul: "00:30" }))).not.toBe(base);
    expect(tripEventHash(trip({ kuotaTerisi: 9 }))).not.toBe(base);
  });

  test("eventHash routes by kind", () => {
    expect(eventHash(SYNC_KINDS.ORDER, order())).toBe(orderEventHash(order()));
    expect(eventHash(SYNC_KINDS.TRIP, trip())).toBe(tripEventHash(trip()));
  });
});

describe("order event resource", () => {
  test("a bare date range becomes an all-day, end-exclusive event", () => {
    const res = orderEventResource(order());
    expect(res.start).toEqual({ date: "2026-10-16" });
    expect(res.end).toEqual({ date: "2026-10-19" });
  });

  test("a range with a time of day becomes a timed event", () => {
    const res = orderEventResource(
      order({ tanggalMulai: "2026-10-16T02:00:00.000Z", tanggalSelesai: "2026-10-19T08:00:00.000Z" })
    );
    expect(res.start.dateTime).toBe("2026-10-16T02:00:00.000Z");
    expect(res.start.timeZone).toBe("Asia/Jakarta");
    expect(res.end.dateTime).toBe("2026-10-19T08:00:00.000Z");
  });

  test("carries the private marker the adoption scan keys on", () => {
    const res = orderEventResource(order());
    expect(res.extendedProperties.private).toEqual({
      c57sync: "1",
      c57: "pemesanan:o1",
    });
  });

  test("summary and description name the client and status", () => {
    const res = orderEventResource(order());
    expect(res.summary).toContain("Hendra Wijaya");
    expect(res.summary).toContain("Toyota HiAce Premio");
    expect(res.description).toContain("Status: pembayaran berhasil");
    expect(res.description).toMatch(/Rp 2[.,]400[.,]000/);
    expect(res.location).toContain("Bandara Juanda T1");
  });

  test("colour follows the booking tone", () => {
    expect(orderEventResource(order()).colorId).toBe("7"); // driver → peacock
    expect(orderEventResource(order({ status: "lunas" })).colorId).toBe("6"); // paid → basil
    expect(
      orderEventResource(order({ status: "menunggu pembayaran", paymentStatus: "pending" })).colorId
    ).toBe("3"); // pending → tangerine
  });
});

describe("open trip event resource", () => {
  test("anchors on the gather time in WIB", () => {
    const res = tripEventResource(trip());
    // 2026-10-20T23:30+07:00
    expect(res.start.dateTime).toBe("2026-10-20T16:30:00.000Z");
    expect(res.start.timeZone).toBe("Asia/Jakarta");
    expect(res.end.dateTime).toBe("2026-10-21T00:30:00.000Z"); // +8h
  });

  test("defaults to 07:00 when the gather time is absent", () => {
    const res = tripEventResource(trip({ waktuKumpul: "" }));
    expect(res.start.dateTime).toBe("2026-10-20T00:00:00.000Z");
  });

  test("titles and marks the event as an open trip", () => {
    const res = tripEventResource(trip());
    expect(res.summary).toBe("Open Trip: Explore Bromo Midnight");
    expect(res.location).toBe("Alun-Alun Sidoarjo");
    expect(res.extendedProperties.private.c57).toBe("open_trips:t1");
    expect(res.description).toContain("Waktu kumpul: 23:30 WIB");
    expect(res.description).toContain("Kuota: 4/14 terisi");
  });
});

describe("computeSyncActions", () => {
  const base = {
    entries: {},
    orders: [],
    trips: [],
    now: NOW,
    docsComplete: true,
  };

  test("creates an event for a new syncable booking", () => {
    const actions = computeSyncActions({ ...base, orders: [order()] });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "upsert", kind: "pemesanan", id: "o1" });
    expect(actions[0].hash).toBe(orderEventHash(order()));
    expect(actions[0].doc.id).toBe("o1");
  });

  test("leaves an up-to-date booking alone", () => {
    const entries = { [syncKey("pemesanan", "o1")]: { eventId: "e1", hash: orderEventHash(order()) } };
    expect(computeSyncActions({ ...base, entries, orders: [order()] })).toHaveLength(0);
  });

  test("patches when the document drifted from the stored hash", () => {
    const entries = { [syncKey("pemesanan", "o1")]: { eventId: "e1", hash: "stale" } };
    const actions = computeSyncActions({ ...base, entries, orders: [order()] });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "upsert" });
  });

  test("deletes the event of a cancelled booking, even a historical one", () => {
    const entries = { [syncKey("pemesanan", "o1")]: { eventId: "e1", hash: "x" } };
    const actions = computeSyncActions({
      ...base,
      entries,
      orders: [order({ status: "dibatalkan" })],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "delete", kind: "pemesanan", id: "o1" });
  });

  test("a cancelled booking with no event is a no-op", () => {
    expect(
      computeSyncActions({ ...base, orders: [order({ status: "dibatalkan" })] })
    ).toHaveLength(0);
  });

  test("past bookings are left alone — no retroactive push, no wipe", () => {
    const past = order({ tanggalMulai: "2026-09-01", tanggalSelesai: "2026-09-05" });
    const withoutEntry = computeSyncActions({ ...base, orders: [past] });
    expect(withoutEntry).toHaveLength(0);

    const entries = { [syncKey("pemesanan", "o1")]: { eventId: "e1", hash: "old" } };
    const withEntry = computeSyncActions({ ...base, entries, orders: [past] });
    expect(withEntry).toHaveLength(0);
  });

  test("removes events whose documents were deleted from Firestore", () => {
    const entries = { [syncKey("pemesanan", "gone")]: { eventId: "e9", hash: "x" } };
    const actions = computeSyncActions({ ...base, entries, orders: [order()] });
    expect(actions).toHaveLength(2);
    expect(actions).toContainEqual(
      expect.objectContaining({ type: "delete", kind: "pemesanan", id: "gone" })
    );
    expect(actions).toContainEqual(
      expect.objectContaining({ type: "upsert", kind: "pemesanan", id: "o1" })
    );
  });

  test("never treats an undelivered snapshot as a deletion", () => {
    const entries = { [syncKey("pemesanan", "gone")]: { eventId: "e9", hash: "x" } };
    const actions = computeSyncActions({
      ...base,
      entries,
      docsComplete: false,
      orders: [order()],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("upsert");
  });

  test("open trips ride the same queue", () => {
    const actions = computeSyncActions({ ...base, trips: [trip()] });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "upsert", kind: "open_trips", id: "t1" });
  });
});

describe("deriveSyncState", () => {
  const connected = { connected: true, entries: {}, pending: {}, errors: {} };

  test("disconnected wins over everything", () => {
    expect(deriveSyncState(SYNC_KINDS.ORDER, order(), { connected: false })).toBe("offline");
  });

  test("syncable doc without an event is pending", () => {
    expect(deriveSyncState(SYNC_KINDS.ORDER, order(), connected)).toBe("pending");
  });

  test("matching hash reads as synced", () => {
    const entries = { [syncKey("pemesanan", "o1")]: { eventId: "e1", hash: orderEventHash(order()) } };
    expect(deriveSyncState(SYNC_KINDS.ORDER, order(), { ...connected, entries })).toBe("synced");
  });

  test("in-flight and failed keys surface as such", () => {
    expect(
      deriveSyncState(SYNC_KINDS.ORDER, order(), {
        ...connected,
        pending: { "pemesanan:o1": true },
      })
    ).toBe("pending");
    expect(
      deriveSyncState(SYNC_KINDS.ORDER, order(), {
        ...connected,
        errors: { "pemesanan:o1": "quota" },
      })
    ).toBe("error");
  });

  test("nothing to sync reads as none", () => {
    expect(
      deriveSyncState(SYNC_KINDS.ORDER, order({ status: "ditolak" }), connected)
    ).toBe("none");
    expect(
      deriveSyncState(
        SYNC_KINDS.ORDER,
        order({ tanggalMulai: "2026-09-01", tanggalSelesai: "2026-09-05" }),
        connected
      )
    ).toBe("none");
  });

  test("an already-pushed out-of-window booking reads as synced, not pending", () => {
    const past = order({ tanggalMulai: "2026-09-01", tanggalSelesai: "2026-09-05" });
    const entries = { [syncKey("pemesanan", "o1")]: { eventId: "e1", hash: "old" } };
    expect(deriveSyncState(SYNC_KINDS.ORDER, past, { ...connected, entries })).toBe("synced");
  });
});

describe("keys", () => {
  test("round-trips kind and id, even when the id holds a colon", () => {
    const key = syncKey("pemesanan", "we:ird");
    expect(key).toBe("pemesanan:we:ird");
    expect(parseSyncKey(key)).toEqual({ kind: "pemesanan", id: "we:ird" });
    expect(parseSyncKey("garbage")).toEqual({ kind: "", id: "" });
  });
});
