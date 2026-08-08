import React, { useState, useEffect, useCallback } from "react";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  addDoc, getDocs, Timestamp
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useToast } from "../components/Toast";
import {
  Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare,
  Plus, Trash2, RefreshCw, Send, FileText, Calendar, Users
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────────────── */
const STATUS_META = {
  submitted:          { label: "Masuk",              color: "bg-blue-50 text-blue-700" },
  in_review:          { label: "Ditinjau",           color: "bg-[#fef3c7] text-[#92400e]" },
  quoted:             { label: "Penawaran Terkirim", color: "bg-purple-50 text-purple-700" },
  revision_requested: { label: "Revisi Diminta",     color: "bg-orange-50 text-orange-700" },
  confirmed:          { label: "Dikonfirmasi",       color: "bg-emerald-50 text-emerald-700" },
  rejected:           { label: "Ditolak",            color: "bg-red-50 text-red-700" },
};

function SLABadge({ slaDeadline }) {
  if (!slaDeadline) return null;
  const deadline = slaDeadline?.toDate?.() || new Date(slaDeadline);
  const now = new Date();
  const diffMs = deadline - now;
  const diffH = diffMs / 3600000;

  if (diffMs < 0)
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white animate-pulse">
        <AlertTriangle size={11} /> LEWAT SLA
      </span>
    );
  if (diffH < 6)
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-950">
        <Clock size={11} /> &lt; 6 JAM
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <Clock size={11} />
      {Math.ceil(diffH)}j lagi
    </span>
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

  /* load revisions */
  const loadRevisions = useCallback(async (requestId) => {
    if (revisions[requestId]) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, "trip_requests", requestId, "revisions"),
          orderBy("created_at", "asc")
        )
      );
      setRevisions(prev => ({
        ...prev,
        [requestId]: snap.docs.map(d => ({ id: d.id, ...d.data() }))
      }));
    } catch (e) {
      console.error(e);
    }
  }, [revisions]);

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
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all",               label: "Semua" },
          { value: "submitted",         label: "Masuk" },
          { value: "in_review",         label: "Ditinjau" },
          { value: "quoted",            label: "Penawaran Terkirim" },
          { value: "revision_requested",label: "Revisi" },
          { value: "confirmed",         label: "Konfirmasi" },
          { value: "rejected",          label: "Ditolak" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filterStatus === f.value
                ? "bg-[#990000] text-white shadow-md shadow-[#990000]/20"
                : "bg-white text-slate-500 border border-slate-200 hover:text-[#990000]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin" />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Memuat antrian...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 text-center">
          <FileText size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold italic text-sm">Tidak ada pengajuan trip.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(req => {
            const meta = STATUS_META[req.status] || { label: req.status, color: "bg-slate-100 text-slate-600" };
            const isActive = !["confirmed", "rejected"].includes(req.status);
            const noteRef = React.createRef();

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
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4"
              >
                {/* Header Row: Badges & Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                    {isActive && <SLABadge slaDeadline={req.sla_deadline} />}
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {req.type === "open_trip" ? `Open trip · ${req.tier || "Reguler"}` : "Private trip"}
                    </span>
                  </div>
                  {formattedTimestamp && (
                    <span className="text-slate-400 text-xs font-normal">
                      {formattedTimestamp}
                    </span>
                  )}
                </div>

                {/* Title & Details */}
                <div>
                  <h3 className="text-slate-900 font-bold text-lg leading-tight mb-1">
                    {req.destination || "(Destinasi belum diisi)"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={15} className="text-slate-400" />
                      {formattedProposedDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={15} className="text-slate-400" />
                      {req.participant_count || 1} peserta
                    </span>
                  </div>
                </div>

                {/* Catatan Client Box */}
                {req.notes && (
                  <div className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      CATATAN CLIENT
                    </span>
                    <p className="text-slate-800 font-medium text-sm leading-relaxed">
                      {req.notes}
                    </p>
                  </div>
                )}

                {/* Existing Quote Display */}
                {req.quote && (
                  <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                      PENAWARAN SAAT INI
                    </span>
                    <div className="space-y-1">
                      {req.quote.line_items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-medium text-slate-700">
                          <span>{item.label}</span>
                          <span className="font-bold text-slate-900">Rp {Number(item.amount).toLocaleString("id-ID")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-purple-200/60 pt-2 flex justify-between items-center text-sm font-bold text-purple-900">
                      <span>Total</span>
                      <span className="text-base">Rp {Number(req.quote.total).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                )}

                {/* Revision Notes List */}
                {(revisions[req.id] || []).length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      RIWAYAT CATATAN / REVISI
                    </span>
                    <div className="space-y-1.5">
                      {revisions[req.id].map((rv, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                          <span className="font-bold text-slate-900 mr-2">[{rv.by === "admin" ? "Admin" : "Client"}]:</span>
                          {rv.note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                {isActive && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        if (req.status === "submitted") setStatus(req.id, "in_review");
                        openQuoteForm(req);
                      }}
                      className="flex-1 bg-[#990000] hover:bg-[#7a0000] text-white font-semibold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Send size={15} />
                      {req.status === "revision_requested" ? "Upload quote revisi" : "Upload penawaran"}
                    </button>

                    <button
                      onClick={() => setStatus(req.id, "confirmed")}
                      className="border border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50 font-semibold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle size={15} />
                      Konfirmasi
                    </button>

                    <button
                      onClick={() => setStatus(req.id, "rejected")}
                      className="border border-red-300 bg-white text-red-700 hover:bg-red-50 font-semibold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <XCircle size={15} />
                      Tolak
                    </button>
                  </div>
                )}

                {/* Catatan Admin Input Row */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    ref={noteRef}
                    type="text"
                    placeholder="Tambah catatan admin..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#990000] transition-all"
                  />
                  <button
                    onClick={() => {
                      addAdminNote(req.id, noteRef.current?.value || "");
                      if (noteRef.current) noteRef.current.value = "";
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-sm px-5 py-3 rounded-xl flex items-center gap-2 transition-all shrink-0"
                  >
                    <MessageSquare size={15} />
                    Catat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Upload Penawaran Harga */}
      {quoteForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 md:p-8 space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Upload penawaran harga</h3>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mt-0.5">
                  BREAKDOWN BIAYA PER ITEM
                </span>
              </div>
              <button
                onClick={() => setQuoteForm(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold transition-colors leading-none"
              >
                ×
              </button>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Rincian Biaya */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  RINCIAN BIAYA
                </span>
                <button
                  onClick={addLineItem}
                  className="text-[#990000] text-xs font-bold hover:underline flex items-center gap-1"
                >
                  + Tambah item
                </button>
              </div>

              {/* Line items list */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {quoteForm.lineItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => updateLineItem(idx, "label", e.target.value)}
                      placeholder="Keterangan (cth: tiket masuk w"
                      className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={e => updateLineItem(idx, "amount", e.target.value)}
                        placeholder="Nominal"
                        className="w-28 text-right font-bold text-sm text-slate-900 bg-transparent placeholder:text-slate-400 focus:outline-none"
                      />
                      {quoteForm.lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(idx)}
                          className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Estimasi */}
            <div className="bg-[#0c162c] text-white p-4 rounded-xl flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                TOTAL ESTIMASI
              </span>
              <span className="text-xl font-bold text-white">
                Rp {quoteTotal.toLocaleString("id-ID")}
              </span>
            </div>

            {/* DP & Deadlines */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    JUMLAH DP (RP)
                  </label>
                  <input
                    type="number"
                    value={quoteForm.dpAmount}
                    onChange={e => setQuoteForm(prev => ({ ...prev, dpAmount: e.target.value }))}
                    placeholder="Nominal DP"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#990000] transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    DEADLINE BAYAR DP
                  </label>
                  <input
                    type="date"
                    value={quoteForm.dpDeadline}
                    onChange={e => setQuoteForm(prev => ({ ...prev, dpDeadline: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#990000] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  DEADLINE PELUNASAN (HARI H)
                </label>
                <input
                  type="date"
                  value={quoteForm.fullDeadline}
                  onChange={e => setQuoteForm(prev => ({ ...prev, fullDeadline: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#990000] transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={submitQuote}
              disabled={submitting}
              className="w-full py-3.5 bg-[#990000] hover:bg-[#7a0000] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {submitting ? "Mengirim..." : "Kirim penawaran ke client"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

