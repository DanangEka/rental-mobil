import { useEffect, useSyncExternalStore } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import {
  deleteEvent,
  getIsSignedIn,
  handleGoogleLogin,
  handleGoogleLogout,
  initGoogleClient,
  listSyncEvents,
  upsertEvent,
} from "./googleCalendar";
import {
  CANCELLED_STATUSES,
  computeSyncActions,
  deriveSyncState,
  eventHash,
  eventResource,
  parseSyncKey,
  SYNC_HORIZON_DAYS,
  SYNC_KINDS,
  syncKey,
} from "../utils/calendarSync";

/**
 * Client-side auto-sync: Firestore → Google Calendar.
 *
 * ## Shape of the thing
 *
 * One module-level engine, shared by every admin page that renders a banner or
 * a badge. It keeps three pieces of state:
 *
 *   entries   `kind:id → { eventId, hash }` in localStorage — what *this*
 *             browser has pushed, and the hash of what it pushed.
 *   pending / errors  transient per-key maps that drive the badges.
 *   docs      the live `pemesanan` and `open_trips` collections.
 *
 * On every snapshot the engine diffs docs against entries
 * (`computeSyncActions`) and drains the resulting queue serially — serial
 * because Google's Calendar API throttles bursts hard, and a booking-heavy
 * Monday snapshot would otherwise blow the quota.
 *
 * ## Why localStorage and not a Firestore field
 *
 * Each admin syncs to *their own* calendar, so the mapping is inherently
 * per-browser. Keeping it out of Firestore means no schema change, no
 * `firestore.rules` change, and no two admins fighting over one
 * `googleEventId` field. The cost is that a new browser starts with no local
 * history — which `adoptExisting` pays off by re-indexing the events already
 * in the calendar (they carry a private `c57:` marker) before the first diff.
 *
 * ## Known limitation (accepted at design time)
 *
 * The engine only runs while an admin has the app open. A booking created
 * while nobody is connected lands in the calendar on the next admin session.
 */

const STORAGE_KEY = "c57.gcal.sync.v1";

const loadEntries = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistEntries = (entries) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("Gagal menyimpan state sinkron kalender:", err);
  }
};

const humanError = (err) => {
  const raw =
    err?.error_description ||
    err?.message ||
    (typeof err === "string" ? err : "") ||
    (err?.result?.error?.message ? err.result.error.message : "") ||
    "Sinkronisasi ke Google Calendar gagal.";
  if (/popup|blocked|denied|access_denied/i.test(raw)) {
    return "Izin Google ditolak atau jendela login diblokir browser.";
  }
  if (/429|quota|rate/i.test(raw)) {
    return "Batas permintaan Google tercapai. Coba lagi sebentar lagi.";
  }
  return raw;
};

class CalendarSyncEngine {
  constructor() {
    this.entries = loadEntries();
    this.listeners = new Set();
    this.docs = { [SYNC_KINDS.ORDER]: [], [SYNC_KINDS.TRIP]: [] };
    this.ready = { [SYNC_KINDS.ORDER]: false, [SYNC_KINDS.TRIP]: false };
    this.pending = {};
    this.errors = {};
    this.status = "idle"; // idle | starting | connected | error
    this.lastError = null;
    this.unsubs = null;
    this.queue = [];
    this.draining = false;
    this.snapshot = this.buildSnapshot();
  }

  /* ── Subscription surface (useSyncExternalStore) ── */

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  buildSnapshot = () => {
    const connected = this.status === "connected";
    const counts = { synced: 0, pending: 0, error: 0, total: 0 };
    for (const kind of [SYNC_KINDS.ORDER, SYNC_KINDS.TRIP]) {
      for (const doc of this.docs[kind]) {
        const state = deriveSyncState(kind, doc, {
          connected,
          entries: this.entries,
          pending: this.pending,
          errors: this.errors,
        });
        if (state === "none" || state === "offline") continue;
        counts.total += 1;
        if (state === "synced") counts.synced += 1;
        else if (state === "error") counts.error += 1;
        else counts.pending += 1;
      }
    }
    return {
      status: this.status,
      lastError: this.lastError,
      entries: this.entries,
      pending: { ...this.pending },
      errors: { ...this.errors },
      counts,
    };
  };

  notify = () => {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((fn) => fn());
  };

  getSyncState = (kind, doc) => {
    const s = this.getSnapshot();
    return deriveSyncState(kind, doc, {
      connected: s.status === "connected",
      entries: s.entries,
      pending: s.pending,
      errors: s.errors,
    });
  };

  /* ── Lifecycle ── */

  /** Called on page mount. Silently resumes a session Google still remembers. */
  restore = async () => {
    if (this.status !== "idle") return;
    this.status = "starting";
    this.notify();
    try {
      await initGoogleClient();
      if (getIsSignedIn()) {
        await this.startSession();
      } else {
        this.status = "idle";
        this.notify();
      }
    } catch (err) {
      console.error("Gagal memulihkan sesi Google Calendar:", err);
      this.status = "error";
      this.lastError = humanError(err);
      this.notify();
    }
  };

  /** Explicit connect. Must be called from a user gesture (button click). */
  connect = async () => {
    if (this.status === "connected") return;
    this.status = "starting";
    this.lastError = null;
    this.notify();
    try {
      await initGoogleClient();
      if (!getIsSignedIn()) await handleGoogleLogin();
      await this.startSession();
    } catch (err) {
      console.error("Gagal terhubung ke Google Calendar:", err);
      this.status = "error";
      this.lastError = humanError(err);
      this.notify();
      throw err;
    }
  };

  disconnect = () => {
    if (this.unsubs) {
      this.unsubs.forEach((fn) => fn && fn());
      this.unsubs = null;
    }
    handleGoogleLogout().catch(() => {});
    this.docs = { [SYNC_KINDS.ORDER]: [], [SYNC_KINDS.TRIP]: [] };
    this.ready = { [SYNC_KINDS.ORDER]: false, [SYNC_KINDS.TRIP]: false };
    this.queue = [];
    this.pending = {};
    this.errors = {};
    this.status = "idle";
    this.lastError = null;
    this.notify();
  };

  /** Clear failed keys and give the diff another go. */
  retryFailed = () => {
    this.errors = {};
    this.notify();
    this.runDiff();
  };

  async startSession() {
    await this.adoptExisting();
    this.subscribeFirestore();
    this.status = "connected";
    this.lastError = null;
    this.notify();
    this.runDiff();
  }

  /**
   * Index the events already sitting in the calendar.
   *
   * Every event this app creates carries `extendedProperties.private.c57 =
   * "kind:id"`. Re-reading them once per session means a second device, a
   * cleared localStorage, or a previous manual "Sync Calendar" click all
   * converge on the existing event instead of forking a duplicate. Adopted
   * entries arrive with `hash: null`, so the first diff patches them into
   * agreement with the document.
   */
  async adoptExisting() {
    const now = Date.now();
    const timeMin = new Date(now - 30 * 86400000).toISOString();
    const timeMax = new Date(
      now + (SYNC_HORIZON_DAYS + 30) * 86400000
    ).toISOString();
    const items = await listSyncEvents(timeMin, timeMax);
    let adopted = 0;
    for (const item of items) {
      const raw = item.extendedProperties && item.extendedProperties.private
        ? item.extendedProperties.private.c57
        : null;
      if (!raw) continue;
      const { kind, id } = parseSyncKey(raw);
      if (!kind || !id) continue;
      const key = syncKey(kind, id);
      if (!this.entries[key]) {
        this.entries[key] = { eventId: item.id, hash: null };
        adopted += 1;
      }
    }
    if (adopted > 0) {
      persistEntries(this.entries);
      console.info(`Kalender: ${adopted} event lama diadopsi.`);
    }
  }

  subscribeFirestore() {
    if (this.unsubs) return;
    const watch = (name) =>
      onSnapshot(
        collection(db, name),
        (snap) => {
          this.docs[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          this.ready[name] = true;
          this.runDiff();
        },
        (err) => console.error(`Gagal subscribe ${name} untuk sinkron kalender:`, err)
      );
    this.unsubs = [
      watch(SYNC_KINDS.ORDER),
      watch(SYNC_KINDS.TRIP),
    ];
  }

  /* ── Queue ── */

  runDiff = () => {
    if (this.status !== "connected") return;
    const docsComplete =
      this.ready[SYNC_KINDS.ORDER] && this.ready[SYNC_KINDS.TRIP];
    const actions = computeSyncActions({
      entries: this.entries,
      orders: this.docs[SYNC_KINDS.ORDER],
      trips: this.docs[SYNC_KINDS.TRIP],
      docsComplete,
    });
    let queued = 0;
    for (const action of actions) {
      if (this.errors[action.key]) continue; // wait for an explicit retry
      if (this.pending[action.key]) continue; // already in flight
      if (this.queue.some((a) => a.key === action.key)) {
        // A newer revision of a queued doc replaces the stale action.
        const i = this.queue.findIndex((a) => a.key === action.key);
        this.queue[i] = action;
        continue;
      }
      this.queue.push(action);
      queued += 1;
    }
    if (queued > 0) this.notify();
    this.drain();
  };

  drain() {
    if (this.draining) return;
    this.draining = true;
    this.drainLoop()
      .catch((err) => console.error("Antrean sinkron kalender berhenti:", err))
      .finally(() => {
        this.draining = false;
        // Hashes may have drifted while the queue was running.
        if (this.status === "connected") this.runDiff();
      });
  }

  async drainLoop() {
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      // eslint-disable-next-line no-await-in-loop
      await this.execute(action);
    }
  }

  async execute(action) {
    const key = action.key;
    this.pending[key] = true;
    delete this.errors[key];
    this.notify();
    try {
      if (action.type === "delete") {
        const entry = this.entries[key];
        if (entry && entry.eventId) await deleteEvent(entry.eventId);
        delete this.entries[key];
      } else {
        const resource = eventResource(action.kind, action.doc);
        const entry = this.entries[key];
        const res = await upsertEvent(entry && entry.eventId, resource);
        this.entries[key] = {
          eventId: res.id,
          hash: action.hash || eventHash(action.kind, action.doc),
          updatedAt: Date.now(),
        };
      }
      persistEntries(this.entries);
    } catch (err) {
      console.error(`Sinkron kalender gagal (${key}):`, err);
      this.errors[key] = humanError(err);
    } finally {
      delete this.pending[key];
      this.notify();
    }
  }

  /**
   * Manual push for one document — the per-row "Sync Calendar" button.
   *
   * Bypasses the auto-sync window (an operator may deliberately want a
   * historical order on their calendar) but still refuses cancelled orders,
   * whose event should not exist at all.
   */
  syncNow = async (kind, doc) => {
    if (!doc || !doc.id) throw new Error("Dokumen tidak valid.");
    const status = cleanStatus(doc.status);
    if (CANCELLED_STATUSES.has(status)) {
      throw new Error("Pesanan yang dibatalkan tidak bisa disinkronkan.");
    }
    if (this.status !== "connected") await this.connect();
    const key = syncKey(kind, doc.id);
    const hash = eventHash(kind, doc);
    await this.execute({ type: "upsert", kind, id: doc.id, key, hash, doc });
    if (this.errors[key]) throw new Error(this.errors[key]);
  };
}

const cleanStatus = (s) => String(s || "").toLowerCase();

export const calendarSync = new CalendarSyncEngine();

/**
 * React binding. Restores a remembered Google session on mount and re-renders
 * the component whenever engine state changes.
 */
export function useCalendarSync() {
  const snap = useSyncExternalStore(
    calendarSync.subscribe,
    calendarSync.getSnapshot
  );

  useEffect(() => {
    calendarSync.restore();
  }, []);

  return {
    status: snap.status,
    lastError: snap.lastError,
    counts: snap.counts,
    entries: snap.entries,
    connected: snap.status === "connected",
    connect: calendarSync.connect,
    disconnect: calendarSync.disconnect,
    retryFailed: calendarSync.retryFailed,
    syncNow: calendarSync.syncNow,
    getSyncState: calendarSync.getSyncState,
  };
}
