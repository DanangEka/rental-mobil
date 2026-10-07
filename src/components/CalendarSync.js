import { useState } from "react";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import { useToast } from "./Toast";
import { useCalendarSync } from "../services/calendarSync";

/**
 * The two Google-Calendar surfaces shared by the admin pages: a connect /
 * status banner, and the per-booking badge that marks a block as synced.
 *
 * Both read through `useCalendarSync`, so several pages can mount them at
 * once without doubling the Firestore listeners — the engine is a singleton.
 */

const BADGE = {
  synced: {
    icon: "event_available",
    color: "text-c57-available-text",
    label: "Tersinkron",
  },
  pending: {
    icon: "sync",
    color: "text-c57-primary",
    label: "Menunggu sinkron",
  },
  error: {
    icon: "warning",
    color: "text-c57-error",
    label: "Sinkron gagal",
  },
  none: {
    icon: "calendar_month",
    color: "text-c57-on-surface-variant",
    label: "Tidak perlu sinkron",
  },
  offline: {
    icon: "calendar_month",
    color: "text-c57-on-surface-variant",
    label: "Belum terhubung",
  },
};

export function syncBadge(state) {
  return BADGE[state] || BADGE.offline;
}

/**
 * Icon (+ optional label) for one document's sync state.
 *
 * `compact` drops the text — used inside the Gantt bars where a label would
 * fight the client name for the few pixels the segment has.
 */
export function CalendarSyncBadge({ state, compact = false, mono = false, className = "" }) {
  const badge = syncBadge(state);
  return (
    <span
      title={badge.label}
      aria-label={badge.label}
      className={`flex items-center gap-1 ${mono ? "text-current" : badge.color} ${className}`}
    >
      <Icon
        name={badge.icon}
        size="sm"
        filled={state === "synced"}
        className={state === "pending" ? "animate-spin" : ""}
      />
      {!compact && (
        <span className="font-label-sm uppercase tracking-wider">{badge.label}</span>
      )}
    </span>
  );
}

/**
 * Connection banner: the "hubungkan / terhubung / gagal" strip shown on the
 * schedule and trip pages. While disconnected it explains the feature in one
 * sentence; while connected it reports totals and offers a manual retry.
 */
export default function CalendarSyncBanner() {
  const toast = useToast();
  const { status, lastError, counts, connect, disconnect, retryFailed } =
    useCalendarSync();
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connect();
      toast.success(
        "Google Calendar terhubung",
        "Jadwal sewa & open trip akan tersinkron otomatis."
      );
    } catch {
      // The engine already surfaced the reason on the banner itself.
    } finally {
      setBusy(false);
    }
  };

  if (status === "starting") {
    return (
      <div className="flex items-center gap-space-sm rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest px-space-md py-space-sm text-body-sm text-c57-on-surface-variant">
        <Icon name="autorenew" size="md" className="animate-spin text-c57-primary" />
        Menyiapkan koneksi Google Calendar…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-c57-lg border border-c57-error-container bg-c57-error-container/30 px-space-md py-space-sm">
        <span className="flex items-center gap-space-sm text-body-sm text-c57-on-surface">
          <Icon name="warning" size="md" className="text-c57-error" />
          {lastError || "Koneksi Google Calendar gagal."}
        </span>
        <Button variant="secondary" size="sm" icon="refresh" onClick={handleConnect} loading={busy}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (status === "connected") {
    const hasErrors = counts.error > 0;
    return (
      <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-c57-lg border border-c57-available-bg/40 bg-c57-available-bg/10 px-space-md py-space-sm">
        <span className="flex flex-wrap items-center gap-space-sm text-body-sm text-c57-on-surface">
          <Icon name="event_available" size="md" className="text-c57-available-text" filled />
          <span className="font-label-sm uppercase tracking-widest text-c57-available-text">
            Google Calendar Terhubung
          </span>
          <span className="text-c57-on-surface-variant">
            {counts.synced} jadwal tersinkron
            {counts.pending > 0 ? ` • ${counts.pending} menunggu` : ""}
          </span>
          {hasErrors && (
            <span className="text-c57-error">
              • {counts.error} gagal
            </span>
          )}
        </span>
        <span className="flex items-center gap-space-sm">
          {hasErrors && (
            <Button variant="secondary" size="sm" icon="refresh" onClick={retryFailed}>
              Coba Lagi
            </Button>
          )}
          <Button variant="ghost" size="sm" icon="close" onClick={disconnect}>
            Putuskan
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest px-space-md py-space-sm">
      <span className="flex items-center gap-space-sm text-body-sm text-c57-on-surface-variant">
        <Icon name="calendar_month" size="md" className="text-c57-primary" />
        Otomatis sinkronkan jadwal sewa &amp; open trip ke Google Calendar Anda.
      </span>
      <Button
        variant="primary"
        size="sm"
        icon="calendar_add_on"
        onClick={handleConnect}
        loading={busy}
      >
        Hubungkan Google Calendar
      </Button>
    </div>
  );
}
