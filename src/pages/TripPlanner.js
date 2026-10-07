import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, Timestamp } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import { WHATSAPP_NUMBER } from "../data/tourCatalogue";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import {
  TRIP_PLANNER,
  ORIGINS,
  TIME_SLOTS,
  DESTINATIONS,
  FLEETS,
  ADDONS,
  ESTIMATED_KM,
  SEASONAL_DISCOUNT,
  ADDON_SNACK_PAX,
  MIN_DAYS,
  MAX_DAYS,
  DEFAULT_DAYS,
} from "../data/tripPlanner";

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

/**
 * ISO date arithmetic done locally (getFullYear/getMonth/getDate), never via
 * toISOString: WIB is UTC+7, so midnight local maps to the *previous* UTC day
 * and toISOString would move the travel window backwards.
 */
const addDays = (dateStr, days) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayInput = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const addonLineLabel = (addon, days) => {
  if (addon.id === "snack")
    return `Snack Box VIP & Artisan Drink (${ADDON_SNACK_PAX} Pax)`;
  return addon.perDay ? `${addon.title} (${days} Hari)` : addon.title;
};

export default function TripPlanner() {
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [originId, setOriginId] = useState("juanda");
  const [date, setDate] = useState(todayInput);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [destIds, setDestIds] = useState(["bromo", "madakaripura", "batu"]);
  const [fleetId, setFleetId] = useState("hiace");
  const [addons, setAddons] = useState(() =>
    Object.fromEntries(ADDONS.map((a) => [a.id, a.defaultOn]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const origin = useMemo(
    () => ORIGINS.find((o) => o.id === originId) || ORIGINS[0],
    [originId]
  );
  const fleet = useMemo(
    () => FLEETS.find((f) => f.id === fleetId) || FLEETS[0],
    [fleetId]
  );
  const selectedDests = useMemo(
    () => DESTINATIONS.filter((d) => destIds.includes(d.id)),
    [destIds]
  );

  const quote = useMemo(() => {
    const nights = Math.max(0, days - 1);
    const fleetSubtotal = Math.round(fleet.rate * origin.multiplier * days);
    const zoneSurcharge =
      origin.multiplier > 1
        ? Math.round(fleet.rate * (origin.multiplier - 1) * days)
        : 0;
    const photoSubtotal = addons.photo ? ADDONS[0].amount * days : 0;
    const seatSubtotal = addons.seat ? ADDONS[1].amount * days : 0;
    const snackSubtotal = addons.snack
      ? ADDONS[2].amount * ADDON_SNACK_PAX
      : 0;
    const gross =
      fleetSubtotal + zoneSurcharge + photoSubtotal + seatSubtotal + snackSubtotal;
    const total = Math.max(0, gross - SEASONAL_DISCOUNT);
    const dp = Math.round(total / 2);
    const lineItems = [
      { label: `Sewa Armada & Sopir (${days} Hari)`, amount: fleetSubtotal },
      ...(zoneSurcharge
        ? [{ label: "Surcharge Pick-up Malang & Batu (×1.1)", amount: zoneSurcharge }]
        : []),
      ...(addons.photo
        ? [{ label: addonLineLabel(ADDONS[0], days), amount: photoSubtotal }]
        : []),
      ...(addons.seat
        ? [{ label: addonLineLabel(ADDONS[1], days), amount: seatSubtotal }]
        : []),
      ...(addons.snack
        ? [{ label: addonLineLabel(ADDONS[2], days), amount: snackSubtotal }]
        : []),
      { label: "Privilege Diskon Musim Liburan", amount: -SEASONAL_DISCOUNT },
    ];
    return {
      nights,
      fleetSubtotal,
      zoneSurcharge,
      photoSubtotal,
      seatSubtotal,
      snackSubtotal,
      gross,
      total,
      dp,
      balance: total - dp,
      lineItems,
    };
  }, [origin, fleet, days, addons]);

  const toggleDest = (id) =>
    setDestIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );

  const toggleAddon = (id) =>
    setAddons((prev) => ({ ...prev, [id]: !prev[id] }));

  const adjustDays = (delta) =>
    setDays((prev) =>
      Math.min(MAX_DAYS, Math.max(MIN_DAYS, prev + delta))
    );

const consultHref = () => {
    const lines = [
      `Titik Jemput: ${origin.title}`,
      `Durasi: ${days} Hari / ${quote.nights} Malam`,
      `Destinasi: ${selectedDests.map((d) => d.name).join(", ") || "Belum dipilih"}`,
      `Armada: ${fleet.title} (${rupiah(fleet.rate)}/hari)`,
      `Estimasi Total Bersih: ${rupiah(quote.total)}`,
    ];
    const message =
      `Halo Concierge Cakra 57, saya ingin konsultasi rute trip custom saya:\n\n` +
      lines.join("\n");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const reserve = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (destIds.length === 0) {
      toast.warning("Pilih minimal satu destinasi singgah!");
      return;
    }
    if (!date) {
      toast.warning("Pilih tanggal keberangkatan!");
      return;
    }
    const whatsapp = user.phoneNumber || user.whatsapp || "";
    if (!whatsapp) {
      toast.warning(
        "Lengkapi nomor WhatsApp di halaman Profil sebelum mengirim pengajuan."
      );
      return;
    }
    setSubmitting(true);
    try {
      const sla = new Date();
      sla.setHours(sla.getHours() + 48);
      const routeSummary =
        selectedDests.map((d) => d.keyword).join(" · ") || "Bespoke Route";
      const addonLine =
        [addons.photo && "Fotografer", addons.seat && "ISOFIX", addons.snack && "Snack Box"]
          .filter(Boolean)
          .join(", ") || "Tidak ada";
      const notes = [
        `Pick-up: ${origin.title}`,
        `Rute: ${selectedDests.map((d) => d.name).join(", ")}`,
        `Durasi: ${days} hari / ${quote.nights} malam`,
        `Armada: ${fleet.title} (${rupiah(fleet.rate)}/hari)`,
        `Add-Ons: ${addonLine}`,
        `Estimasi Total Bersih: ${rupiah(quote.total)}`,
        `DP 50% Wajib: ${rupiah(quote.dp)}`,
      ].join("\n");

      await addDoc(collection(db, "trip_requests"), {
        uid: user.uid,
        type: "private_trip",
        tier: "bespoke_planner",
        destination: `Jawa Timur Bespoke — ${routeSummary} (${days} Hari/${quote.nights} Malam)`,
        proposed_date: date,
        end_date: addDays(date, days - 1),
        participant_count: ADDON_SNACK_PAX,
        whatsapp,
        notes,
        estimate_total: quote.total,
        status: "submitted",
        sla_deadline: Timestamp.fromDate(sla),
        created_at: Timestamp.now(),
        dp_paid: false,
        dp_paid_at: null,
        full_paid: false,
        full_paid_at: null,
        quote: { line_items: quote.lineItems, total: quote.total },
      });
      toast.success("Pengajuan terkirim!");
      setSubmitted(true);
    } catch (err) {
      console.error("Gagal mengirim pengajuan:", err);
      toast.error("Pengajuan gagal", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // pt-30 = 120px clears the fixed Navbar (40px utility bar + 80px nav).
  // This page used to return a bare fragment, so its hero started at y=0 and
  // the breadcrumb + headline rendered underneath the header.
  return (
    <div className="min-h-screen bg-c57-surface pt-30 text-c57-on-surface">
      {/* ── Hero: breadcrumb, headline, bespoke trust chip ── */}
      <section className="relative w-full bg-gradient-to-b from-c57-surface-container-high/60 via-c57-surface-container-low/40 to-c57-surface pb-space-lg">
        <div className="max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
          <nav className="flex items-center gap-space-xs text-label-sm font-label-sm text-c57-secondary uppercase tracking-widest pt-space-sm mb-space-md">
            {TRIP_PLANNER.breadcrumb.map((crumb) => (
              <span key={crumb} className="hover:text-c57-primary transition-colors cursor-pointer">
                {crumb}
              </span>
            ))}
            <span>/</span>
            <span className="text-c57-primary font-bold">{TRIP_PLANNER.current}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-end">
            <div className="lg:col-span-8 flex flex-col gap-space-sm">
              <div className="inline-flex items-center gap-2 self-start bg-c57-secondary-container px-space-md py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-c57-primary animate-pulse" />
                <span className="font-label-sm text-label-sm text-c57-on-secondary-container font-bold tracking-wider uppercase">
                  {TRIP_PLANNER.badge}
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-c57-on-surface font-semibold tracking-tight">
                {TRIP_PLANNER.titleLead}{" "}
                <span className="text-c57-primary italic">{TRIP_PLANNER.titleAccent}</span>
              </h1>
              <p className="font-body-lg text-body-md md:text-body-lg text-c57-secondary max-w-2xl leading-relaxed">
                {TRIP_PLANNER.description.split("wajib DP 50%")[0]}
                <span className="font-bold text-c57-primary">wajib DP 50%</span>.
              </p>
            </div>

            <div className="lg:col-span-4 flex lg:justify-end">
              <div className="bg-c57-surface-container-lowest p-space-md rounded-c57-xl shadow-c57-card flex items-center gap-space-md w-full sm:w-auto">
                <span className="w-12 h-12 rounded-full bg-c57-primary-fixed flex items-center justify-center shrink-0">
                  <Icon name="verified" size="2xl" className="text-c57-primary" />
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-c57-on-surface font-bold">
                    {TRIP_PLANNER.trustBadge.title}
                  </span>
                  <span className="font-body-sm text-body-sm text-c57-secondary">
                    {TRIP_PLANNER.trustBadge.desc}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive planner 2-column layout ── */}
      <section className="w-full pb-space-xl">
        <div className="max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* ── LEFT: step-by-step configuration ── */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-xl">
              {/* STEP 1 */}
              <section className="bg-c57-surface-container-lowest rounded-c57-lg p-space-md md:p-space-lg shadow-c57-card flex flex-col gap-space-md">
                <StepHeader
                  step={1}
                  title="Titik Awal & Jadwal Keberangkatan"
                  right="Tahap 1 dari 4"
                />

                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-c57-on-surface font-medium uppercase">
                    Lokasi Penjemputan (Pick-Up Point)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    {ORIGINS.map((o) => {
                      const active = originId === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setOriginId(o.id)}
                          className={[
                            "cursor-pointer p-space-md rounded-c57-md transition-all duration-200 flex items-start gap-space-sm relative group text-left",
                            active
                              ? "bg-c57-surface-container border-2 border-c57-primary"
                              : "bg-c57-surface-container-low hover:bg-c57-surface-container border-2 border-transparent",
                          ].join(" ")}
                        >
                          <Icon
                            name={o.icon}
                            size="2xl"
                            className={active ? "text-c57-primary" : "text-c57-secondary group-hover:text-c57-primary"}
                          />
                          <span className="flex flex-col">
                            <span className="font-label-md text-label-md text-c57-on-surface font-bold">
                              {o.title}
                            </span>
                            <span className="font-body-sm text-body-sm text-c57-secondary">
                              {o.desc}
                            </span>
                          </span>
                          <Icon
                            name="check_circle"
                            size="md"
                            className={[
                              "absolute top-3 right-3 text-c57-primary",
                              active ? "" : "hidden",
                            ].join(" ")}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-space-xs">
                  <Field label="Tanggal Keberangkatan">
                    <div className="flex items-center gap-space-xs bg-c57-surface-container-low p-2.5 rounded-c57-md text-c57-on-surface">
                      <Icon name="calendar_today" size="md" className="text-c57-primary" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent font-label-md text-label-md text-c57-on-surface w-full focus:outline-none"
                        aria-label="Tanggal keberangkatan"
                      />
                    </div>
                  </Field>

                  <Field label="Waktu Siap (Pick-Up Time)">
                    <div className="flex items-center gap-space-xs bg-c57-surface-container-low p-2.5 rounded-c57-md text-c57-on-surface">
                      <Icon name="schedule" size="md" className="text-c57-primary" />
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="bg-transparent font-label-md text-label-md text-c57-on-surface w-full focus:outline-none cursor-pointer"
                        aria-label="Waktu siap penjemputan"
                      >
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>

                  <Field label="Durasi Rute">
                    <div className="flex items-center justify-between bg-c57-surface-container-low p-2 rounded-c57-md text-c57-on-surface">
                      <button
                        type="button"
                        onClick={() => adjustDays(-1)}
                        disabled={days <= MIN_DAYS}
                        className="w-8 h-8 rounded-c57-md bg-c57-surface-container hover:bg-c57-surface-container-high flex items-center justify-center text-c57-on-surface transition-colors disabled:opacity-30"
                        aria-label="Kurangi durasi"
                      >
                        <Icon name="remove" size="md" />
                      </button>
                      <span className="font-label-md text-label-md font-bold text-c57-primary">
                        {days} Hari / {quote.nights} Malam
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustDays(1)}
                        disabled={days >= MAX_DAYS}
                        className="w-8 h-8 rounded-c57-md bg-c57-surface-container hover:bg-c57-surface-container-high flex items-center justify-center text-c57-on-surface transition-colors disabled:opacity-30"
                        aria-label="Tambah durasi"
                      >
                        <Icon name="add" size="md" />
                      </button>
                    </div>
                  </Field>
                </div>
              </section>

              {/* STEP 2 */}
              <section className="bg-c57-surface-container-lowest rounded-c57-lg p-space-md md:p-space-lg shadow-c57-card flex flex-col gap-space-md">
                <StepHeader
                  step={2}
                  title="Destinasi Singgah Eksklusif"
                  subtitle="Pilih ikon wisata tujuan. Jadwal dan urutan rute otomatis disesuaikan secara logis."
                  right={`${destIds.length} Terpilih`}
                  rightTone="primary"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
                  {DESTINATIONS.map((d) => {
                    const active = destIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDest(d.id)}
                        className={[
                          "cursor-pointer rounded-c57-md overflow-hidden transition-all duration-200 relative group flex flex-col text-left",
                          active
                            ? "bg-c57-surface-container shadow-md"
                            : "bg-c57-surface-container-low hover:bg-c57-surface-container",
                        ].join(" ")}
                      >
                        <div className="relative h-32 w-full overflow-hidden">
                          <img
                            src={d.image}
                            alt={d.name}
                            loading="lazy"
                            className={[
                              "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
                              active ? "" : "grayscale group-hover:grayscale-0",
                            ].join(" ")}
                          />
                          {active && (
                            <span className="absolute top-2 right-2 bg-c57-primary text-c57-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                              Terpilih
                            </span>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-c57-inverse-surface/80 via-transparent to-transparent" />
                          <span className="absolute bottom-2 left-2 text-c57-on-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
                            <Icon name={d.icon} size="sm" /> {d.region}
                          </span>
                        </div>
                        <div className="p-space-sm flex flex-col justify-between flex-1 gap-1">
                          <h3 className="font-label-md text-label-md text-c57-on-surface font-bold leading-snug">
                            {d.name}
                          </h3>
                          <p className="font-body-sm text-body-sm text-c57-secondary line-clamp-2">
                            {d.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* STEP 3 */}
              <section className="bg-c57-surface-container-lowest rounded-c57-lg p-space-md md:p-space-lg shadow-c57-card flex flex-col gap-space-md">
                <StepHeader
                  step={3}
                  title="Pilihan Armada Eksekutif & Supir"
                  subtitle="Semua unit sudah mencakup supir tersertifikasi, BBM penuh, e-toll, dan asuransi all-risk."
                  right="Tahap 3 dari 4"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  {FLEETS.map((f) => {
                    const active = fleetId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFleetId(f.id)}
                        className={[
                          "cursor-pointer p-space-md rounded-c57-lg transition-all duration-200 relative group flex flex-col gap-space-sm text-left",
                          active
                            ? "bg-c57-surface-container border-2 border-c57-primary"
                            : "bg-c57-surface-container-low border-2 border-transparent hover:bg-c57-surface-container",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex flex-col">
                            <span
                              className={[
                                "font-label-sm text-label-sm uppercase tracking-wider font-bold",
                                active ? "text-c57-primary" : "text-c57-secondary",
                              ].join(" ")}
                            >
                              {f.badge}
                            </span>
                            <span className="font-headline-sm text-headline-sm text-c57-on-surface font-bold">
                              {f.title}
                            </span>
                            <span className="font-body-sm text-body-sm text-c57-secondary">
                              {f.desc}
                            </span>
                          </span>
                          <Icon
                            name="check_circle"
                            size="2xl"
                            className={[
                              "shrink-0 text-c57-primary",
                              active ? "" : "hidden",
                            ].join(" ")}
                          />
                        </div>

                        <div className="w-full h-36 rounded-c57-md overflow-hidden bg-c57-surface-container-high my-1 relative">
                          <img
                            src={f.image}
                            alt={f.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-2 left-2 bg-c57-inverse-surface/80 text-c57-inverse-on-surface px-2 py-0.5 rounded font-label-sm text-label-sm">
                            {f.spec}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-space-xs gap-2">
                          <span className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-c57-secondary">
                              Tarif Harian (All-in)
                            </span>
                            <span className="font-headline-sm text-headline-sm text-c57-on-surface font-bold">
                              {rupiah(f.rate)}{" "}
                              <span className="font-body-sm text-body-sm text-c57-secondary font-normal">/hari</span>
                            </span>
                          </span>
                          <span
                            className={[
                              "font-label-sm text-label-sm px-space-sm py-1 rounded whitespace-nowrap",
                              active && f.driverTone === "accent"
                                ? "bg-c57-primary-fixed text-c57-primary font-bold"
                                : "bg-c57-surface-container-high text-c57-on-surface",
                            ].join(" ")}
                          >
                            {f.driver}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* STEP 4 */}
              <section className="bg-c57-surface-container-lowest rounded-c57-lg p-space-md md:p-space-lg shadow-c57-card flex flex-col gap-space-md">
                <StepHeader
                  step={4}
                  title="Penyempurna Perjalanan (Add-Ons)"
                  subtitle="Layanan opsional untuk kenyamanan keluarga & dokumentasi kenangan visual premium."
                  right="Tahap 4 dari 4"
                />

                <div className="flex flex-col gap-space-sm">
                  {ADDONS.map((a) => {
                    const on = addons[a.id];
                    return (
                      <label
                        key={a.id}
                        className="cursor-pointer p-space-md rounded-c57-lg bg-c57-surface-container-low hover:bg-c57-surface-container flex items-center justify-between transition-colors gap-3"
                      >
                        <span className="flex items-center gap-space-md">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleAddon(a.id)}
                            className="w-5 h-5 accent-c57-primary cursor-pointer rounded"
                          />
                          <span className="flex flex-col">
                            <span className="font-label-md text-label-md text-c57-on-surface font-bold">
                              {a.title}
                            </span>
                            <span className="font-body-sm text-body-sm text-c57-secondary">
                              {a.desc}
                            </span>
                          </span>
                        </span>
                        <span className="flex flex-col text-right pl-space-md shrink-0">
                          <span
                            className={[
                              "font-label-md text-label-md font-bold",
                              on ? "text-c57-primary" : "text-c57-on-surface",
                            ].join(" ")}
                          >
                            +{rupiah(a.perDay ? a.amount * days : a.amount * ADDON_SNACK_PAX)}
                          </span>
                          <span className="font-label-sm text-label-sm text-c57-secondary">
                            {a.per}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm bg-c57-surface-container-low p-space-md rounded-c57-md">
                  {TRIP_PLANNER.guarantee.map((g) => (
                    <div key={g.title} className="flex items-center gap-space-sm">
                      <Icon name={g.icon} size="3xl" className="text-c57-primary" />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-c57-on-surface font-bold">
                          {g.title}
                        </span>
                        <span className="font-body-sm text-body-sm text-c57-secondary">
                          {g.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── RIGHT: sticky live quote & DP 50% ── */}
            <aside className="lg:col-span-5 xl:col-span-4 sticky top-30 flex flex-col gap-space-md">
              <div className="bg-c57-surface-container-lowest rounded-c57-lg shadow-c57-card p-space-md md:p-space-lg flex flex-col gap-space-md">
                {submitted && (
                  <div className="flex items-start gap-2 rounded-c57-md bg-c57-available-bg text-c57-available-text px-space-md py-3 font-body-sm text-body-sm">
                    <Icon name="check_circle" size="md" className="mt-0.5 shrink-0" />
                    <span>
                      Rencana rute terkirim ke Concierge.{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/open-trip")}
                        className="font-bold underline underline-offset-2"
                      >
                        Buka tab Pengajuan Saya di Open Trip
                      </button>{" "}
                      untuk pantau status.
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between pb-space-xs border-b border-c57-surface-container">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-c57-secondary uppercase tracking-widest font-bold">
                      Kalkulasi Otomatis
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-c57-on-surface font-bold">
                      Ringkasan Rute & Biaya
                    </h3>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-c57-surface-container flex items-center justify-center text-c57-primary">
                    <Icon name="calculate" size="md" />
                  </span>
                </div>

                {/* Route timeline */}
                <div className="p-space-md rounded-c57-md bg-c57-surface-container-low flex flex-col gap-space-sm">
                  <span className="font-label-sm text-label-sm text-c57-secondary font-bold uppercase tracking-wider">
                    Rencana Lintasan Chauffeur
                  </span>
                  <div className="flex flex-col gap-2 relative pl-5">
                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-c57-secondary-fixed" />
                    <div className="relative flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-c57-primary ring-4 ring-c57-primary-fixed absolute -left-5" />
                      <span className="font-label-md text-label-md text-c57-on-surface font-semibold">
                        {origin.title}
                      </span>
                    </div>
                    {selectedDests.map((d) => (
                      <div key={d.id} className="relative flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-c57-tertiary-fixed-dim absolute -left-[19px]" />
                        <span className="font-body-sm text-body-sm text-c57-secondary">
                          {d.name}
                        </span>
                      </div>
                    ))}
                    <div className="relative flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-c57-primary absolute -left-5" />
                      <span className="font-label-md text-label-md text-c57-on-surface font-semibold">
                        Drop-off Kembali Juanda / Surabaya
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-c57-surface-container flex items-center justify-between text-label-sm font-label-sm text-c57-secondary">
                    <span>
                      Estimasi Jarak Tempuh:{" "}
                      <strong className="text-c57-on-surface">~{ESTIMATED_KM} km</strong>
                    </span>
                    <span>
                      Durasi:{" "}
                      <strong className="text-c57-primary">
                        {days} Hari Penuh
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Fleet summary */}
                <div className="flex items-center gap-space-sm p-space-sm rounded-c57-md bg-c57-surface-container">
                  <Icon name="directions_car" size="2xl" className="text-c57-primary" />
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-c57-secondary">
                      Armada Terpilih:
                    </span>
                    <span className="font-label-md text-label-md text-c57-on-surface font-bold">
                      {fleet.title}
                    </span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="flex flex-col gap-2 pt-space-xs font-body-sm text-body-sm">
                  {quote.lineItems.map((item) => (
                    <div key={item.label} className="flex justify-between gap-3">
                      <span className={item.amount < 0 ? "text-c57-primary" : "text-c57-secondary"}>
                        {item.label}
                      </span>
                      <span
                        className={[
                          "font-semibold tabular-nums whitespace-nowrap",
                          item.amount < 0 ? "text-c57-primary" : "text-c57-on-surface",
                        ].join(" ")}
                      >
                        {item.amount < 0 ? "-" : ""}
                        {rupiah(Math.abs(item.amount))}
                      </span>
                    </div>
                  ))}

                  <div className="pt-space-sm mt-1 border-t border-c57-surface-container flex items-baseline justify-between">
                    <span className="font-label-md text-label-md text-c57-on-surface font-bold">
                      Total Estimasi Bersih
                    </span>
                    <span className="font-headline-sm text-headline-sm text-c57-on-surface font-bold tabular-nums">
                      {rupiah(quote.total)}
                    </span>
                  </div>
                </div>

                {/* DP 50% highlight */}
                <div className="bg-c57-primary text-c57-on-primary rounded-c57-lg p-space-md shadow-md flex flex-col gap-space-sm relative overflow-hidden">
                  <span className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-c57-on-primary/10 pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm bg-c57-on-primary/20 text-c57-on-primary px-space-sm py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Kebijakan Wajib DP 50%
                    </span>
                    <Icon name="lock" size="md" className="text-c57-secondary-fixed" />
                  </div>
                  <p className="font-body-sm text-body-sm text-c57-primary-fixed leading-tight">
                    Mengunci unit armada, jadwal penugasan supir senior, dan booking
                    tiket destinasi wisata utama.
                  </p>
                  <div className="bg-c57-inverse-surface/30 p-space-sm rounded-c57-md flex items-center justify-between mt-1">
                    <span className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-c57-primary-fixed font-medium">
                        Nominal Wajib Bayar (DP 50%):
                      </span>
                      <span className="font-headline-md text-headline-md text-c57-on-primary font-bold tracking-tight tabular-nums">
                        {rupiah(quote.dp)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-label-sm font-label-sm pt-1">
                    <span className="text-c57-primary-fixed/80">Sisa Pelunasan Hari-H:</span>
                    <strong className="text-c57-on-primary">
                      {rupiah(quote.balance)} (Saat Penjemputan)
                    </strong>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-space-xs pt-space-xs">
                  <Button
                    type="button"
                    size="lg"
                    icon="arrow_forward"
                    iconPosition="right"
                    loading={submitting}
                    onClick={reserve}
                    className="w-full"
                  >
                    Lanjutkan ke Reservasi & Bayar DP 50%
                  </Button>
                  <a
                    href={consultHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-c57-surface-container hover:bg-c57-surface-container-high text-c57-on-surface font-label-md text-label-md py-3 px-space-md rounded-full flex items-center justify-center gap-space-sm transition-colors text-center"
                  >
                    <Icon name="chat" size="md" className="text-c57-available-text" />
                    Konsultasi Rute via WhatsApp CS (&lt; 3 Menit)
                  </a>
                </div>

                <div className="flex items-center justify-center gap-space-sm pt-space-xs text-c57-secondary font-label-sm text-label-sm">
                  <span className="flex items-center gap-1">
                    <Icon name="lock" size="sm" className="text-c57-available-text" />
                    BCA / Mandiri Rekening Resmi PT
                  </span>
                  <span>•</span>
                  <span>Invoice Resmi Pajak</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepHeader({ step, title, subtitle, right, rightTone = "default" }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-space-sm border-b border-c57-surface-container">
      <div className="flex items-center gap-space-sm">
        <span className="w-7 h-7 rounded-full bg-c57-primary text-c57-on-primary font-label-md text-label-md flex items-center justify-center shrink-0">
          {step}
        </span>
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">
            {title}
          </h2>
          {subtitle && (
            <span className="font-body-sm text-body-sm text-c57-secondary">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <span
        className={[
          "font-label-sm text-label-sm uppercase tracking-wider whitespace-nowrap",
          rightTone === "primary" ? "text-c57-primary font-bold" : "text-c57-secondary",
        ].join(" ")}
      >
        {right}
      </span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-sm text-label-sm text-c57-secondary font-bold uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}