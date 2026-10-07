import React, { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

import { useToast } from "../components/Toast";
import { auth, db } from "../services/firebase";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import ConciergeCta from "../components/ConciergeCta";
import { bespokeJourneys } from "../data/bespokeJourneys";

import {
  ARMADA_OPTIONS,
  PAX_OPTIONS,
  PRICE_BUCKETS,
  REGION_BUCKETS,
  availablePeriods,
  buildConsultationMessage,
  filterByPeriod,
  filterJourneys,
  formatRupiah,
  normalizeOpenTrip,
  normalizePaketWisata,
  tripInquiryMessage,
  whatsappLink,
} from "../utils/tourShowcase";

/* ─── Status config for user trip requests ─── */
const STATUS_META = {
  submitted: { label: "Pengajuan Diterima", variant: "neutral", icon: "schedule" },
  in_review: { label: "Sedang Ditinjau", variant: "sand", icon: "refresh" },
  quoted: { label: "Ada Penawaran", variant: "signature", icon: "request_quote" },
  revision_requested: { label: "Revisi Diminta", variant: "sand", icon: "edit_note" },
  confirmed: { label: "Trip Dikonfirmasi", variant: "available", icon: "event_available" },
  rejected: { label: "Ditolak", variant: "danger", icon: "cancel" },
};

const FEATURES = [
  { icon: "verified", title: "Aman & Terpercaya", desc: "Driver berpengalaman, kendaraan terawat & diasuransikan" },
  { icon: "bolt", title: "Respons Cepat", desc: "Admin merespons penawaran dalam maksimal 48 jam" },
  { icon: "workspace_premium", title: "Paket VIP", desc: "Tersedia tier VIP lengkap snack & makan 2x perjalanan" },
  { icon: "explore", title: "Rute Fleksibel", desc: "Open Trip harga hemat atau Private Trip eksklusif" },
];

const CATEGORIES = [
  { key: "semua", label: "Semua Kategori", icon: "apps" },
  { key: "open_trip", label: "Open Trip Terjadwal", icon: "groups" },
  { key: "paket_privat", label: "Paket Wisata Privat", icon: "luggage" },
  { key: "bespoke", label: "Bespoke Itinerary", icon: "auto_awesome" },
  { key: "pengajuan", label: "Pengajuan Saya", icon: "confirmation_number" },
];

const QUICK_FILTERS = [
  "Bromo Sunrise",
  "Kawah Ijen Blue Fire",
  "Borobudur VIP",
  "Nusa Penida Secret",
  "Dieng Highland",
];

const PILLARS = [
  {
    icon: "receipt_long",
    title: "Bebas Biaya Tersembunyi",
    body: "Tarif all-in telah mencakup bahan bakar, tol, tiket retribusi, parkir, hingga akomodasi & konsumsi chauffeur.",
    tag: "Transparansi 100%",
  },
  {
    icon: "minor_crash",
    title: "Armada Bintang Lima",
    body: "Semua kendaraan dirawat berkala di bengkel resmi ATPM. Kabin disterilisasi sebelum penjemputan.",
    tag: "Inspeksi 21 Titik",
  },
  {
    icon: "badge",
    title: "Chauffeur Beretika & Santun",
    body: "Dididik khusus dalam tata krama hospitality VIP dan bersertifikasi BNSP pariwisata.",
    tag: "Pemandu Berlisensi",
  },
  {
    icon: "history_toggle_off",
    title: "Fleksibilitas Reschedule",
    body: "Kunci tanggal keberangkatan dengan DP 50% terlindungi invoice legal PT. Reschedule H-7 tanpa penalti.",
    tag: "Faktur Legal PT Resmi",
  },
];

const CONCIERGE_PROMISES = [
  "Respons konsultasi kilat dalam waktu kurang dari 15 menit",
  "Kustomisasi rute intercity tanpa batasan titik singgah",
  "Dukungan hotline 24 jam selama ekspedisi berlangsung",
];

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split("T")[0];

function formatDate(value, options) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", options);
}

function quickFilterRegion(label) {
  const haystack = label.toLowerCase();
  const bucket = REGION_BUCKETS.find((b) =>
    b.keywords.some((keyword) => haystack.includes(keyword) || keyword.includes(haystack))
  );
  return bucket ? bucket.key : "semua";
}

export default function OpenTripPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const [user, setUser] = useState(null);
  const [openTrips, setOpenTrips] = useState([]);
  const [paketWisata, setPaketWisata] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReq, setLoadingReq] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [revisions, setRevisions] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("semua");

  // Filters
  const [region, setRegion] = useState("semua");
  const [price, setPrice] = useState("semua");
  const [period, setPeriod] = useState("semua");

  const [formData, setFormData] = useState({
    type: "open_trip",
    tier: "reguler",
    destination: "",
    proposed_date: "",
    end_date: "",
    participant_count: 1,
    whatsapp: "",
    notes: "",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && (u.phoneNumber || u.whatsapp)) {
        setFormData((p) => ({ ...p, whatsapp: u.phoneNumber || u.whatsapp || "" }));
      }
    });
  }, []);

  // Fetch Open Trips and Paket Wisata
  useEffect(() => {
    let cancelled = false;
    const tripsUnsub = onSnapshot(
      collection(db, "open_trips"),
      (snap) => {
        if (cancelled) return;
        setOpenTrips(snap.docs.map((doc) => normalizeOpenTrip({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("Error open_trips:", error);
        setLoading(false);
      }
    );

    const paketUnsub = onSnapshot(
      collection(db, "paket_wisata"),
      (snap) => {
        if (cancelled) return;
        setPaketWisata(snap.docs.map((doc) => normalizePaketWisata({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        if (cancelled) return;
        console.error("Error paket_wisata:", error);
      }
    );

    return () => {
      cancelled = true;
      tripsUnsub();
      paketUnsub();
    };
  }, []);

  // Fetch User Requests
  useEffect(() => {
    if (!user) {
      setMyRequests([]);
      setLoadingReq(false);
      return;
    }
    const q = query(collection(db, "trip_requests"), where("uid", "==", user.uid), orderBy("created_at", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setMyRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingReq(false);
      },
      (error) => {
        console.error("Firestore Error trip_requests:", error);
        setLoadingReq(false);
      }
    );
  }, [user]);

  const showOpenTrips = category === "semua" || category === "open_trip";
  const showPaket = category === "semua" || category === "paket_privat";
  const showBespoke = category === "semua" || category === "bespoke";
  const showPengajuan = category === "pengajuan";

  const visibleTrips = useMemo(
    () => (showOpenTrips ? filterJourneys(filterByPeriod(openTrips, period), { region, price }) : []),
    [showOpenTrips, openTrips, period, region, price]
  );

  const visiblePaket = useMemo(
    () => (showPaket ? filterJourneys(paketWisata, { region, price }) : []),
    [showPaket, paketWisata, region, price]
  );

  const periods = useMemo(() => availablePeriods(openTrips), [openTrips]);

  const resetFilters = () => {
    setRegion("semua");
    setPrice("semua");
    setPeriod("semua");
  };

  const loadRevisions = async (id) => {
    if (revisions[id]) return;
    const snap = await getDocs(
      query(collection(db, "trip_requests", id, "revisions"), orderBy("created_at", "asc"))
    );
    setRevisions((p) => ({ ...p, [id]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
  };

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    loadRevisions(id);
  };

  const openRequestForm = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setCategory("pengajuan");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (!formData.destination || !formData.proposed_date || !formData.end_date || !formData.whatsapp) {
      toast.warning("Lengkapi destinasi, tanggal mulai & selesai, serta nomor WhatsApp!");
      return;
    }
    if (new Date(formData.end_date) < new Date(formData.proposed_date)) {
      toast.warning("Tanggal selesai tidak boleh lebih awal dari tanggal mulai!");
      return;
    }
    try {
      setSubmitting(true);
      const sla = new Date();
      sla.setHours(sla.getHours() + 48);
      await addDoc(collection(db, "trip_requests"), {
        uid: user.uid,
        ...formData,
        tier: formData.tier,
        participant_count: Number(formData.participant_count),
        destination: formData.destination.trim(),
        whatsapp: formData.whatsapp.trim(),
        notes: formData.notes.trim(),
        status: "submitted",
        sla_deadline: Timestamp.fromDate(sla),
        created_at: Timestamp.now(),
        dp_paid: false,
        dp_paid_at: null,
        full_paid: false,
        full_paid_at: null,
        quote: null,
      });
      toast.success("Pengajuan terkirim! Tim kami akan merespons maksimal dalam 2x24 jam.");
      setShowForm(false);
      setFormData({
        type: "open_trip",
        tier: "reguler",
        destination: "",
        proposed_date: "",
        end_date: "",
        participant_count: 1,
        whatsapp: user?.phoneNumber || user?.whatsapp || "",
        notes: "",
      });
      setCategory("pengajuan");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const respondQuote = async (req, action) => {
    try {
      if (action === "accept") {
        await updateDoc(doc(db, "trip_requests", req.id), {
          status: "confirmed",
          dp_paid: true,
          dp_paid_at: Timestamp.now(),
        });
        toast.success("Setuju! DP dianggap terbayar.");
      } else if (action === "revise") {
        const note = prompt("Catatan revisi untuk admin:");
        if (!note?.trim()) return;
        await updateDoc(doc(db, "trip_requests", req.id), {
          status: "revision_requested",
          quote: null,
        });
        await addDoc(collection(db, "trip_requests", req.id, "revisions"), {
          by: "client",
          note: note.trim(),
          created_at: Timestamp.now(),
        });
        toast.success("Permintaan revisi terkirim");
      } else if (action === "reject") {
        await updateDoc(doc(db, "trip_requests", req.id), { status: "rejected" });
        toast.success("Pengajuan ditolak");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-c57-surface text-c57-on-surface">
      {/* ── HERO ── */}
      <section ref={heroRef} className="relative w-full overflow-hidden bg-c57-inverse-surface py-28 lg:py-36 text-c57-surface-bright">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-c57-primary/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -right-10 h-[30rem] w-[30rem] rounded-full bg-c57-tertiary-fixed-dim/10 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start px-5 md:px-10">
          <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-c57-tertiary-fixed/25 bg-c57-primary/25 px-4 py-1.5 font-label-sm uppercase tracking-[0.2em] text-c57-tertiary-fixed-dim backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-c57-primary-container" />
            Open Trip &amp; Private Exploration
          </p>

          <div className="max-w-4xl space-y-6">
            <h1 className="font-headline-xl text-headline-xl-mobile leading-tight tracking-tight md:text-headline-xl">
              Jelajahi Setiap Detik, Rencanakan Perjalanan Terbaik.
            </h1>
            <p className="max-w-2xl font-body-lg font-light leading-relaxed text-c57-surface-container-high">
              Pilih petualangan terjadwal (<span className="font-medium text-c57-surface-bright">Open Trip</span>) atau nikmati kenyamanan privat tanpa kompromi (<span className="font-medium text-c57-surface-bright">Private Trip &amp; Bespoke Itinerary</span>).
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" icon="send" onClick={openRequestForm}>
              Ajukan Custom Trip
            </Button>
            <Button variant="secondary" size="lg" icon="explore" onClick={() => setCategory("semua")}>
              Jelajahi Katalog
            </Button>
          </div>

          <div className="mt-12 grid w-full grid-cols-2 gap-4 rounded-2xl bg-c57-surface-bright/[0.04] p-6 backdrop-blur-sm md:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-c57-primary-container/20 text-c57-primary-fixed-dim">
                  <Icon name={f.icon} size="md" />
                </div>
                <div>
                  <span className="block font-label-sm uppercase tracking-wider text-c57-surface-bright">{f.title}</span>
                  <span className="font-body-sm text-c57-surface-container-high">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTER PANEL ── */}
      {!showPengajuan && (
        <section className="relative z-20 mx-auto -mt-8 w-full max-w-7xl px-5 md:px-10">
          <div className="rounded-2xl bg-c57-surface-container-lowest p-6 shadow-c57-overlay">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FilterSelect
                label="Wilayah Eksplorasi"
                icon="explore"
                value={region}
                onChange={setRegion}
                options={[{ value: "semua", label: "Semua Wilayah" }, ...REGION_BUCKETS.map((b) => ({ value: b.key, label: b.label }))]}
              />
              <FilterSelect
                label="Periode Keberangkatan"
                icon="calendar_month"
                value={period}
                onChange={setPeriod}
                options={[{ value: "semua", label: "Semua Periode" }, ...periods.map((p) => ({ value: p, label: p }))]}
              />
              <FilterSelect
                label="Rentang Investasi"
                icon="payments"
                value={price}
                onChange={setPrice}
                options={PRICE_BUCKETS.map((b) => ({ value: b.key, label: b.label }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-6">
              <span className="mr-2 font-label-sm uppercase tracking-widest text-c57-secondary">Destinasi Populer:</span>
              {QUICK_FILTERS.map((label) => (
                <button
                  key={label}
                  onClick={() => setRegion(quickFilterRegion(label))}
                  className="rounded-full bg-c57-surface-container px-4 py-1.5 font-label-sm uppercase text-c57-on-surface transition-colors hover:bg-c57-primary-container hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-12">
          {CATEGORIES.map((item) => {
            const active = category === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCategory(item.key)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full px-6 py-2.5 font-label-md uppercase tracking-wider transition-colors ${
                  active ? "bg-c57-primary-container text-c57-on-primary shadow-sm" : "text-c57-on-surface-variant hover:bg-c57-surface-container hover:text-c57-on-surface"
                }`}
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* SECTION: OPEN TRIP TERJADWAL */}
        {showOpenTrips && (
          <Section eyebrow="Koleksi Terjadwal" title="Jadwal Open Trip Terdekat" description="Pemberangkatan terjadwal bersama sesama penikmat lanskap Nusantara.">
            {loading ? (
              <GridSkeleton />
            ) : visibleTrips.length === 0 ? (
              <EmptyState
                icon="event_available"
                title="Belum ada jadwal yang cocok"
                description="Belum ada open trip pada filter ini. Tim kami bisa menyusun jadwal privat untuk rute yang Anda inginkan."
                action="Reset Filter"
                onAction={resetFilters}
                className="py-16"
              />
            ) : (
              <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                {visibleTrips.map((trip) => (
                  <OpenTripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* SECTION: PAKET WISATA PRIVAT */}
        {showPaket && (
          <Section eyebrow="Kurasi Privat" title="Paket Wisata Privat" description="Paket harga tetap dengan fasilitas lengkap, disusun untuk keluarga maupun kolega.">
            {visiblePaket.length === 0 ? (
              <EmptyState
                icon="luggage"
                title="Belum ada paket privat"
                description="Paket privat yang cocok belum tersedia. Konsultasikan rute custom Anda langsung ke tim kami."
                action="Konsultasi via WhatsApp"
                onAction={() => window.open(whatsappLink(buildConsultationMessage()), "_blank", "noopener")}
                className="py-16"
              />
            ) : (
              <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                {visiblePaket.map((paket) => (
                  <PaketCard key={paket.id} paket={paket} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* SECTION: BESPOKE ITINERARY */}
        {showBespoke && (
          <Section eyebrow="Bespoke Itinerary" title="Perjalanan Privat yang Dirancang Untuk Anda" description="Rute, akomodasi, dan pengalaman disesuaikan penuh.">
            <div className="space-y-8">
              {bespokeJourneys.map((journey) => (
                <BespokeCard key={journey.id} journey={journey} />
              ))}
            </div>
          </Section>
        )}

        {/* SECTION: PENGAJUAN SAYA */}
        {showPengajuan && (
          <div className="pt-10 space-y-space-xl">
            {!user && !showForm && (
              <RequestPrompt title="Login untuk melihat pengajuanmu" icon="person" action="Login Sekarang" onAction={() => navigate("/login")} />
            )}

            {user && !showForm && (
              <RequestPrompt
                title="Rencanakan Petualanganmu"
                description="Pilih Open Trip (sharing, lebih hemat) atau Private Trip (eksklusif untuk grupmu)."
                icon="send"
                action="Ajukan Sekarang"
                onAction={() => setShowForm(true)}
              />
            )}

            {showForm && (
              <RequestForm
                formData={formData}
                setFormData={setFormData}
                submitting={submitting}
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
              />
            )}

            {user && (
              <section className="pt-6">
                <div className="flex items-center justify-between mb-space-lg">
                  <div>
                    <p className="text-label-md uppercase tracking-editorial text-c57-primary mb-space-xs">Pengajuan Saya</p>
                    <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">Pantau Status Trip Anda</h2>
                  </div>
                  {myRequests.length > 0 && <Pill variant="signature">{myRequests.length} Pengajuan</Pill>}
                </div>

                {loadingReq ? (
                  <div className="flex flex-col items-center py-space-xl gap-space-md" role="status">
                    <span className="w-10 h-10 rounded-full border-4 border-c57-surface-variant border-t-c57-primary animate-spin" />
                    <p className="text-label-md uppercase tracking-wider text-c57-on-surface-variant">Memuat…</p>
                  </div>
                ) : myRequests.length === 0 ? (
                  <EmptyState
                    icon="map"
                    title="Belum ada pengajuan"
                    description='Klik "Ajukan Sekarang" untuk memulai'
                    action="Ajukan Sekarang"
                    onAction={() => setShowForm(true)}
                  />
                ) : (
                  <div className="space-y-space-md">
                    {myRequests.map((req) => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        expanded={expandedId === req.id}
                        revisions={revisions[req.id] || []}
                        onToggle={() => toggleExpand(req.id)}
                        onQuoteAction={(action) => respondQuote(req, action)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* PILLARS & CONSULTATION */}
      {!showPengajuan && (
        <>
          <PillarsSection />
          <ConsultationForm />
          <ConciergeCta
            title="Siap Menyusun Perjalanan Privat Anda?"
            description="Ceritakan rute yang Anda impikan, dan tim concierge kami akan menyusun itinerary, estimasi tarif, serta rekomendasi armada terbaik."
            planLabel="Mulai Konsultasi"
            planTo="/open-trip"
            planIcon="explore"
          />
        </>
      )}
    </div>
  );
}

/* ── HELPER COMPONENTS ── */

function FilterSelect({ label, icon, value, onChange, options }) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-c57-surface-container-low p-4 transition-colors hover:bg-c57-surface-container">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">{label}</span>
        <Icon name={icon} size="md" className="text-c57-primary-container" />
      </div>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="border-0 bg-transparent px-0 font-headline-sm text-headline-sm font-semibold text-c57-on-surface focus:border-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Section({ eyebrow, title, description, children }) {
  return (
    <section className="pt-16">
      <div className="mb-8 max-w-3xl">
        <p className="font-label-sm uppercase tracking-[0.25em] text-c57-primary-container">{eyebrow}</p>
        <h2 className="mt-2 font-headline-lg text-headline-lg-mobile leading-tight text-c57-on-surface md:text-headline-lg">{title}</h2>
        <p className="mt-2 font-body-md leading-relaxed text-c57-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function OpenTripCard({ trip }) {
  const full = trip.sisaKursi === 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-c57-surface-container-lowest shadow-c57-card transition-shadow duration-300 hover:shadow-c57-card-hover">
      <div className="relative h-64 overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${trip.imageUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80"})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/80 via-transparent to-c57-scrim/20" aria-hidden="true" />
        <span className="absolute left-4 top-4 rounded-full bg-c57-surface-bright/95 px-3 py-1 font-label-sm uppercase tracking-wider text-c57-on-surface shadow-sm backdrop-blur-md">
          {trip.durasi || "Jadwal Terjadwal"}
        </span>
        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 font-label-sm uppercase tracking-wider shadow-sm ${full ? "bg-c57-on-surface-variant text-white" : "bg-c57-error-container text-c57-on-error-container"}`}>
          {full ? "Kursi Penuh" : `Sisa ${trip.sisaKursi} Kursi`}
        </span>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="font-label-sm uppercase tracking-wider text-c57-tertiary-fixed-dim">{trip.tanggalLabel}</span>
          <p className="mt-0.5 font-headline-sm text-headline-sm leading-tight text-white drop-shadow-sm">{trip.judul}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-6 p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="font-label-sm uppercase tracking-widest text-c57-secondary">Fasilitas Utama:</span>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-secondary">
                <Icon name="check_circle" size="sm" className="text-c57-primary-container" />
                {trip.mobilUtama || "Armada tour"}
              </li>
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-secondary">
                <Icon name="check_circle" size="sm" className="text-c57-primary-container" />
                {trip.destinasi}
              </li>
              <li className="flex items-center gap-2 font-body-sm text-body-sm text-c57-secondary">
                <Icon name="check_circle" size="sm" className="text-c57-primary-container" />
                Titik kumpul {trip.titikKumpul || "sesuai konfirmasi"}
              </li>
            </ul>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between font-label-sm text-label-sm text-c57-secondary">
              <span>Keterisian Kuota</span>
              <span className="font-semibold text-c57-primary-container">{trip.kuotaTerisi} / {trip.kapasitasMaks} Terisi</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-c57-surface-container" role="progressbar">
              <div className="h-full rounded-full bg-c57-primary-container" style={{ width: `${trip.persenTerisi}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-label-sm uppercase tracking-wider text-c57-secondary">Tarif per Orang</span>
            <div className="text-right">
              <span className="font-headline-md text-headline-md font-semibold text-c57-primary-container">{formatRupiah(trip.hargaPerPax)}</span>
              <span className="-mt-1 block font-body-sm text-body-sm text-c57-secondary">/ pax all-in</span>
            </div>
          </div>
          <Button onClick={() => window.open(whatsappLink(tripInquiryMessage(trip)), "_blank", "noopener")} className="w-full" icon="arrow_forward">
            Reservasi Kursi
          </Button>
        </div>
      </div>
    </article>
  );
}

function PaketCard({ paket }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-c57-surface-container-lowest shadow-c57-card transition-shadow duration-300 hover:shadow-c57-card-hover">
      <div className="relative h-56 overflow-hidden">
        {paket.imageUrl ? (
          <img src={paket.imageUrl} alt={paket.judul} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-c57-surface-container" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/75 to-transparent" aria-hidden="true" />
        {paket.durasi && (
          <span className="absolute left-4 top-4 rounded-full bg-c57-surface-bright/95 px-3 py-1 font-label-sm uppercase tracking-wider text-c57-on-surface shadow-sm">
            {paket.durasi}
          </span>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <span className="font-label-sm uppercase tracking-wider text-c57-tertiary-fixed-dim">{paket.destinasi}</span>
          <p className="mt-0.5 font-headline-sm text-headline-sm leading-tight text-white drop-shadow-sm">{paket.judul}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-5 p-6">
        {paket.description && <p className="font-body-sm leading-relaxed text-c57-secondary">{paket.description}</p>}

        {paket.fasilitas.length > 0 && (
          <ul className="space-y-1.5">
            {paket.fasilitas.map((item) => (
              <li key={item} className="flex items-center gap-2 font-body-sm text-body-sm text-c57-secondary">
                <Icon name="check_circle" size="sm" className="text-c57-primary-container" />
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-label-sm uppercase tracking-wider text-c57-secondary">Mulai Dari</span>
            <span className="font-headline-md text-headline-md font-semibold text-c57-primary-container">{formatRupiah(paket.harga)}</span>
          </div>
          <Button
            onClick={() => window.open(whatsappLink(buildConsultationMessage({ destination: paket.destinasi, armada: "" })), "_blank", "noopener")}
            variant="secondary"
            className="w-full"
            icon="arrow_forward"
          >
            Konsultasi Paket Ini
          </Button>
        </div>
      </div>
    </article>
  );
}

function BespokeCard({ journey }) {
  const flipped = journey.id === "east-java-highland";
  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-3xl bg-c57-surface-container-lowest shadow-c57-card transition-shadow duration-500 hover:shadow-c57-card-hover lg:grid-cols-12">
      <div className={`relative min-h-[20rem] overflow-hidden lg:col-span-6 lg:min-h-[26rem] ${flipped ? "lg:order-2" : ""}`}>
        <img src={journey.image} alt={journey.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
        <span className="absolute left-6 top-6 rounded-full bg-c57-surface-bright/95 px-4 py-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface shadow-md backdrop-blur-md">
          {journey.badge}
        </span>
      </div>

      <div className={`flex flex-col justify-between space-y-8 p-8 lg:col-span-6 lg:p-12 ${flipped ? "lg:order-1" : ""}`}>
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="font-label-sm uppercase tracking-widest text-c57-on-secondary-container">{journey.region}</span>
            <h3 className="font-headline-md text-headline-md leading-tight text-c57-on-surface">{journey.title}</h3>
            <p className="font-body-md leading-relaxed text-c57-secondary">{journey.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <div className="space-y-1 rounded-xl bg-c57-surface-container-low p-4">
              <span className="font-label-sm uppercase tracking-wider text-c57-secondary">Armada Pilihan</span>
              <p className="flex items-center gap-1.5 font-body-md font-medium text-c57-on-surface"><Icon name="directions_car" size="md" className="text-c57-primary-container" />{journey.armada}</p>
            </div>
            <div className="space-y-1 rounded-xl bg-c57-surface-container-low p-4">
              <span className="font-label-sm uppercase tracking-wider text-c57-secondary">Kurasi Akomodasi</span>
              <p className="flex items-center gap-1.5 font-body-md font-medium text-c57-on-surface"><Icon name="hotel" size="md" className="text-c57-primary-container" />{journey.akomodasi}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
          <div>
            <span className="font-label-sm uppercase tracking-widest text-c57-secondary">Investasi Mulai</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-md text-headline-md font-semibold text-c57-primary-container">{formatRupiah(journey.hargaMulai)}</span>
              <span className="font-body-sm text-body-sm text-c57-secondary">/ orang (min. {journey.minPax} pax)</span>
            </div>
          </div>
          <Button
            onClick={() => window.open(whatsappLink(buildConsultationMessage({ destination: journey.region, schedule: journey.badge, armada: journey.armada })), "_blank", "noopener")}
            icon="edit_calendar"
          >
            Rancang Paket Ini
          </Button>
        </div>
      </div>
    </article>
  );
}

function PillarsSection() {
  return (
    <section className="w-full bg-c57-surface-container-low py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center">
          <p className="font-label-md uppercase tracking-[0.2em] font-semibold text-c57-primary-container">Komitmen Unggul</p>
          <h2 className="font-headline-lg text-headline-lg-mobile tracking-tight text-c57-on-surface md:text-headline-lg">Standar Layanan &amp; Transparansi Mutlak</h2>
          <p className="font-body-md leading-relaxed text-c57-secondary">Setiap jengkal perjalanan dikawal oleh kepastian standar kelas hospitality.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="flex flex-col justify-between space-y-4 rounded-2xl bg-c57-surface-container-lowest p-6 shadow-c57-card">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-c57-surface-container text-c57-primary-container">
                  <Icon name={pillar.icon} size="2xl" />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">{pillar.title}</h3>
                <p className="font-body-sm leading-relaxed text-c57-secondary">{pillar.body}</p>
              </div>
              <span className="font-label-sm uppercase tracking-wider text-c57-primary-container">{pillar.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsultationForm() {
  const [form, setForm] = useState({
    destination: "",
    schedule: "",
    pax: PAX_OPTIONS[0].value,
    armada: ARMADA_OPTIONS[0],
    notes: "",
  });
  const [error, setError] = useState(null);

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.destination.trim()) {
      setError("Isi Destinasi Tujuan terlebih dahulu.");
      return;
    }
    window.open(whatsappLink(buildConsultationMessage(form)), "_blank", "noopener");
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-10">
      <div className="relative overflow-hidden rounded-3xl bg-c57-inverse-surface p-8 text-white shadow-c57-overlay lg:p-14">
        <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-c57-surface-bright/10 px-3 py-1 font-label-sm uppercase tracking-widest text-c57-tertiary-fixed-dim">
              Private Concierge Desk
            </p>
            <h3 className="font-headline-lg text-headline-lg-mobile leading-tight md:text-headline-lg">Punya Rencana Perjalanan Impian Sendiri?</h3>
            <p className="font-body-md font-light leading-relaxed text-c57-surface-container-high">
              Ceritakan preferensi waktu, tempat, atau tema perjalanan Anda. Tim Concierge Cakra Lima Tujuh akan menyusun rute terpersonalisasi.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              {CONCIERGE_PROMISES.map((promise) => (
                <div key={promise} className="flex items-center gap-3 font-body-sm text-c57-surface-container-high">
                  <Icon name="check_circle" size="lg" className="text-c57-primary-fixed-dim" />
                  <span>{promise}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col justify-between space-y-6 rounded-2xl bg-c57-surface-bright/5 p-6 backdrop-blur-md lg:col-span-7 lg:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field tone="dark" label="Destinasi Tujuan" error={error} required>
                {(p) => <Input tone="dark" {...p} icon="location_on" error={error} value={form.destination} onChange={update("destination")} placeholder="Contoh: Bromo, Malang & Batu" />}
              </Field>

              <Field tone="dark" label="Estimasi Tanggal / Durasi">
                {(p) => <Input tone="dark" {...p} icon="event" value={form.schedule} onChange={update("schedule")} placeholder="Contoh: 12 - 15 Mei 2025 (4D3N)" />}
              </Field>

              <Field tone="dark" label="Jumlah Peserta">
                {(p) => (
                  <Select tone="dark" {...p} value={form.pax} onChange={update("pax")}>
                    {PAX_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </Select>
                )}
              </Field>

              <Field tone="dark" label="Pilihan Preferensi Armada">
                {(p) => (
                  <Select tone="dark" {...p} value={form.armada} onChange={update("armada")}>
                    {ARMADA_OPTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
                  </Select>
                )}
              </Field>

              <Field tone="dark" label="Catatan Khusus" className="md:col-span-2">
                {(p) => <Textarea tone="dark" {...p} rows={2} value={form.notes} onChange={update("notes")} placeholder="Catatan khusus, rekomendasi hotel, dll..." />}
              </Field>
            </div>

            <Button type="submit" size="lg" icon="send" className="w-full">
              Konsultasikan Rencana (&lt; 15 Menit)
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function RequestPrompt({ title, description, icon, action, onAction }) {
  return (
    <Card variant="scrim" className="relative overflow-hidden p-8">
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-space-lg">
        <div className="text-center md:text-left max-w-xl">
          <p className="text-label-md uppercase tracking-editorial text-c57-tertiary mb-space-sm">Buat Pengajuan Baru</p>
          <h2 className="font-headline-sm text-headline-sm text-c57-on-scrim">{title}</h2>
          {description && <p className="text-body-sm text-c57-on-scrim/70 mt-space-sm">{description}</p>}
        </div>
        <Button size="lg" icon={icon} iconPosition="right" className="shrink-0" onClick={onAction}>
          {action}
        </Button>
      </div>
    </Card>
  );
}

function RequestForm({ formData, setFormData, submitting, onSubmit, onCancel }) {
  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      <div className="px-6 py-4 bg-c57-scrim flex items-center justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-wider text-c57-on-scrim/60">Form Pengajuan</p>
          <h3 className="font-headline-sm text-headline-sm text-c57-on-scrim">Detail perjalananmu</h3>
        </div>
        <button type="button" onClick={onCancel} className="p-2 rounded-full text-c57-on-scrim/70 hover:text-c57-on-scrim">
          <Icon name="close" size="md" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipe Trip">
            {(p) => (
              <Select {...p} value={formData.type} onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="open_trip">Open Trip (Sharing seat)</option>
                <option value="private_trip">Private Trip (Eksklusif)</option>
              </Select>
            )}
          </Field>
          <Field label="Tier Trip">
            {(p) => (
              <Select {...p} value={formData.tier} onChange={(e) => setFormData((prev) => ({ ...prev, tier: e.target.value }))}>
                <option value="reguler">Reguler (Tanpa snack/makan)</option>
                <option value="vip">VIP (Snack + Makan 2x)</option>
              </Select>
            )}
          </Field>
        </div>

        <Field label="Destinasi / Rute" required>
          {(p) => <Input {...p} value={formData.destination} onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))} placeholder="Bromo, Malang, Batu..." required />}
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tanggal Mulai" required>
            {(p) => <Input {...p} type="date" min={tomorrow()} value={formData.proposed_date} onChange={(e) => setFormData((prev) => ({ ...prev, proposed_date: e.target.value }))} required />}
          </Field>
          <Field label="Tanggal Selesai" required>
            {(p) => <Input {...p} type="date" min={formData.proposed_date || tomorrow()} value={formData.end_date} onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))} required />}
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Jumlah Peserta" required>
            {(p) => <Input {...p} type="number" min={1} max={50} value={formData.participant_count} onChange={(e) => setFormData((prev) => ({ ...prev, participant_count: e.target.value }))} required />}
          </Field>
          <Field label="Nomor WhatsApp" required>
            {(p) => <Input {...p} type="tel" value={formData.whatsapp} onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))} placeholder="0812..." required />}
          </Field>
        </div>

        <Field label="Catatan Tambahan">
          {(p) => <Textarea {...p} rows={3} value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Permintaan khusus, jalur favorit..." />}
        </Field>

        <Button type="submit" size="lg" icon="send" loading={submitting} className="w-full">
          {submitting ? "Mengirim…" : "Kirim Pengajuan Trip"}
        </Button>
      </form>
    </Card>
  );
}

function RequestCard({ req, expanded, revisions, onToggle, onQuoteAction }) {
  const meta = STATUS_META[req.status] || { label: req.status, variant: "neutral" };
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full p-6 flex flex-wrap gap-4 items-center text-left">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <Pill variant={meta.variant} icon={meta.icon}>{meta.label}</Pill>
            <Pill variant="outline">{(req.type === "open_trip" ? "Open Trip" : "Private Trip") + (req.tier ? ` · ${req.tier.toUpperCase()}` : "")}</Pill>
          </div>
          <p className="font-headline-sm text-headline-sm text-c57-on-surface">{req.destination}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-body-sm text-c57-on-surface-variant">
            <span>📅 {formatDate(req.proposed_date, { day: "numeric", month: "short", year: "numeric" })}</span>
            <span>👥 {req.participant_count} peserta</span>
            {req.whatsapp && <span>📱 {req.whatsapp}</span>}
          </div>
        </div>
        <Icon name="expand_more" size="md" className={`text-c57-on-surface-variant shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-c57-surface-variant p-6 space-y-4">
          {req.status === "quoted" && req.quote && (
            <div className="p-4 rounded-xl bg-c57-surface-container">
              <p className="font-label-sm uppercase text-c57-primary mb-1">Penawaran Admin</p>
              <p className="font-headline-md text-headline-md font-bold text-c57-on-surface">Rp {Number(req.quote.total).toLocaleString("id-ID")}</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" icon="task_alt" onClick={() => onQuoteAction("accept")}>Setuju &amp; Bayar DP</Button>
                <Button size="sm" variant="secondary" icon="edit_note" onClick={() => onQuoteAction("revise")}>Revisi</Button>
              </div>
            </div>
          )}

          {revisions.length > 0 && (
            <div className="space-y-2">
              <p className="text-label-sm uppercase text-c57-on-surface-variant">Riwayat Komunikasi</p>
              {revisions.map((rv, i) => (
                <div key={rv.id || i} className="p-3 rounded-lg bg-c57-surface-container-low">
                  <p className="text-label-sm text-c57-primary">{rv.by === "admin" ? "Admin" : "Kamu"}</p>
                  <p className="text-body-sm text-c57-on-surface">{rv.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-96 animate-pulse rounded-2xl bg-c57-surface-container" />
      ))}
    </div>
  );
}
