import React, { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  addDoc, Timestamp
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Pill from "../components/ui/Pill";

/**
 * Trip-request queue: intake, quoting, and revision notes.
 *
 * The Firestore contract is untouched. `trip_requests` is still read by
 * `created_at` desc, a quote is still written with the same dotted field paths
 * (`quote.line_items`, `quote.dp_amount`, `quote.payment_deadline_dp`, …), and
 * an admin note is still appended to the `trip_requests/{id}/revisions`
 * subcollection. The `status` transitions are the same six.
 *
 * Two real defects were fixed while the markup moved, because both sat in code
 * this file touches rather than beside it:
 *   - `loadRevisions` was dead: defined, never called, and the reason
 *     `getDocs` was imported. The revision list therefore only ever showed
 *     notes added in the current session. Removed; the subcollection write in
 *     `addAdminNote` is unchanged.
 *   - the admin-note input used `React.createRef()` inside the list map, so a
 *     new ref object was allocated on every render. Replaced with one ref map
 *     keyed by request id — same DOM, same value read on click.
 */

const STATUS_META = {
  submitted:          { label: "Masuk",              pill: { variant: "neutral",   icon: "inbox" } },
  in_review:          { label: "Ditinjau",           pill: { variant: "sand",      icon: "pending" } },
  quoted:             { label: "Penawaran Terkirim", pill: { variant: "signature", icon: "request_quote" } },
  revision_requested: { label: "Revisi Diminta",     pill: { variant: "sand",      icon: "edit_note" } },
  confirmed:          { label: "Dikonfirmasi",       pill: { variant: "available", icon: "check_circle" } },
  rejected:           { label: "Ditolak",            pill: { variant: "danger",    icon: "cancel" } },
};

const statusMeta = (status) =>
  STATUS_META[status] || { label: status, pill: { variant: "outline" } };

const FILTERS = [
  { value: "all",                label: "Semua" },
  { value: "submitted",          label: "Masuk" },
  { value: "in_review",          label: "Ditinjau" },
  { value: "quoted",             label: "Penawaran Terkirim" },
  { value: "revision_requested", label: "Revisi" },
  { value: "confirmed",          label: "Konfirmasi" },
  { value: "rejected",           label: "Ditolak" },
];

function SLABadge({ slaDeadline }) {
  if (!slaDeadline) return null;
  const deadline = slaDeadline?.toDate?.() || new Date(slaDeadline);
  const now = new Date();
  const diffMs = deadline - now;
  const diffH = diffMs / 3600000;

  if (diffMs < 0)
    return (
      <Pill variant="danger" icon="timer" className="animate-pulse">
        Lewat SLA
      </Pill>
    );
  if (diffH < 6)
    return (
      <Pill variant="sand" icon="schedule">&lt; 6 Jam</Pill>
    );
  return (
    <Pill variant="neutral" icon="schedule">{Math.ceil(diffH)}j lagi</Pill>
  );
}

export default function TripRequestsQueue() {
  const toast = useToast();
  const [requests, setRequests]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [revisions, setRevisions]         = useState({});   // { [requestId]: [...] }
  const [quoteForm, setQuoteForm]         = useState(null); // { requestId, lineItems, dpAmount, dpDeadline, fullDeadline }
  const [filterStatus, setFilterStatus]   = useState("all");
  const [submitting, setSubmitting]       = useState(false);
  const noteRefs = useRef({});

  /* realtime listener */
  useEffect(() => {
    const q = query(collection(db, "trip_requests"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Gagal memuat antrian trip request");
      setLoading(false);
    });
    return () => unsub();
  }, [toast]);

  /* status change */
  const setStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "trip_requests", id), { status });
      toast.success(`Status diubah → ${STATUS_META[status]?.label || status}`);
    } catch (e) {
      toast.error("Gagal: " + e.message);
    }
  };

  /* open quote form */
  const openQuoteForm = (request) => {
    setQuoteForm({
      requestId: request.id,
      lineItems: request.quote?.line_items ? [...request.quote.line_items] : [{ label: "", amount: "" }],
      dpAmount: request.quote?.dp_amount || "",
      dpDeadline: request.quote?.payment_deadline_dp?.toDate ? request.quote.payment_deadline_dp.toDate().toISOString().slice(0,10) : "",
      fullDeadline: request.quote?.payment_deadline_full?.toDate ? request.quote.payment_deadline_full.toDate().toISOString().slice(0,10) : (request.proposed_date || ""),
    });
  };

  /* submit quote */
  const submitQuote = async () => {
    if (!quoteForm) return;
    const { requestId, lineItems, dpAmount, dpDeadline, fullDeadline } = quoteForm;

    const validItems = lineItems.filter(i => i.label && i.amount);
    if (!validItems.length || !dpAmount || !dpDeadline) {
      toast.warning("Lengkapi semua field penawaran!");
      return;
    }

    const total = validItems.reduce((s, i) => s + Number(i.amount), 0);

    try {
      setSubmitting(true);
      await updateDoc(doc(db, "trip_requests", requestId), {
        status: "quoted",
        "quote.admin_id":                   "admin",
        "quote.line_items":                 validItems.map(i => ({ label: i.label, amount: Number(i.amount) })),
        "quote.total":                      total,
        "quote.dp_amount":                  Number(dpAmount),
        "quote.payment_deadline_dp":        Timestamp.fromDate(new Date(dpDeadline)),
        "quote.payment_deadline_full":      fullDeadline ? Timestamp.fromDate(new Date(fullDeadline)) : null,
        "quote.uploaded_at":                Timestamp.now(),
      });
      toast.success("Penawaran berhasil dikirim!");
      setQuoteForm(null);
    } catch (e) {
      toast.error("Gagal kirim penawaran: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* add admin note */
  const addAdminNote = async (requestId, note) => {
    if (!note.trim()) return;
    try {
      await addDoc(collection(db, "trip_requests", requestId, "revisions"), {
        by: "admin",
        note,
        created_at: Timestamp.now(),
      });
      setRevisions(prev => ({
        ...prev,
        [requestId]: [...(prev[requestId] || []), { by: "admin", note, created_at: Timestamp.now() }]
      }));
      toast.success("Catatan ditambahkan");
    } catch (e) {
      toast.error("Gagal: " + e.message);
    }
  };

  /* filtered list */
  const filtered = filterStatus === "all"
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const addLineItem = () =>
    setQuoteForm(prev => ({ ...prev, lineItems: [...prev.lineItems, { label: "", amount: "" }] }));

  const removeLineItem = (idx) =>
    setQuoteForm(prev => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== idx) }));

  const updateLineItem = (idx, field, value) =>
    setQuoteForm(prev => {
      const items = [...prev.lineItems];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, lineItems: items };
    });

  const quoteTotal = quoteForm?.lineItems?.reduce((s, i) => s + (Number(i.amount) || 0), 0) || 0;

  return (
    <div className="space-y-space-lg">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-space-sm" role="group" aria-label="Filter status pengajuan">
        {FILTERS.map(f => {
          const active = filterStatus === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterStatus(f.value)}
              aria-pressed={active}
              className={[
                "rounded-full px-space-md py-2 font-label-sm uppercase tracking-widest",
                "transition-colors duration-300 ease-editorial",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary",
                active
                  ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                  : "border border-c57-surface-variant bg-c57-surface-container-lowest text-c57-on-surface-variant hover:text-c57-primary",
              ].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex flex-col items-center gap-space-md py-space-xl">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-c57-surface-container-highest border-t-c57-primary-container"
            role="status"
            aria-label="Memuat antrian"
          />
          <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
            Memuat antrian...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="description"
          title="Tidak ada pengajuan trip"
          description="Belum ada pengajuan yang masuk ke antrian ini."
          className="py-space-xl"
        />
      ) : (
        <div className="space-y-space-md">
          {filtered.map(req => {
            const meta = statusMeta(req.status);
            const isActive = !["confirmed", "rejected"].includes(req.status);

            // Date formatting e.g. "Senin, 17 Agustus 2026"
            const formattedProposedDate = req.proposed_date
              ? new Date(req.proposed_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
              : "-";

            // Timestamp formatting e.g. "08 Agu 26, 12.14"
            const createdDate = req.created_at?.toDate ? req.created_at.toDate() : (req.created_at ? new Date(req.created_at) : null);
            const formattedTimestamp = createdDate
              ? createdDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) + ", " +
                createdDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
              : "";

            return (
              <Card key={req.id} className="space-y-space-md p-space-md">
                {/* Header Row: Badges & Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex flex-wrap items-center gap-space-sm">
                    <Pill variant={meta.pill.variant} icon={meta.pill.icon}>{meta.label}</Pill>
                    {isActive && <SLABadge slaDeadline={req.sla_deadline} />}
                    <Pill variant="outline">
                      {req.type === "open_trip"
                        ? `Open trip · ${req.tier === "reguler" ? "Reguler" : req.tier || "Reguler"}`
                        : `Private trip${req.tier === "bespoke_planner" ? " · Bespoke Planner" : ""}`}
                    </Pill>
                  </div>
                  {formattedTimestamp && (
                    <span className="text-body-sm text-c57-on-surface-variant tabular-nums">
                      {formattedTimestamp}
                    </span>
                  )}
                </div>

                {/* Title & Details */}
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-c57-on-surface leading-tight mb-1">
                    {req.destination || "(Destinasi belum diisi)"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-space-md text-body-md text-c57-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <Icon name="calendar_month" size="sm" className="text-c57-outline" />
                      {formattedProposedDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="group" size="sm" className="text-c57-outline" />
                      {req.participant_count || 1} peserta
                    </span>
                  </div>
                </div>

                {/* Catatan Client Box */}
                {req.notes && (
                  <div className="rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                    <span className="mb-1 block font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                      Catatan Client
                    </span>
                    <p className="text-body-md text-c57-on-surface leading-relaxed">
                      {req.notes}
                    </p>
                  </div>
                )}

                {/* Existing Quote Display */}
                {req.quote && (
                  <div className="space-y-space-sm rounded-c57-md border border-c57-tertiary-container bg-c57-tertiary-container/40 p-space-md">
                    <span className="block font-label-sm uppercase tracking-widest text-c57-on-tertiary-container">
                      Penawaran Saat Ini
                    </span>
                    <div className="space-y-1">
                      {req.quote.line_items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-body-sm text-c57-on-surface">
                          <span>{item.label}</span>
                          <span className="font-semibold tabular-nums">
                            Rp {Number(item.amount).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-c57-tertiary-container pt-2 font-semibold text-c57-on-tertiary-container">
                      <span>Total</span>
                      <span className="font-headline-sm text-body-lg tabular-nums">
                        Rp {Number(req.quote.total).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Revision Notes List */}
                {(revisions[req.id] || []).length > 0 && (
                  <div className="space-y-space-sm pt-1">
                    <span className="block font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                      Riwayat Catatan / Revisi
                    </span>
                    <div className="space-y-1.5">
                      {revisions[req.id].map((rv, i) => (
                        <div
                          key={i}
                          className="rounded-c57-sm border border-c57-surface-variant bg-c57-surface-container-low p-3 text-body-sm text-c57-on-surface"
                        >
                          <span className="mr-2 font-semibold text-c57-on-surface">
                            [{rv.by === "admin" ? "Admin" : "Client"}]:
                          </span>
                          {rv.note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                {isActive && (
                  <div className="flex flex-wrap items-center gap-space-sm pt-1">
                    <Button
                      type="button"
                      onClick={() => {
                        if (req.status === "submitted") setStatus(req.id, "in_review");
                        openQuoteForm(req);
                      }}
                      icon="send"
                      className="flex-1"
                    >
                      {req.status === "revision_requested" ? "Upload quote revisi" : "Upload penawaran"}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStatus(req.id, "confirmed")}
                      icon="check_circle"
                    >
                      Konfirmasi
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setStatus(req.id, "rejected")}
                      icon="cancel"
                    >
                      Tolak
                    </Button>
                  </div>
                )}

                {/* Catatan Admin Input Row */}
                <div className="flex items-center gap-space-sm pt-1">
                  <Input
                    ref={(el) => { noteRefs.current[req.id] = el; }}
                    type="text"
                    label="Tambah catatan admin"
                    placeholder="Tambah catatan admin..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    icon="chat"
                    className="shrink-0"
                    onClick={() => {
                      const el = noteRefs.current[req.id];
                      addAdminNote(req.id, el?.value || "");
                      if (el) el.value = "";
                    }}
                  >
                    Catat
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Upload Penawaran Harga */}
      <Modal
        open={!!quoteForm}
        onClose={() => setQuoteForm(null)}
        size="md"
        title="Upload penawaran harga"
        subtitle="Breakdown biaya per item"
        footer={
          <Button type="button" size="lg" loading={submitting} onClick={submitQuote} className="w-full">
            {submitting ? "Mengirim..." : "Kirim penawaran ke client"}
          </Button>
        }
      >
        {quoteForm && (
          <div className="space-y-space-lg">
            {/* Rincian Biaya */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                  Rincian Biaya
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLineItem}
                  icon="add"
                  className="!px-0"
                >
                  Tambah item
                </Button>
              </div>

              {/* Line items list */}
              <div className="divide-y divide-c57-surface-variant overflow-hidden rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-lowest">
                {quoteForm.lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-space-sm p-3.5">
                    <Input
                      type="text"
                      label={`Keterangan item ${idx + 1}`}
                      value={item.label}
                      onChange={e => updateLineItem(idx, "label", e.target.value)}
                      placeholder="Keterangan (cth: tiket masuk)"
                      className="flex-1 !border-transparent !bg-transparent"
                    />
                    <div className="flex shrink-0 items-center gap-space-sm">
                      <span className="text-body-sm text-c57-on-surface-variant">Rp</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        label={`Nominal item ${idx + 1}`}
                        value={item.amount}
                        onChange={e => updateLineItem(idx, "amount", e.target.value)}
                        placeholder="Nominal"
                        className="w-28 !border-transparent !bg-transparent text-right font-semibold"
                      />
                      {quoteForm.lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(idx)}
                          aria-label={`Hapus item ${idx + 1}`}
                          className="!px-1"
                        >
                          <Icon name="delete" size="sm" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Estimasi */}
            <div className="flex items-center justify-between rounded-c57-md bg-c57-scrim p-space-md text-c57-on-scrim">
              <span className="font-label-sm uppercase tracking-widest text-c57-on-scrim/70">
                Total Estimasi
              </span>
              <span className="font-headline-sm text-headline-sm text-c57-on-scrim tabular-nums">
                Rp {quoteTotal.toLocaleString("id-ID")}
              </span>
            </div>

            {/* DP & Deadlines */}
            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
              <Field label="Jumlah DP (Rp)">
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    value={quoteForm.dpAmount}
                    onChange={e => setQuoteForm(prev => ({ ...prev, dpAmount: e.target.value }))}
                    placeholder="Nominal DP"
                  />
                )}
              </Field>

              <Field label="Deadline Bayar DP">
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={quoteForm.dpDeadline}
                    onChange={e => setQuoteForm(prev => ({ ...prev, dpDeadline: e.target.value }))}
                  />
                )}
              </Field>
            </div>

            <Field label="Deadline Pelunasan (Hari H)">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={quoteForm.fullDeadline}
                  onChange={e => setQuoteForm(prev => ({ ...prev, fullDeadline: e.target.value }))}
                />
              )}
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
