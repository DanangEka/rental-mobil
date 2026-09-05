import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  Timestamp, doc, getDocs, updateDoc
} from "firebase/firestore";
import { useToast } from "../components/Toast";
import { useNavigate, Link } from "react-router-dom";
import {
  Map, Users, Calendar, Send, Clock,
  CheckCircle, XCircle, MessageSquare, ChevronDown, ChevronUp,
  AlertTriangle, RefreshCw, DollarSign, ArrowRight,
  Compass, Shield, Zap, Mountain, Coffee, Phone
} from "lucide-react";

/* ─── Status config ───────────────────────────────────────────────────── */
const STATUS_META = {
  submitted:          { label: "Pengajuan Diterima",  bg: "from-blue-500 to-blue-600",   text: "text-blue-100",   ring: "ring-blue-400/30",  icon: <Clock size={13}/> },
  in_review:          { label: "Sedang Ditinjau",     bg: "from-amber-500 to-orange-500", text: "text-amber-100",  ring: "ring-amber-400/30", icon: <RefreshCw size={13} className="animate-spin"/> },
  quoted:             { label: "Ada Penawaran! 🎉",   bg: "from-purple-500 to-violet-600",text: "text-purple-100", ring: "ring-purple-400/30",icon: <DollarSign size={13}/> },
  revision_requested: { label: "Revisi Diminta",      bg: "from-orange-500 to-red-500",   text: "text-orange-100", ring: "ring-orange-400/30",icon: <MessageSquare size={13}/> },
  confirmed:          { label: "Trip Dikonfirmasi ✓", bg: "from-emerald-500 to-teal-600", text: "text-emerald-100",ring: "ring-emerald-400/30",icon: <CheckCircle size={13}/> },
  rejected:           { label: "Ditolak",             bg: "from-red-500 to-red-700",      text: "text-red-100",    ring: "ring-red-400/30",   icon: <XCircle size={13}/> },
};

const FEATURES = [
  { icon: <Shield size={22}/>, title: "Aman & Terpercaya", desc: "Driver berpengalaman, kendaraan terawat & diasuransikan" },
  { icon: <Zap size={22}/>,   title: "Respons Cepat",     desc: "Admin merespons penawaran dalam maksimal 48 jam" },
  { icon: <Coffee size={22}/>, title: "Paket VIP",         desc: "Tersedia tier VIP lengkap snack & makan 2x perjalanan" },
  { icon: <Compass size={22}/>,title: "Rute Fleksibel",   desc: "Open Trip harga hemat atau Private Trip eksklusif" },
];

/* ─── main ──────────────────────────────────────────────────────────── */
export default function OpenTripPage() {
  const toast    = useToast();
  const navigate = useNavigate();
  const heroRef  = useRef(null);

  const [user, setUser]             = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [revisions, setRevisions]   = useState({});
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab]   = useState("catalog");
  const [scrollY, setScrollY]       = useState(0);

  const [formData, setFormData] = useState({
    type: "open_trip", tier: "reguler",
    destination: "", proposed_date: "", end_date: "",
    participant_count: 1, whatsapp: "", notes: "",
  });

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      if (u && (u.phoneNumber || u.whatsapp)) {
        setFormData(p => ({ ...p, whatsapp: u.phoneNumber || u.whatsapp || "" }));
      }
    });
  }, []);

  useEffect(() => {
    if (!user) { setMyRequests([]); setLoadingReq(false); return; }
    const q = query(collection(db, "trip_requests"), where("uid", "==", user.uid), orderBy("created_at", "desc"));
    return onSnapshot(q, snap => {
      setMyRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingReq(false);
    });
  }, [user]);

  const loadRevisions = async (id) => {
    if (revisions[id]) return;
    const snap = await getDocs(query(collection(db, "trip_requests", id, "revisions"), orderBy("created_at", "asc")));
    setRevisions(p => ({ ...p, [id]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
  };

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadRevisions(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
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
      const sla = new Date(); sla.setHours(sla.getHours() + 48);
      await addDoc(collection(db, "trip_requests"), {
        uid: user.uid, ...formData,
        tier: formData.tier,
        participant_count: Number(formData.participant_count),
        destination: formData.destination.trim(),
        whatsapp: formData.whatsapp.trim(),
        notes: formData.notes.trim(),
        status: "submitted", sla_deadline: Timestamp.fromDate(sla),
        created_at: Timestamp.now(), dp_paid: false, dp_paid_at: null, full_paid: false, full_paid_at: null, quote: null,
      });
      toast.success("Pengajuan terkirim! Tim kami akan merespons maksimal dalam 2x24 jam.");
      setShowForm(false);
      setFormData({
        type: "open_trip", tier: "reguler", destination: "",
        proposed_date: "", end_date: "", participant_count: 1,
        whatsapp: user?.phoneNumber || user?.whatsapp || "", notes: ""
      });
      setActiveTab("request");
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const respondQuote = async (req, action) => {
    try {
      if (action === "accept") {
        await updateDoc(doc(db, "trip_requests", req.id), { status: "confirmed", dp_paid: true, dp_paid_at: Timestamp.now() });
        toast.success("Setuju! DP dianggap terbayar.");
      } else if (action === "revise") {
        const note = prompt("Catatan revisi untuk admin:");
        if (!note?.trim()) return;
        await updateDoc(doc(db, "trip_requests", req.id), { status: "revision_requested", quote: null });
        await addDoc(collection(db, "trip_requests", req.id, "revisions"), { by: "client", note: note.trim(), created_at: Timestamp.now() });
        toast.success("Permintaan revisi terkirim");
      } else if (action === "reject") {
        await updateDoc(doc(db, "trip_requests", req.id), { status: "rejected" });
        toast.success("Pengajuan ditolak");
      }
    } catch (err) { toast.error(err.message); }
  };

  /* parallax value for hero */
  const parallax = Math.min(scrollY, 300);

  return (
    <div className="min-h-screen bg-[#F7F5F2]">

      {/* ═══════════════════════════ HERO SECTION ═══════════════════════════ */}
      {/* Task 1: foto destinasi sebagai background dengan overlay gelap */}
      <div ref={heroRef} className="relative w-full overflow-hidden min-h-[520px] md:min-h-[640px] flex flex-col justify-end">

        {/* ── Photo background with parallax ── */}
        <div
          className="absolute inset-0"
          style={{ transform: `scale(1.1) translateY(${parallax * 0.05}px)` }}
        >
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&auto=format&fit=crop&q=80"
            alt="Destinasi wisata alam Indonesia"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        {/* ── Dark overlay layers for text contrast ── */}
        <div className="absolute inset-0 bg-[#07080f]/65" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(120deg, rgba(7,8,15,0.88) 0%, rgba(7,8,15,0.5) 50%, rgba(7,8,15,0.25) 100%)" }} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(129,1,0,0.2) 0%, transparent 65%)" }} />
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* ── Hero content ── */}
        <div className="relative z-10 w-full pb-20 pt-[120px]">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-8 backdrop-blur-md"
              style={{ background: "rgba(129,1,0,0.15)", border: "1px solid rgba(129,1,0,0.25)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff6666] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff9999]">Trip & Wisata Premium</span>
            </div>

            {/* ── Task 2: headline yang diperbaiki ── */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
              Open Trip<br />
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #EDEBDD 0%, #C9A84C 50%, #EDEBDD 100%)", WebkitBackgroundClip: "text" }}>
                dan Private Trip
              </span>
              <br />
              <span className="text-white/30">Impianmu.</span>
            </h1>

            <p className="text-white/60 text-base md:text-lg max-w-xl leading-relaxed font-medium mb-10"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
              Ajukan perjalananmu — kami siapkan penawaran terbaik dalam{" "}
              <span className="text-white font-black px-2 py-0.5 rounded-md" style={{ background: "rgba(129,1,0,0.5)" }}>48 jam</span>.
            </p>

            {/* ── Task 3: Jelajahi Katalog → /tour-packages; Ajukan Trip → tab request ── */}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/tour-packages"
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-400 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #810100, #991A19)", boxShadow: "0 8px 24px rgba(129,1,0,0.3)" }}
              >
                <Compass size={14}/> Jelajahi Katalog
              </Link>
              <button
                onClick={() => {
                  if (!user) {
                    navigate("/login");
                  } else {
                    setActiveTab("request");
                    setShowForm(true);
                  }
                }}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-400 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #991A19, #810100)", boxShadow: "0 8px 24px rgba(129,1,0,0.3)" }}>
                <Send size={14}/> Ajukan Trip Kamu
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom fade into page bg ── */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to top, #F7F5F2 0%, rgba(247,245,242,0.6) 40%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to top, #F7F5F2, transparent)" }} />
      </div>

      {/* ═══════════════════════════ FEATURES STRIP ═══════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 -mt-6 mb-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="group bg-white rounded-2xl border border-[#EDEBDD]/30 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-400" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
              <div className="w-10 h-10 rounded-xl bg-[#F5E6E6] text-[#810100] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-400">
                {f.icon}
              </div>
              <p className="font-black text-[#1B1717] text-sm mb-1 tracking-tight">{f.title}</p>
              <p className="text-[#3D3636]/40 text-[10px] font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════ CONTENT ═══════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-28">

        {/* Banner khusus non-login (selalu tampil saat client belum login) */}
        {!user && (
          <div className="mb-12 relative overflow-hidden rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8"
            style={{ background: "linear-gradient(135deg, #1B1717 0%, #1e2d47 50%, #1B1717 100%)" }}>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #EDEBDD, transparent 70%)" }} />

            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDEBDD] mb-3">Buat Pengajuan Baru</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Rencanakan<br />Petualanganmu</h2>
              <p className="text-slate-400 max-w-md text-sm leading-relaxed">
                Pilih <strong className="text-white">Open Trip</strong> (sharing, lebih hemat) atau{" "}
                <strong className="text-white">Private Trip</strong> (eksklusif untuk grupmu).
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <Link to="/login"
                className="group flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-wider text-white transition-all duration-300 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #810100, #cc0000)", boxShadow: "0 20px 40px rgba(153,0,0,0.4)" }}>
                Login untuk Mengajukan <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
              </Link>
            </div>
          </div>
        )}

        {/* ─── TAB CATALOG ─── */}
        {activeTab === "catalog" && (
          <CatalogTab onAjukan={() => {
            if (!user) {
              navigate("/login");
            } else {
              setActiveTab("request");
              setShowForm(true);
            }
          }} />
        )}

        {/* ─── TAB REQUEST ─── */}
        {activeTab === "request" && (
          <div className="space-y-10">

            {/* Form trigger banner untuk user yang sudah login */}
            {user && !showForm && (
              <div className="relative overflow-hidden rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8"
                style={{ background: "linear-gradient(135deg, #1B1717 0%, #1e2d47 50%, #1B1717 100%)" }}>
                <div className="absolute inset-0 opacity-5"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10"
                  style={{ background: "radial-gradient(circle, #EDEBDD, transparent 70%)" }} />

                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDEBDD] mb-3">Buat Pengajuan Baru</p>
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Rencanakan<br />Petualanganmu</h2>
                  <p className="text-slate-400 max-w-md text-sm leading-relaxed">
                    Pilih <strong className="text-white">Open Trip</strong> (sharing, lebih hemat) atau{" "}
                    <strong className="text-white">Private Trip</strong> (eksklusif untuk grupmu).
                  </p>
                </div>

                <div className="relative z-10 shrink-0">
                  <button onClick={() => setShowForm(true)}
                    className="group flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #810100, #cc0000)", boxShadow: "0 20px 40px rgba(153,0,0,0.4)" }}>
                    <Send size={18}/> Ajukan Sekarang
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                </div>
              </div>
            )}

            {/* ─── FORM ─── */}
            {showForm && (
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-[1.5rem] shadow-[0_12px_48px_rgba(0,0,0,0.06)] overflow-hidden border border-[#EDEBDD]/30">
                {/* form header */}
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background: "#1B1717" }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#EDEBDD]/40 mb-0.5">FORM PENGAJUAN</p>
                    <h3 className="text-lg font-bold text-white tracking-tight">Detail perjalananmu</h3>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 text-white flex items-center justify-center font-bold text-lg transition-all duration-300">
                    ×
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* TIPE TRIP */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">TIPE TRIP</label>
                    <div className="grid grid-cols-2 gap-3.5">
                      <label className="cursor-pointer">
                        <input type="radio" name="type" value="open_trip" checked={formData.type === "open_trip"}
                          onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="sr-only"/>
                        <div className={`p-4 rounded-xl border text-left transition-all ${
                          formData.type === "open_trip"
                            ? "border-2 border-[#810100] bg-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}>
                          <div className={`mb-2 ${formData.type === "open_trip" ? "text-[#810100]" : "text-slate-700"}`}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 6v6"/>
                              <path d="M16 6v6"/>
                              <path d="M2 12h20"/>
                              <path d="M18 18h2a1 1 0 0 0 1-1V9a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v8a1 1 0 0 0 1 1h2"/>
                              <circle cx="7" cy="18" r="2"/>
                              <circle cx="17" cy="18" r="2"/>
                            </svg>
                          </div>
                          <p className={`font-bold text-sm mb-0.5 ${formData.type === "open_trip" ? "text-[#810100]" : "text-slate-800"}`}>Open trip</p>
                          <p className="text-xs text-slate-500 font-normal">Sharing seat, harga hemat</p>
                        </div>
                      </label>

                      <label className="cursor-pointer">
                        <input type="radio" name="type" value="private_trip" checked={formData.type === "private_trip"}
                          onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="sr-only"/>
                        <div className={`p-4 rounded-xl border text-left transition-all ${
                          formData.type === "private_trip"
                            ? "border-2 border-[#810100] bg-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}>
                          <div className={`mb-2 ${formData.type === "private_trip" ? "text-[#810100]" : "text-slate-700"}`}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/>
                              <circle cx="7" cy="17" r="2"/>
                              <circle cx="17" cy="17" r="2"/>
                            </svg>
                          </div>
                          <p className={`font-bold text-sm mb-0.5 ${formData.type === "private_trip" ? "text-[#810100]" : "text-slate-800"}`}>Private trip</p>
                          <p className="text-xs text-slate-500 font-normal">Eksklusif untuk grupmu</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* PILIH TIER TRIP */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">PILIH TIER TRIP</label>
                    <div className="grid grid-cols-2 gap-3.5">
                      <label className="cursor-pointer">
                        <input type="radio" name="tier" value="vip" checked={formData.tier === "vip"}
                          onChange={e => setFormData(p => ({ ...p, tier: e.target.value }))} className="sr-only"/>
                        <div className={`p-4 rounded-xl border text-left transition-all ${
                          formData.tier === "vip"
                            ? "border-2 border-[#810100] bg-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}>
                          <p className={`font-bold text-sm mb-0.5 ${formData.tier === "vip" ? "text-[#810100]" : "text-slate-800"}`}>VIP</p>
                          <p className="text-xs text-slate-500 font-normal">Snack + makan 2x</p>
                        </div>
                      </label>

                      <label className="cursor-pointer">
                        <input type="radio" name="tier" value="reguler" checked={formData.tier === "reguler"}
                          onChange={e => setFormData(p => ({ ...p, tier: e.target.value }))} className="sr-only"/>
                        <div className={`p-4 rounded-xl border text-left transition-all ${
                          formData.tier === "reguler"
                            ? "border-2 border-[#810100] bg-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}>
                          <p className={`font-bold text-sm mb-0.5 ${formData.tier === "reguler" ? "text-[#810100]" : "text-slate-800"}`}>Reguler</p>
                          <p className="text-xs text-slate-500 font-normal">Tanpa snack dan makan</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* DESTINASI / RUTE */}
                  <div>
                    <label className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-2 block">DESTINASI / RUTE</label>
                    <input type="text" required value={formData.destination}
                      onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))}
                      placeholder="Bromo, Malang, Batu..."
                      className="w-full px-4 py-3 bg-[#FAFAF6] border border-[#EDEBDD]/40 rounded-xl text-sm font-medium text-[#1B1717] focus:outline-none focus:border-[#810100]/30 placeholder:text-[#3D3636]/25 transition-all duration-300"/>
                  </div>

                  {/* TANGGAL MULAI & TANGGAL SELSEAI */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-2 block">TANGGAL MULAI</label>
                      <input type="date" required min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        value={formData.proposed_date}
                        onChange={e => setFormData(p => ({ ...p, proposed_date: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#FAFAF6] border border-[#EDEBDD]/40 rounded-xl text-sm font-medium text-[#1B1717] focus:outline-none focus:border-[#810100]/30 transition-all duration-300"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-2 block">TANGGAL SELESAI</label>
                      <input type="date" required min={formData.proposed_date || new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        value={formData.end_date}
                        onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#FAFAF6] border border-[#EDEBDD]/40 rounded-xl text-sm font-medium text-[#1B1717] focus:outline-none focus:border-[#810100]/30 transition-all duration-300"/>
                    </div>
                  </div>

                  {/* JUMLAH PESERTA & NOMOR WHATSAPP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-2 block">JUMLAH PESERTA</label>
                      <input type="number" min={1} max={50} value={formData.participant_count}
                        onChange={e => setFormData(p => ({ ...p, participant_count: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#FAFAF6] border border-[#EDEBDD]/40 rounded-xl text-sm font-medium text-[#1B1717] focus:outline-none focus:border-[#810100]/30 transition-all duration-300"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-2 block">NOMOR WHATSAPP</label>
                      <input type="tel" required value={formData.whatsapp}
                        onChange={e => setFormData(p => ({ ...p, whatsapp: e.target.value }))}
                        placeholder="0812..."
                        className="w-full px-4 py-3 bg-[#FAFAF6] border border-[#EDEBDD]/40 rounded-xl text-sm font-medium text-[#1B1717] focus:outline-none focus:border-[#810100]/30 placeholder:text-[#3D3636]/25 transition-all duration-300"/>
                    </div>
                  </div>

                  {/* CATATAN TAMBAHAN */}
                  <div>
                    <label className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-2 block">CATATAN TAMBAHAN</label>
                    <textarea rows={3} value={formData.notes}
                      onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Permintaan khusus, kebutuhan khusus, jalur favorit..."
                      className="w-full px-4 py-3 bg-[#FAFAF6] border border-[#EDEBDD]/40 rounded-xl text-sm font-medium text-[#1B1717] resize-none focus:outline-none focus:border-[#810100]/30 placeholder:text-[#3D3636]/25 transition-all duration-300"/>
                  </div>

                  {/* SUBMIT BUTTON & SLA */}
                  <div className="pt-2">
                    <button type="submit" disabled={submitting}
                      className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-300 flex items-center justify-center gap-2.5 hover:shadow-[0_8px_32px_rgba(129,1,0,0.25)] disabled:opacity-60 active:scale-[0.98]"
                      style={{ background: submitting ? "#999" : "linear-gradient(135deg, #810100, #991A19)" }}>
                      {submitting ? <><RefreshCw size={14} className="animate-spin"/> Mengirim…</> : <><Send size={14}/> Kirim pengajuan trip</>}
                    </button>
                    <p className="text-center text-[10px] text-[#3D3636]/30 font-bold uppercase tracking-[0.15em] mt-3">
                      Tim kami akan merespons pengajuanmu maksimal dalam 2x24 jam
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* ─── MY REQUESTS ─── */}
            {user && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.3em] mb-2">Pengajuan Saya</p>
                    <h2 className="text-3xl font-black text-[#1B1717] tracking-tight">Pantau Status <span className="text-[#810100]">Trip Anda</span></h2>
                  </div>
                  {myRequests.length > 0 && (
                    <span className="px-4 py-2 rounded-full bg-[#810100]/10 text-[#810100] text-[10px] font-black uppercase tracking-[0.2em]">
                      {myRequests.length} Pengajuan
                    </span>
                  )}
                </div>

                {loadingReq ? (
                  <div className="flex flex-col items-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-[#EDEBDD] border-t-[#810100] rounded-full animate-spin"/>
                    <p className="text-[#3D3636]/30 font-bold text-[10px] uppercase tracking-[0.2em]">Memuat…</p>
                  </div>
                ) : myRequests.length === 0 ? (
                  <div className="bg-white rounded-[1.5rem] border border-[#EDEBDD]/30 border-dashed py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#FAFAF6] flex items-center justify-center mx-auto mb-4">
                      <Map size={28} className="text-[#3D3636]/20"/>
                    </div>
                    <p className="font-black text-[#3D3636]/30 mb-1">Belum ada pengajuan</p>
                    <p className="text-[#3D3636]/20 text-sm">Klik "Ajukan Sekarang" untuk memulai</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map(req => {
                      const meta = STATUS_META[req.status] || {};
                      const isExp = expandedId === req.id;
                      const isQuoted = req.status === "quoted" && req.quote;
                      return (
                        <div key={req.id} className="bg-white rounded-[1.5rem] border border-[#EDEBDD]/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                          {/* top gradient bar by status */}
                          <div className={`h-1 w-full bg-gradient-to-r ${meta.bg || "from-slate-300 to-slate-400"}`}/>
                          <div className="p-6 flex flex-wrap gap-4 items-center cursor-pointer" onClick={() => toggleExpand(req.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap gap-2 mb-2 items-center">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r text-white ${meta.bg || "from-slate-400 to-slate-500"}`}>
                                  {meta.icon} {meta.label}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                  {(req.type === "open_trip" ? "Open Trip" : "Private Trip") + (req.tier ? ` · ${req.tier.toUpperCase()}` : "")}
                                </span>
                                {req.dp_paid && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">✓ DP Lunas</span>}
                              </div>
                              <p className="font-black text-slate-900 text-lg">{req.destination}</p>
                              <div className="flex flex-wrap gap-3 mt-1 text-[11px] font-bold text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11}/>
                                  {req.proposed_date ? new Date(req.proposed_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                  {req.end_date ? ` — ${new Date(req.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                                </span>
                                <span className="flex items-center gap-1"><Users size={11}/> {req.participant_count} peserta</span>
                                {req.whatsapp && <span className="flex items-center gap-1"><Phone size={11}/> {req.whatsapp}</span>}
                              </div>
                            </div>
                            {isExp ? <ChevronUp size={18} className="text-slate-300 shrink-0"/> : <ChevronDown size={18} className="text-slate-300 shrink-0"/>}
                          </div>

                          {isExp && (
                            <div className="border-t border-[#EDEBDD]/30 px-6 pb-6 pt-5 space-y-5">
                              {/* SLA notice */}
                              {["submitted","in_review"].includes(req.status) && req.sla_deadline && (() => {
                                const dl = req.sla_deadline?.toDate?.() || new Date(req.sla_deadline);
                                const h = (dl - new Date()) / 3600000;
                                return h > 0 ? (
                                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FAFAF6] border border-[#EDEBDD]/30">
                                    <Clock size={16} className="text-amber-500 shrink-0"/>
                                    <p className="text-sm font-bold text-amber-700">Admin merespons sebelum <strong>{dl.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</strong></p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
                                    <AlertTriangle size={16} className="text-red-500 shrink-0"/>
                                    <p className="text-sm font-bold text-red-700">SLA terlewati — hubungi admin segera.</p>
                                  </div>
                                );
                              })()}

                              {/* Quote card */}
                              {isQuoted && (
                                <div className="rounded-[1.5rem] overflow-hidden border border-purple-100">
                                  <div className="px-6 py-4" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-purple-200 mb-0.5">Penawaran Harga dari Admin</p>
                                    <p className="text-white font-black text-2xl">Rp {Number(req.quote.total).toLocaleString()}</p>
                                  </div>
                                  <div className="p-6 bg-purple-50/50 space-y-3">
                                    {req.quote.line_items?.map((item, i) => (
                                      <div key={i} className="flex justify-between text-sm">
                                        <span className="text-slate-600 font-medium">{item.label}</span>
                                        <span className="font-black text-slate-900">Rp {Number(item.amount).toLocaleString()}</span>
                                      </div>
                                    ))}
                                    <div className="border-t border-purple-200 pt-3 flex justify-between text-sm">
                                      <span className="text-slate-500 font-bold">Down Payment (DP)</span>
                                      <span className="font-black text-[#810100]">Rp {Number(req.quote.dp_amount).toLocaleString()}</span>
                                    </div>
                                  </div>
                                  <div className="px-6 pb-6 pt-2 bg-purple-50/50 grid grid-cols-3 gap-3">
                                    <button onClick={() => respondQuote(req, "accept")}
                                      className="col-span-2 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                                      style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 8px 24px rgba(5,150,105,0.2)" }}>
                                      <CheckCircle size={14}/> Setuju &amp; Bayar DP
                                    </button>
                                    <button onClick={() => respondQuote(req, "revise")}
                                      className="py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-orange-600 bg-orange-100 hover:bg-orange-200 transition-all duration-300 flex items-center justify-center gap-1">
                                      <MessageSquare size={12}/> Revisi
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Revisions */}
                              {(revisions[req.id] || []).length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.2em]">Riwayat Komunikasi</p>
                                  {revisions[req.id].map((rv, i) => (
                                    <div key={i} className={`p-4 rounded-2xl text-sm ${rv.by === "admin" ? "bg-blue-50/50 border border-blue-100/60" : "bg-orange-50/50 border border-orange-100/60"}`}>
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3D3636]/30 mb-1">
                                        {rv.by === "admin" ? "👤 Admin" : "🙋 Kamu"}
                                      </p>
                                      <p className="text-[#1B1717]">{rv.note}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!user && !showForm && (
              <div className="bg-white rounded-[1.5rem] border border-[#EDEBDD]/30 py-20 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="w-20 h-20 rounded-full bg-[#FAFAF6] flex items-center justify-center mx-auto mb-5">
                  <Users size={32} className="text-[#3D3636]/20"/>
                </div>
                <p className="font-black text-[#3D3636]/40 mb-2">Login untuk melihat pengajuanmu</p>
                <Link to="/login"
                  className="inline-flex items-center gap-2 mt-4 px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all hover:scale-105 duration-300"
                  style={{ background: "linear-gradient(135deg, #810100, #991A19)", boxShadow: "0 10px 30px rgba(129,1,0,0.25)" }}>
                  Login Sekarang <ArrowRight size={14}/>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ CATALOG TAB ═══════════════════════════ */
function CatalogTab({ onAjukan }) {
  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "open_trips"), orderBy("tanggalBerangkat", "asc"));
    return onSnapshot(q, snap => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status === "Tersedia"));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-[#EDEBDD] border-t-[#810100] rounded-full animate-spin"/>
      <p className="text-[#3D3636]/30 font-bold text-[10px] uppercase tracking-[0.2em]">Memuat Katalog…</p>
    </div>
  );

  if (trips.length === 0) return (
    <div className="text-center py-16 space-y-8">
      <div className="relative inline-block">
        <div className="w-40 h-40 rounded-full mx-auto flex items-center justify-center bg-[#FAFAF6]">
          <Mountain size={56} className="text-[#3D3636]/15"/>
        </div>
        <div className="absolute -top-2 -right-2 text-3xl animate-bounce">🗺️</div>
      </div>
      <div>
        <h3 className="text-2xl font-black text-[#1B1717] mb-2">Belum Ada Jadwal Open Trip</h3>
        <p className="text-[#3D3636]/40 max-w-md mx-auto text-sm">Jadwal open trip segera hadir. Sementara itu, ajukan <strong>Private Trip</strong> eksklusif untuk grupmu!</p>
      </div>
      <button onClick={onAjukan}
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all hover:scale-105 duration-300"
        style={{ background: "linear-gradient(135deg, #810100, #991A19)", boxShadow: "0 16px 40px rgba(129,1,0,0.25)" }}>
        <Send size={14}/> Ajukan Private Trip <ArrowRight size={14}/>
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.3em] mb-2">Katalog Open Trip</p>
          <h2 className="text-3xl font-black text-[#1B1717] tracking-tight">Jadwal Open Trip <span className="text-[#810100]">Aktif</span></h2>
          <p className="text-[#3D3636]/40 text-sm font-bold mt-1">{trips.length} perjalanan tersedia</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip, idx) => {
          const filled = Math.round((trip.kuotaTerisi / trip.kapasitasMaks) * 100);
          const isFull = trip.kuotaTerisi >= trip.kapasitasMaks;
          return (
            <div key={trip.id} className="group bg-white rounded-[1.5rem] overflow-hidden border border-[#EDEBDD]/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
              <div className="relative h-24 flex items-center justify-center overflow-hidden"
                style={{ background: `linear-gradient(135deg, hsl(${(idx * 47) % 360}, 70%, 20%), hsl(${(idx * 47 + 40) % 360}, 60%, 30%))` }}>
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)", backgroundSize: "15px 15px" }}/>
                <Mountain size={40} className="text-white/30"/>
                <div className="absolute top-3 left-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${isFull ? "bg-red-500 text-white" : "bg-emerald-400 text-emerald-900"}`}>
                    {isFull ? "Penuh" : "Tersedia"}
                  </span>
                </div>
                <div className="absolute top-3 right-4">
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold backdrop-blur-sm">{trip.mobilUtama}</span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-black text-[#1B1717] text-lg group-hover:text-[#810100] transition-colors duration-300 line-clamp-2 mb-1">{trip.judul}</h3>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-black text-[#810100]">Rp {trip.hargaPerPax?.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-[#3D3636]/30 uppercase tracking-[0.1em]">/seat</span>
                </div>

                <div className="space-y-2.5 mb-5 flex-1">
                  <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500">
                    <div className="w-6 h-6 rounded-lg bg-[#FAFAF6] flex items-center justify-center shrink-0">
                      <Map size={12} className="text-[#3D3636]/30"/>
                    </div>
                    <span className="truncate text-[#3D3636]/60">{trip.destinasi}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] font-bold text-[#3D3636]/50">
                    <div className="w-6 h-6 rounded-lg bg-[#FAFAF6] flex items-center justify-center shrink-0">
                      <Calendar size={12} className="text-[#3D3636]/30"/>
                    </div>
                    <span>{new Date(trip.tanggalBerangkat).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span>
                  </div>
                  {trip.waktuKumpul && (
                    <div className="flex items-center gap-2.5 text-[11px] font-bold text-[#3D3636]/50">
                      <div className="w-6 h-6 rounded-lg bg-[#FAFAF6] flex items-center justify-center shrink-0">
                        <Clock size={12} className="text-[#3D3636]/30"/>
                      </div>
                      <span>{trip.waktuKumpul}{trip.titikKumpul ? ` · ${trip.titikKumpul}` : ""}</span>
                    </div>
                  )}
                </div>

                {/* occupancy bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.2em] mb-2">
                    <span>Kursi Terisi</span>
                    <span>{trip.kuotaTerisi}/{trip.kapasitasMaks}</span>
                  </div>
                  <div className="h-2 bg-[#FAFAF6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${filled}%`,
                        background: filled >= 100 ? "#ef4444" : filled >= 75 ? "#f97316" : "linear-gradient(90deg, #810100, #991A19)"
                      }}/>
                  </div>
                </div>

                <Link to="/login"
                  className={`w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-center transition-all duration-300 flex items-center justify-center gap-2 ${
                    isFull
                      ? "bg-[#FAFAF6] text-[#3D3636]/30 cursor-not-allowed"
                      : "text-white hover:scale-[1.02] group-hover:shadow-lg"
                  }`}
                  style={!isFull ? { background: "linear-gradient(135deg, #810100, #991A19)", boxShadow: "0 8px 20px rgba(129,1,0,0.2)" } : {}}>
                  {isFull ? "Penuh" : <><Users size={14}/> Daftar Sekarang</>}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
