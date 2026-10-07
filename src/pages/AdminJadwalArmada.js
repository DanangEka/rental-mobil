import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { createUnitBooking } from "../services/bookingService";
import { useCalendarSync } from "../services/calendarSync";
import CalendarSyncBanner, { CalendarSyncBadge } from "../components/CalendarSync";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";

import {
  addDays,
  bookingTone,
  buildDayCells,
  buildScheduleRows,
  buildSegments,
  buildWindow,
  CATEGORIES,
  CATEGORY_ICON,
  computeKpis,
  deriveCategory,
  formatDateID,
  formatTimeWIB,
  groupByCategory,
  indexBookingsByVehicle,
  inService,
  rupiah,
  rowStatus,
  shortRef,
  TONES,
  toCsv,
  windowLabel,
  windowStartFor,
  ZOOMS,
  DEFAULT_ZOOM,
} from "../utils/jadwalArmada";

/**
 * Timeline & Kalender Ketersediaan Armada.
 *
 * The operational counterpart to CarManagement: that page owns a unit's
 * identity, price and service state, this one answers "where is every vehicle
 * on any given day, and who has it".
 *
 * ## Two sources, deliberately not joined in Firestore
 *
 * The board reads `mobil` for the rows and `pemesanan` for the bars. It does
 * *not* use the `mobil/{id}/bookings` subcollection that `bookingService`
 * maintains for the overlap check, because that subcollection stores bare
 * date ranges with no client, price or status — an operator opening this page
 * needs to know *who* has the car, and reading it from two collections in
 * lockstep would be a cross-collection join Firestore cannot do in one query.
 * `pemesanan` alone is a single-collection read, which is also why this page
 * costs two subscriptions rather than one per vehicle.
 *
 * ## Writing a manual allocation
 *
 * A manual booking runs `createUnitBooking` first, then writes the `pemesanan`
 * document that carries the client detail, then releases the unit. The order
 * matters: the overlap check has to run against the lock, not against a
 * document that does not exist yet. If the second write fails the first is
 * rolled back — otherwise a failed save would leave a unit silently blocked
 * for dates no order references, and the calendar would show a bar with nothing
 * behind it.
 *
 * It does *not* write `mobil.tersedia: false`. `tersedia` is the instantaneous
 * flag every other page reads to mean "not out on a hire right now", and an
 * allocation starting three weeks out must not flip it today. Every other
 * surface keeps flipping it when the hire actually begins.
 */

const TODAY_LABEL = () => `Hari Ini (${formatDateID(new Date())})`;

/** Compact the whole board onto one horizontally-scrolling canvas. */
const boardWidth = (days) => Math.min(1800, Math.max(920, 320 + days * 88));

/** Local YYYY-MM-DD, for the export filename. */
const ymd = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ── Manual-booking form ───────────────────────────────────────────────── */

const EMPTY_FORM = {
  mobilId: "",
  namaClient: "",
  telepon: "",
  rentalType: "Dengan Driver",
  driverId: "",
  mulai: "",
  selesai: "",
  paymentStatus: "pending",
  dpAmount: "",
  lokasiPenyerahan: "",
};

const toInputValue = (date) => {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/* ── Sub-components ───────────────────────────────────────────────────── */

/**
 * Bento KPI tile.
 *
 * `StatCard` carries a signed trend, but this tile's fifth slot is a progress
 * bar over a percentage rather than a delta, and the mockup sets all five in
 * one row where the bar would otherwise be a second line of text.
 */
function KpiTile({ label, value, unit, icon, tone, accent, className = "", children }) {
  return (
    <div
      className={`flex flex-col justify-between gap-space-md rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-space-md shadow-c57-card ${className}`}
    >
      <div className="flex items-center justify-between gap-space-sm text-c57-on-surface-variant">
        <span className="font-label-sm uppercase tracking-widest">{label}</span>
        {icon && (
          <span className={accent || tone || "text-c57-primary"}>
            <Icon name={icon} size="lg" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-space-xs">
        <span
          className={`font-headline-md text-headline-md tabular-nums ${
            accent || tone || "text-c57-on-surface"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-body-sm text-c57-on-surface-variant">{unit}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Legend({ tones }) {
  return (
    <div className="flex flex-wrap items-center gap-x-space-lg gap-y-space-sm rounded-c57-md bg-c57-surface-container-low px-space-md py-2 text-body-sm text-c57-on-surface-variant">
      <span className="font-label-sm uppercase tracking-widest text-c57-on-surface">
        Keterangan
      </span>
      {tones.map((tone) => (
        <span key={tone.id} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-full ${tone.dot}`} aria-hidden="true" />
          {tone.label}
        </span>
      ))}
    </div>
  );
}

function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full bg-c57-surface-container p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={[
              "px-3 py-1.5 rounded-full font-label-sm uppercase tracking-wider transition-colors",
              "flex items-center gap-1.5 whitespace-nowrap",
              active
                ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                : "text-c57-on-surface-variant hover:text-c57-on-surface",
            ].join(" ")}
          >
            {option.icon && <Icon name={option.icon} size="sm" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The vehicle identity cell on the left of every row. */
function VehicleCell({ unit, status, bookings }) {
  const category = deriveCategory(unit);
  return (
    <div className="flex items-center justify-between gap-space-sm p-space-md">
      <div className="flex min-w-0 items-center gap-space-sm">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-c57-md ${
            inService(unit)
              ? "bg-c57-surface-container-highest text-c57-secondary"
              : "bg-c57-surface-container text-c57-primary"
          }`}
        >
          <Icon name={CATEGORY_ICON[category.id]} size="2xl" />
        </span>
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-headline-sm text-body-md text-c57-on-surface">
              {unit.nama}
            </h4>
            <Pill variant={status.pill} icon={status.icon}>
              {status.label}
            </Pill>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-space-xs text-body-sm text-c57-on-surface-variant">
            <span className="font-bold text-c57-on-surface">
              {unit.platNomor || "Tanpa Plat"}
            </span>
            <span aria-hidden="true">•</span>
            <span>{unit.seats ? `${unit.seats} Seat` : "Kapasitas —"}</span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-0.5">
              <Icon name={unit.layanan === "Dengan Driver" ? "person" : "vpn_key"} size="xs" />
              {unit.layanan || "Lepas Kunci"}
            </span>
            {bookings > 0 && (
              <span className="text-c57-primary">• {bookings} alokasi</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** One run-length segment, as a bar spanning `span` grid columns. */
function SegmentBar({ segment, days, onSelect, selected, syncState }) {
  const { tone, booking, kind, span } = segment;
  const wide = span >= 2;

  const style = { gridColumn: `${segment.startIndex + 1} / span ${span}` };

  if (kind === "standby") {
    return (
      <div
        style={style}
        className="mx-1 flex items-center justify-center rounded-c57-md bg-c57-available-bg px-2 font-label-sm uppercase tracking-wider text-c57-available-text"
      >
        {span >= 2 && (
          <span className="flex items-center gap-1.5 truncate">
            <Icon name="check_circle" size="sm" />
            {span === days ? "Tersedia Sepanjang Periode" : "Standby Siap Sewa"}
          </span>
        )}
      </div>
    );
  }

  if (kind === "servis") {
    return (
      <div
        style={style}
        className="mx-1 flex flex-col justify-center gap-1 overflow-hidden rounded-c57-md border border-c57-outline-variant bg-c57-surface-container p-2.5"
      >
        <p className="flex items-center gap-1.5 font-label-sm uppercase tracking-wider text-c57-secondary">
          <Icon name="build" size="sm" />
          Servis Rutin
        </p>
        {wide && (
          <p className="truncate text-body-sm text-c57-on-surface">
            Unit tidak di-operation — maintenance berkala
          </p>
        )}
      </div>
    );
  }

  const isSelected = selected === booking.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(booking)}
      aria-pressed={isSelected}
      style={style}
      className={[
        "mx-1 z-10 flex flex-col justify-between gap-1 overflow-hidden rounded-c57-md p-2.5 text-left",
        tone.bar,
        isSelected
          ? "ring-2 ring-c57-primary ring-offset-2 ring-offset-c57-surface-container-low"
          : "shadow-c57-card hover:shadow-c57-card-hover",
        "transition-shadow duration-300 ease-editorial cursor-pointer",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-space-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-label-sm uppercase tracking-wider">
            {shortRef(booking)}
          </span>
          {syncState && <CalendarSyncBadge state={syncState} compact mono />}
        </span>
        {wide && (
          <span className="shrink-0 rounded bg-c57-scrim/25 px-1.5 py-0.5 text-label-sm">
            {formatTimeWIB(booking.tanggalMulai)} → {formatTimeWIB(booking.tanggalSelesai)}
          </span>
        )}
      </div>
      <span className="truncate text-body-sm font-semibold">
        {booking.namaClient || "Pemesanan tanpa nama"}
      </span>
      {wide && (
        <span className="flex items-center justify-between gap-space-xs text-label-sm">
          <span className="truncate">{booking.rentalType || "Lepas Kunci"}</span>
          <span className="shrink-0 underline underline-offset-2">Lihat Detail →</span>
        </span>
      )}
    </button>
  );
}

/** The Grid view's per-day cell matrix. */
function DayCells({ cells, onSelect, selected }) {
  return (
    <>
      {cells.map((cell) => {
        const isSelected = cell.booking && selected === cell.booking.id;
        return (
          <button
            key={cell.day.index}
            type="button"
            disabled={!cell.booking}
            onClick={() => cell.booking && onSelect(cell.booking)}
            title={
              cell.booking
                ? `${shortRef(cell.booking)} · ${cell.booking.namaClient || "-"}`
                : cell.kind === "servis"
                  ? "Servis berkala"
                  : "Standby"
            }
            className={[
              "mx-0.5 h-full min-h-10 rounded-c57-sm",
              cell.tone.dot,
              isSelected ? "ring-2 ring-c57-primary ring-offset-1" : "",
              cell.booking ? "cursor-pointer hover:opacity-80" : "cursor-default",
            ].join(" ")}
            aria-label={
              cell.booking
                ? `${cell.day.dayLong} ${cell.day.dayOfMonth} ${cell.day.monthLong}: ${shortRef(
                    cell.booking
                  )}`
                : `${cell.day.dayLong} ${cell.day.dayOfMonth} ${cell.day.monthLong}: ${
                    cell.kind === "servis" ? "servis" : "standby"
                  }`
            }
          />
        );
      })}
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function AdminJadwalArmada() {
  const toast = useToast();
  const navigate = useNavigate();
  const { status: syncStatus, getSyncState, syncNow } = useCalendarSync();
  const calConnected = syncStatus === "connected";
  const [syncingSelected, setSyncingSelected] = useState(false);

  /** `null` while disconnected — badges only appear on a live connection. */
  const syncStateFor = (doc) =>
    calConnected ? getSyncState("pemesanan", doc) : null;

  const [mobil, setMobil] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState(DEFAULT_ZOOM);
  const [startDate, setStartDate] = useState(() => new Date());
  const [view, setView] = useState("gantt");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Realtime reads ── */

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        collection(db, "mobil"),
        (snap) => {
          setMobil(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (error) => {
          console.error("Gagal subscribe mobil:", error);
          toast.error("Gagal memuat data armada.");
          setLoading(false);
        }
      ),
      onSnapshot(
        collection(db, "pemesanan"),
        (snap) => {
          setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (error) => console.error("Gagal subscribe pemesanan:", error)
      ),
      onSnapshot(
        query(collection(db, "users"), where("role", "==", "driver")),
        (snap) => setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (error) => console.warn("Gagal subscribe driver:", error)
      ),
    ];
    return () => unsubs.forEach((fn) => fn && fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeline = useMemo(() => buildWindow(startDate, days), [startDate, days]);
  const bookingsByVehicle = useMemo(() => indexBookingsByVehicle(orders), [orders]);

  const visibleMobil = useMemo(
    () => (categoryId === "all" ? mobil : mobil.filter((m) => deriveCategory(m).id === categoryId)),
    [mobil, categoryId]
  );
  const groups = useMemo(() => groupByCategory(visibleMobil), [visibleMobil]);

  const kpis = useMemo(
    () => computeKpis(mobil, bookingsByVehicle, timeline),
    [mobil, bookingsByVehicle, timeline]
  );

  /**
   * Only the tones actually present earn a legend entry.
   *
   * Derived from the same per-day cells the board draws, so a legend can never
   * advertise a colour that has no bar behind it — a fixed six-item legend
   * would show "Open Trip Reguler" on a fleet that has no open trips.
   */
  const activeTones = useMemo(() => {
    const seen = new Set();
    for (const unit of visibleMobil) {
      if (inService(unit)) {
        seen.add(TONES.servis.id);
        continue;
      }
      const cells = buildDayCells(
        unit,
        bookingsByVehicle.get(unit.id) || [],
        timeline
      );
      const booked = cells.filter((c) => c.booking);
      if (booked.length === 0) seen.add(TONES.standby.id);
      else booked.forEach((c) => seen.add(c.tone.id));
    }
    return Object.values(TONES).filter((t) => seen.has(t.id));
  }, [visibleMobil, bookingsByVehicle, timeline]);

  const selected = useMemo(
    () => (selectedId ? orders.find((o) => o.id === selectedId) : null),
    [orders, selectedId]
  );
  const selectedUnit = selected
    ? mobil.find((m) => m.id === selected.mobilId) || null
    : null;
  const selectedDriver = selected?.driverId
    ? drivers.find((d) => d.id === selected.driverId) || null
    : null;

  /* ── Window controls ── */

  const shift = useCallback(
    (direction) => {
      const step = days <= 1 ? 1 : days;
      setStartDate((prev) => addDays(windowStartFor(prev, days), direction * step));
    },
    [days]
  );

  const changeZoom = useCallback((value) => {
    setDays(value);
    setStartDate(new Date());
  }, []);

  const resetToToday = useCallback(() => setStartDate(new Date()), []);

  const selectBooking = useCallback((booking) => {
    setSelectedId((prev) => (prev === booking.id ? null : booking.id));
  }, []);

  /* ── Export ── */

  const handleExport = useCallback(() => {
    const rows = buildScheduleRows(visibleMobil, bookingsByVehicle, timeline);
    if (rows.length === 0) {
      toast.warning("Tidak ada jadwal pada periode ini untuk diekspor.");
      return;
    }
    const blob = new Blob(["﻿" + toCsv(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Jadwal_Armada_${ymd(timeline[0].date)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Ekspor jadwal selesai", `${rows.length} alokasi diekspor ke CSV.`);
  }, [visibleMobil, bookingsByVehicle, timeline, toast]);

  /* ── Manual allocation ── */

  const openModal = useCallback(() => {
    const firstFree = visibleMobil.find(
      (m) => !inService(m) && !(bookingsByVehicle.get(m.id) || []).length
    );
    setForm({ ...EMPTY_FORM, mobilId: firstFree?.id || visibleMobil[0]?.id || "" });
    setModalOpen(true);
  }, [visibleMobil, bookingsByVehicle]);

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalOpen(false);
  }, [saving]);

  const handleSave = useCallback(async () => {
    if (!form.mobilId) {
      toast.warning("Pilih unit armada terlebih dahulu.");
      return;
    }
    if (!form.namaClient.trim()) {
      toast.warning("Nama klien wajib diisi.");
      return;
    }
    if (!form.mulai || !form.selesai) {
      toast.warning("Isi waktu mulai dan selesai sewa.");
      return;
    }

    const start = new Date(form.mulai);
    const end = new Date(form.selesai);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error("Rentang tanggal tidak valid", "Waktu selesai harus setelah waktu mulai.");
      return;
    }

    const unit = mobil.find((m) => m.id === form.mobilId);
    const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const total = durasiHari * (Number(unit?.harga) || 0);
    const dp =
      form.paymentStatus === "pending" ? 0 : Number(form.dpAmount) || Math.round(total * 0.5);

    if (form.paymentStatus !== "pending" && dp < total * 0.5) {
      toast.warning(`Nominal DP minimal 50% (${rupiah(total * 0.5)})`);
      return;
    }

    setSaving(true);
    let bookingDocId = null;
    try {
      // Lock the range first: createUnitBooking is the only thing standing
      // between this allocation and a double-booking, and it has nothing to
      // check against until it exists.
      bookingDocId = await createUnitBooking(
        form.mobilId,
        start,
        end,
        "manual_offline",
        ""
      );

      const orderRef = await addDoc(collection(db, "pemesanan"), {
        mobilId: form.mobilId,
        bookingId: bookingDocId,
        namaMobil: unit?.nama || "",
        platNomor: unit?.platNomor || "",
        tanggal: new Date().toISOString(),
        tanggalMulai: start.toISOString(),
        tanggalSelesai: end.toISOString(),
        durasiHari,
        hargaPerhari: Number(unit?.harga) || 0,
        perkiraanHarga: total,
        rentalType: form.rentalType,
        status:
          form.paymentStatus === "pending" ? "menunggu pembayaran" : "pembayaran berhasil",
        paymentStatus:
          form.paymentStatus === "pending" ? "pending" : "paid_transfer",
        paymentMethod: "Transfer",
        namaClient: form.namaClient.trim(),
        telepon: form.telepon.trim(),
        driverId: form.rentalType === "Dengan Driver" ? form.driverId || null : null,
        dpAmount: dp,
        lokasiPenyerahan: form.lokasiPenyerahan.trim() || "Ambil di Garasi",
        isManualSewa: true,
      });

      if (form.paymentStatus !== "pending" && form.telepon.trim()) {
        InvoiceGenerator.generateDPInvoice(
          {
            ...form,
            id: orderRef.id,
            namaMobil: unit?.nama,
            platNomor: unit?.platNomor,
            durasiHari,
            perkiraanHarga: total,
            dpAmount: dp,
            tanggalMulai: start.toISOString(),
            tanggalSelesai: end.toISOString(),
          },
          {
            nama: form.namaClient.trim(),
            nomorTelepon: form.telepon.trim(),
            email: "",
          }
        );
      }

      setSelectedId(orderRef.id);
      toast.success("Alokasi tersimpan", `${unit?.nama} dikunci ${formatDateID(start)}.`);
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (error) {
      console.error("Gagal menyimpan alokasi:", error);
      // Roll the lock back: a unit blocked for dates no order references is a
      // ghost booking the operator cannot see or clear from this page.
      if (bookingDocId) {
        try {
          await deleteDoc(doc(db, "mobil", form.mobilId, "bookings", bookingDocId));
        } catch (rollbackError) {
          console.error("Gagal rollback booking lock:", rollbackError);
        }
      }
      toast.error("Gagal menyimpan alokasi", error.message || "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }, [form, mobil, toast]);

  /* ── Inspector actions ── */

  const sendReminder = useCallback(() => {
    if (!selected) return;
    const phone = String(selected.telepon || "").replace(/[^0-9]/g, "");
    if (!phone) {
      toast.warning("Nomor WhatsApp klien tidak tersedia pada pesanan ini.");
      return;
    }
    const message = [
      `Halo ${selected.namaClient || "Bapak/Ibu"},`,
      "",
      `Mengingat sewa unit ${selected.namaMobil || "Cakra Lima Tujuh"}:`,
      `• ${formatDateID(selected.tanggalMulai)} — ${formatDateID(selected.tanggalSelesai)}`,
      `• Total: ${rupiah(selected.perkiraanHarga)}`,
      `• DP diterima: ${rupiah(selected.dpAmount)}`,
      "",
      "Konfirmasiwana di embarkasi. Terima kasih.",
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }, [selected, toast]);

  const printOrder = useCallback(() => {
    if (!selected) return;
    InvoiceGenerator.generateDPInvoice(selected, {
      nama: selected.namaClient,
      email: selected.email,
      nomorTelepon: selected.telepon,
    });
  }, [selected]);

  const syncSelectedToCalendar = useCallback(async () => {
    if (!selected) return;
    setSyncingSelected(true);
    try {
      await syncNow("pemesanan", selected);
      toast.success(
        "Tersinkron ke Google Calendar",
        `${shortRef(selected)} tersimpan di kalender Anda.`
      );
    } catch (error) {
      toast.error(
        "Gagal sinkronisasi",
        error?.message || "Pastikan Anda sudah terhubung ke Google."
      );
    } finally {
      setSyncingSelected(false);
    }
  }, [selected, syncNow, toast]);

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-space-lg px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Manajemen Operasional Armada • Jadwal Real-Time"
          title="Timeline & Kalender Ketersediaan Armada"
          subtitle="Pantau alokasi unit kendaraan, status pembayaran, penugasan driver, dan jadwal servis berkala secara visual."
          actions={
            <>
              <Button variant="primary" icon="add_circle" onClick={openModal}>
                Input Jadwal / Booking
              </Button>
              <Button variant="secondary" icon="file_download" onClick={handleExport}>
                Ekspor Jadwal
              </Button>
            </>
          }
        />

        {/* ── Google Calendar connection ── */}
        <CalendarSyncBanner />

        {/* ── KPI bento ── */}
        <div className="grid grid-cols-2 gap-space-sm md:grid-cols-5">
          <KpiTile
            label="Total Armada"
            value={kpis.total}
            unit="Unit Terdaftar"
            icon="directions_car"
          />
          <KpiTile
            label="Sedang Bertugas"
            value={kpis.onDuty}
            unit={`On Duty (${kpis.onDutyPct}%)`}
            icon="route"
            accent="text-c57-primary"
          />          <KpiTile
            label="Ready di Pool"
            value={kpis.ready}
            unit="Standby"
            icon="local_parking"
            accent="text-c57-available-text"
          />
          <KpiTile
            label="Servis / Rawat"
            value={kpis.servis}
            unit="Dalam Perawatan"
            icon="build"
            accent="text-c57-secondary"
          />
          <KpiTile
            label="Utilisasi Armada"
            value={`${kpis.utilisation}%`}
            className="col-span-2 md:col-span-1"
            icon="trending_up"
            accent="text-c57-primary"
          >
            <div className="flex items-center gap-space-sm">
              <div
                role="progressbar"
                aria-valuenow={kpis.utilisation}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Utilisasi armada"
                className="h-2 flex-1 overflow-hidden rounded-full bg-c57-surface-container-high"
              >
                <div
                  className="h-full rounded-full bg-c57-primary-container transition-all duration-500 ease-editorial"
                  style={{ width: `${Math.min(100, kpis.utilisation)}%` }}
                />
              </div>
              <span
                className={`shrink-0 font-label-sm tabular-nums ${
                  kpis.wow >= 0 ? "text-c57-available-text" : "text-c57-on-error-container"
                }`}
              >
                {kpis.wow >= 0 ? "+" : ""}
                {kpis.wow}% WoW
              </span>
            </div>
          </KpiTile>
        </div>

        {/* ── Toolbar ── */}
        <Card className="flex flex-col gap-space-md p-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="inline-flex items-center gap-1 rounded-full bg-c57-surface-container p-1">
                <button
                  type="button"
                  onClick={() => shift(-1)}
                  aria-label="Periode sebelumnya"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-c57-on-surface transition-colors hover:bg-c57-surface-container-lowest"
                >
                  <Icon name="chevron_left" size="lg" />
                </button>
                <span className="flex items-center gap-space-xs px-space-md font-label-sm uppercase tracking-widest text-c57-on-surface">
                  <Icon name="event" size="md" className="text-c57-primary" />
                  <span className="hidden sm:inline">{windowLabel(startDate, days)}</span>
                  <span className="sm:hidden">
                    {windowLabel(startDate, days).replace("Minggu Ini: ", "")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => shift(1)}
                  aria-label="Periode berikutnya"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-c57-on-surface transition-colors hover:bg-c57-surface-container-lowest"
                >
                  <Icon name="chevron_right" size="lg" />
                </button>
              </div>

              <button
                type="button"
                onClick={resetToToday}
                className="rounded-full bg-c57-surface-container px-3.5 py-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant transition-colors hover:bg-c57-surface-container-high hover:text-c57-on-surface"
              >
                {TODAY_LABEL()}
              </button>

              <div className="min-w-52">
                <Select
                  label="Filter kategori armada"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="all">
                    Semua Kategori ({visibleMobil.length === mobil.length ? mobil.length : visibleMobil.length} Unit)
                  </option>
                  {CATEGORIES.map((c) => {
                    const count = mobil.filter((m) => deriveCategory(m).id === c.id).length;
                    if (!count) return null;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.label} ({count})
                      </option>
                    );
                  })}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="hidden sm:block">
                <SegmentedControl
                  label="Zoom waktu"
                  options={ZOOMS}
                  value={days}
                  onChange={changeZoom}
                />
              </div>
              <SegmentedControl
                label="Mode tampilan"
                options={[
                  { value: "gantt", label: "Gantt", icon: "view_timeline" },
                  { value: "grid", label: "Grid", icon: "calendar_view_month" },
                ]}
                value={view}
                onChange={setView}
              />
            </div>
          </div>

          <Legend tones={activeTones} />
        </Card>

        {/* ── Matrix ── */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-space-xl text-center text-body-md text-c57-on-surface-variant">
              Memuat jadwal armada…
            </div>
          ) : groups.length === 0 ? (
            <div className="p-space-lg">
              <EmptyState
                icon="directions_car"
                title="Belum ada armada"
                description="Tambahkan unit di Manajemen Armada untuk mulai menyusun timeline ketersediaan."
                action="Kelola Armada"
                onAction={() => navigate("/car-management")}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: boardWidth(days) }}>
                {/* Column header */}
                <div className="grid grid-cols-1 border-b border-c57-surface-variant bg-c57-surface-container-high lg:grid-cols-12">
                  <div className="flex items-center justify-between gap-space-sm px-space-md py-3 lg:col-span-4">
                    <span className="flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface">
                      <Icon name="directions_car" size="lg" className="text-c57-primary" />
                      Unit Armada &amp; Penugasan Driver
                    </span>
                    <span className="text-label-sm text-c57-on-surface-variant">
                      {visibleMobil.length} aktif
                    </span>
                  </div>
                  <div
                    className="hidden lg:col-span-8 lg:grid"
                    style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
                  >
                    {timeline.map((day) => (
                      <div
                        key={day.index}
                        className={`flex flex-col items-center rounded-c57-md py-1 text-center ${
                          day.isToday ? "bg-c57-primary text-c57-on-primary" : ""
                        }`}
                      >
                        <span
                          className={`font-label-sm uppercase tracking-widest ${
                            day.isToday
                              ? "text-c57-primary-fixed-dim"
                              : "text-c57-on-surface-variant"
                          }`}
                        >
                          {day.isToday ? "Hari Ini" : day.dayShort}
                        </span>
                        <span
                          className={`font-headline-sm text-body-lg tabular-nums ${
                            day.isToday ? "text-c57-on-primary" : "text-c57-on-surface"
                          }`}
                        >
                          {day.dayOfMonth}
                        </span>
                        <span
                          className={`text-label-sm ${
                            day.isToday
                              ? "text-c57-primary-fixed-dim"
                              : day.isWeekend
                                ? "text-c57-primary"
                                : "text-c57-on-surface-variant"
                          }`}
                        >
                          {day.isWeekend && !day.isToday ? "Weekend" : day.monthShort}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {groups.map((group) => {
                  const scheduled = group.rows.filter(
                    (m) => (bookingsByVehicle.get(m.id) || []).length > 0
                  ).length;
                  return (
                    <div key={group.category.id}>
                      <div className="flex items-center justify-between gap-space-sm bg-c57-surface-container-low px-space-md py-1.5">
                        <span className="flex items-center gap-space-xs font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          <span className="h-2 w-2 rounded-full bg-c57-primary" aria-hidden="true" />
                          Kategori: {group.category.label} ({group.category.hint})
                        </span>
                        <span className="text-label-sm text-c57-on-surface-variant">
                          {group.rows.length} Unit · {scheduled} terjadwal
                        </span>
                      </div>

                      {group.rows.map((unit) => {
                        const bookings = bookingsByVehicle.get(unit.id) || [];
                        const status = rowStatus(unit, bookings);
                        const segments = buildSegments(unit, bookings, timeline);
                        const cells = buildDayCells(unit, bookings, timeline);

                        return (
                          <div
                            key={unit.id}
                            className="grid grid-cols-1 items-stretch border-b border-c57-surface-container transition-colors last:border-b-0 hover:bg-c57-surface/40 lg:grid-cols-12"
                          >
                            <div className="lg:col-span-4">
                              <VehicleCell
                                unit={unit}
                                status={status}
                                bookings={bookings.length}
                              />
                            </div>

                            <div className="flex flex-col gap-space-sm p-2 lg:col-span-8">
                              {view === "gantt" ? (
                                <div
                                  className="grid min-h-16 items-center lg:min-h-0"
                                  style={{
                                    gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {segments.map((segment) => (
                                    <SegmentBar
                                      key={`${segment.kind}-${segment.key ?? "free"}-${segment.startIndex}`}
                                      segment={segment}
                                      days={days}
                                      onSelect={selectBooking}
                                      selected={selectedId}
                                      syncState={
                                        segment.kind === "booking" && segment.booking
                                          ? syncStateFor(segment.booking)
                                          : null
                                      }
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div
                                  className="grid gap-0.5"
                                  style={{
                                    gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`,
                                  }}
                                >
                                  <DayCells
                                    cells={cells}
                                    onSelect={selectBooking}
                                    selected={selectedId}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* ── Inspector ── */}
        {selected && (
          <Card
            className="flex flex-col items-start gap-space-lg p-space-lg lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex min-w-0 items-start gap-space-md">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-c57-lg bg-c57-primary text-c57-on-primary shadow-c57-card">
                <Icon name="fact_check" size="2xl" />
              </span>
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill variant="signature">Detail Booking Aktif</Pill>
                  <span className="font-label-md text-label-md text-c57-on-surface">
                    {shortRef(selected)}
                  </span>
                  <Pill variant={bookingTone(selected).pill.variant}>
                    {bookingTone(selected).label}
                  </Pill>
                  <CalendarSyncBadge state={getSyncState("pemesanan", selected)} />
                </div>
                <h3 className="mt-1 font-headline-sm text-headline-sm text-c57-on-surface">
                  {selected.namaClient || "Pemesanan tanpa nama"}
                  {selected.namaMobil ? ` • ${selected.namaMobil}` : ""}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-space-md gap-y-1 text-body-sm text-c57-on-surface-variant">
                  <span className="flex items-center gap-1 text-c57-on-surface">
                    <Icon name="directions_car" size="md" className="text-c57-primary" />
                    {selectedUnit?.platNomor || "Tanpa Plat"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="pin_drop" size="md" />
                    {selected.lokasiPenyerahan || "Ambil di Garasi"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="person" size="md" />
                    {selectedDriver
                      ? `Driver: ${selectedDriver.nama || selectedDriver.email}`
                      : selected.rentalType === "Dengan Driver"
                        ? "Driver belum ditugaskan"
                        : "Lepas Kunci"}
                  </span>
                  {selected.telepon && (
                    <span className="flex items-center gap-1">
                      <Icon name="chat" size="md" />
                      {selected.telepon}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-space-md rounded-c57-md bg-c57-surface-container p-space-md">
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                  Total Tagihan
                </span>
                <span className="font-headline-sm text-body-lg tabular-nums text-c57-on-surface">
                  {rupiah(selected.perkiraanHarga)}
                </span>
              </div>
              <span className="h-8 w-px bg-c57-surface-container-high" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-c57-available-text">
                  DP Diterima
                </span>
                <span className="font-headline-sm text-body-lg tabular-nums text-c57-available-text">
                  {rupiah(selected.dpAmount)}
                </span>
              </div>
              <span className="h-8 w-px bg-c57-surface-container-high" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-c57-primary">
                  Sisa Pelunasan
                </span>
                <span className="font-headline-sm text-body-lg tabular-nums text-c57-primary">
                  {rupiah((Number(selected.perkiraanHarga) || 0) - (Number(selected.dpAmount) || 0))}
                </span>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-wrap items-center gap-space-sm lg:w-auto">
              <Button
                variant="secondary"
                icon="calendar_month"
                onClick={syncSelectedToCalendar}
                loading={syncingSelected}
                title="Sinkronkan pesanan ini ke Google Calendar"
              >
                Sinkron Kalender
              </Button>
              <Button variant="primary" icon="receipt_long" onClick={printOrder}>
                Cetak Invoice DP
              </Button>
              <Button variant="secondary" icon="chat" onClick={sendReminder}>
                Reminder WA
              </Button>
              <Button
                variant="secondary"
                icon="swap_horiz"
                onClick={() => navigate("/manajemen-pesanan")}
                title="Kelola pesanan dan tukar unit di Manajemen Pesanan"
                aria-label="Kelola pesanan dan tukar unit di Manajemen Pesanan"
                className="px-space-md"
              >
                <span className="sr-only">Tukar Unit / Driver</span>
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* ── Manual allocation ── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title="Input Jadwal & Alokasi Armada"
        subtitle="Tambahkan pemesanan manual dan kunci jadwal unit."
        footer={
          <div className="flex items-center justify-end gap-space-sm">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button
              variant="primary"
              icon="calendar_add_on"
              onClick={handleSave}
              loading={saving}
            >
              Simpan Alokasi Jadwal
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          <Field label="Pilih Unit Armada" required>
            {(p) => (
              <Select
                {...p}
                data-autofocus
                value={form.mobilId}
                onChange={(e) => setForm({ ...form, mobilId: e.target.value })}
              >
                {visibleMobil.length === 0 && <option value="">Belum ada armada</option>}
                {visibleMobil.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                    {m.platNomor ? ` (${m.platNomor})` : ""}
                    {inService(m) ? " — Servis" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Nama Klien / Instansi" required>
            {(p) => (
              <Input
                {...p}
                type="text"
                value={form.namaClient}
                onChange={(e) => setForm({ ...form, namaClient: e.target.value })}
                placeholder="Contoh: Hendra Wijaya / PT Telkom"
              />
            )}
          </Field>

          <Field label="Waktu Mulai Sewa" required>
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={form.mulai}
                min={toInputValue(new Date())}
                onChange={(e) => setForm({ ...form, mulai: e.target.value })}
              />
            )}
          </Field>

          <Field label="Waktu Selesai Sewa" required>
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={form.selesai}
                min={form.mulai || toInputValue(new Date())}
                onChange={(e) => setForm({ ...form, selesai: e.target.value })}
              />
            )}
          </Field>

          <Field label="Tipe Sewa">
            {(p) => (
              <Select
                {...p}
                value={form.rentalType}
                onChange={(e) => setForm({ ...form, rentalType: e.target.value })}
              >
                <option>Dengan Driver</option>
                <option>Lepas Kunci</option>
              </Select>
            )}
          </Field>

          {form.rentalType === "Dengan Driver" && (
            <Field label="Penugasan Sopir / Driver">
              {(p) => (
                <Select
                  {...p}
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                >
                  <option value="">Belum ditugaskan</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama || d.email}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Field label="Status Pembayaran">
            {(p) => (
              <Select
                {...p}
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="pending">Menunggu Pembayaran DP</option>
                <option value="paid">DP 50% Lunas (Terkonfirmasi)</option>
              </Select>
            )}
          </Field>

          <Field
            label="Nominal DP"
            hint="Kosongkan untuk memakai 50% dari total tagihan."
            disabled={form.paymentStatus === "pending"}
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                min="0"
                disabled={form.paymentStatus === "pending"}
                value={form.dpAmount}
                onChange={(e) => setForm({ ...form, dpAmount: e.target.value })}
                placeholder="Contoh: 2500000"
              />
            )}
          </Field>

          <Field label="Titik Penyerahan" className="md:col-span-2">
            {(p) => (
              <Input
                {...p}
                type="text"
                value={form.lokasiPenyerahan}
                onChange={(e) => setForm({ ...form, lokasiPenyerahan: e.target.value })}
                placeholder="Contoh: Bandara Juanda T1"
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
