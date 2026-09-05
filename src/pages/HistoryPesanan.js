import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { 
  Car, Search, Calendar, MapPin, CreditCard, 
  AlertTriangle, Info, RefreshCw, X, Download, Trash2, History
} from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";
import SkeletonLoader from "../components/SkeletonLoader";

export default function HistoryPesanan() {
  const [pemesanan, setPemesanan] = useState([]);
  const [filteredPemesanan, setFilteredPemesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals state
  const [cancelModal, setCancelModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Payment Form state
  const [paymentForm, setPaymentForm] = useState({
    method: "",
    proof: null,
    dpAmount: ""
  });

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        setPemesanan([]);
        return;
      }

      const q = query(
        collection(db, "pemesanan"),
        where("uid", "==", user.uid),
        orderBy("tanggal", "desc")
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const pemesananData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPemesanan(pemesananData);
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  useEffect(() => {
    let filtered = [...pemesanan];

    if (filterStatus !== "all") {
      if (filterStatus === "ongoing") {
        filtered = filtered.filter(p => !["selesai", "lunas", "dibatalkan", "ditolak"].includes(p.status));
      } else {
        filtered = filtered.filter(p => p.status === filterStatus);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.namaMobil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.tanggal) - new Date(a.tanggal);
        case "oldest": return new Date(a.tanggal) - new Date(b.tanggal);
        case "price-high": return (b.perkiraanHarga || 0) - (a.perkiraanHarga || 0);
        case "price-low": return (a.perkiraanHarga || 0) - (b.perkiraanHarga || 0);
        default: return 0;
      }
    });

    setFilteredPemesanan(filtered);
  }, [pemesanan, filterStatus, sortBy, searchTerm]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const addNotification = async (message, userId = auth.currentUser.uid) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        message,
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (e) { console.error(e); }
  };

  // Logic: Payment Submit
  const handlePaymentSubmit = async () => {
    if (!paymentForm.method) return alert("Pilih metode pembayaran");
    
    const isCash = paymentForm.method === "Cash";
    const needsProof = !isCash;
    
    if (needsProof && !paymentForm.proof) return alert("Unggah bukti transfer");
    
    // Validasi DP untuk Transfer Bank & E-Wallet (minimal 50%)
    if (paymentForm.method === "Transfer Bank" || paymentForm.method === "E-Wallet") {
      if (!paymentForm.dpAmount) {
        return alert("Masukkan nominal DP yang Anda bayarkan");
      }
      const minDp = selectedOrder.perkiraanHarga * 0.5;
      if (parseFloat(paymentForm.dpAmount) < minDp) {
        return alert(`Nominal DP minimal adalah 50% (Rp ${minDp.toLocaleString()})`);
      }
    }

    if (isCash && selectedOrder.status === "disetujui_cash" && !paymentForm.dpAmount) {
      return alert("Masukkan nominal DP yang akan Anda setor");
    }

    try {
      let proofUrl = null;
      if (needsProof) {
        const formData = new FormData();
        formData.append("file", paymentForm.proof);
        formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "rental-mobil");
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dnfruux8d"}/image/upload`, {
          method: "POST", body: formData
        });
        const data = await res.json();
        proofUrl = data.secure_url;
      }

      const updateData = {
        paymentMethod: paymentForm.method,
        paymentStatus: isCash ? (selectedOrder.status === "disetujui_cash" ? "dp_cash_submitted" : "cash_submitted") : "submitted",
        waktuUpload: new Date().toISOString()
      };

      if (proofUrl) updateData.paymentProof = proofUrl;
      if (paymentForm.dpAmount) updateData.dpAmount = parseFloat(paymentForm.dpAmount);

      await updateDoc(doc(db, "pemesanan", selectedOrder.id), updateData);
      
      addNotification(`Bukti pembayaran ${selectedOrder.namaMobil} berhasil dikirim`);
      addNotification(`Permintaan pembayaran dari ${auth.currentUser.email}`, "admin");
      
      setPaymentModal(false);
      setPaymentForm({ method: "", proof: null, dpAmount: "" });
      alert("Pembayaran berhasil diajukan. Menunggu verifikasi admin.");
    } catch (e) {
      console.error(e);
      alert("Gagal mengirim data");
    }
  };

  const handleCancelSubmit = async () => {
    try {
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), { status: "dibatalkan" });
      await updateDoc(doc(db, "mobil", selectedOrder.mobilId), { tersedia: true, status: "normal" });
      alert("Pesanan berhasil dibatalkan");
      setCancelModal(false);
    } catch (e) { console.error(e); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "diproses": return "bg-amber-100 text-amber-700 border-amber-200";
      case "disetujui": return "bg-blue-100 text-blue-700 border-blue-200";
      case "disetujui_cash": return "bg-blue-100 text-blue-700 border-blue-200";
      case "menunggu pembayaran": return "bg-orange-100 text-orange-700 border-orange-200";
      case "pembayaran berhasil": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "lunas": return "bg-teal-100 text-teal-700 border-teal-200";
      case "selesai": return "bg-slate-100 text-slate-700 border-slate-200";
      case "ditolak": return "bg-red-100 text-red-700 border-red-200";
      case "dibatalkan": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-slate-50 text-slate-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[160px] px-8">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader.PageHeaderSkeleton />
          <div className="space-y-6 mt-12">
            {[1, 2].map(i => <SkeletonLoader.OrderSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF6] pt-[160px] pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-[#810100] font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
              <History size={13} />
              <span>Log Perjalanan Anda</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-[#1B1717] tracking-tight">History Pesanan</h1>
          </div>
          <button onClick={handleRefresh} className="flex items-center gap-2 bg-white px-6 py-3.5 rounded-2xl font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#EDEBDD]/30 active:scale-95 transition-all duration-300 text-sm">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-10">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3636]/20" size={16} />
            <input 
              type="text" placeholder="Cari mobil..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#EDEBDD]/30 rounded-2xl pl-12 pr-6 py-3.5 outline-none focus:border-[#810100]/30 transition-all duration-300 font-semibold text-sm"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-[#EDEBDD]/30 rounded-2xl px-6 py-3.5 font-bold text-sm outline-none">
            <option value="all">Semua Status</option>
            <option value="ongoing">Berjalan</option>
            <option value="lunas">Lunas</option>
            <option value="selesai">Selesai</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-[#EDEBDD]/30 rounded-2xl px-6 py-3.5 font-bold text-sm outline-none">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>

        {/* List */}
        <div className="space-y-5">
          {filteredPemesanan.map(p => (
            <div key={p.id} className="bg-white rounded-[1.5rem] border border-[#EDEBDD]/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-400 p-6 md:p-8" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex gap-5">
                  <div className="w-16 h-16 bg-[#F5E6E6] text-[#810100] rounded-2xl flex items-center justify-center shrink-0">
                    <Car size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-black text-[#1B1717] tracking-tight uppercase">{p.namaMobil}</h3>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[#3D3636]/30 font-bold text-[10px] uppercase tracking-[0.15em]">
                       <span>#{p.id.slice(0,8)}</span>
                       <span className="w-1 h-1 bg-[#EDEBDD] rounded-full"></span>
                       <span>{p.rentalType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.2em] mb-1">Estimasi Biaya</p>
                  <p className="text-2xl font-black text-[#810100]">Rp {p.perkiraanHarga?.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-[#FAFAF6] p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5"><Calendar size={11} /> Periode</p>
                  <p className="text-xs font-black text-[#1B1717]">{new Date(p.tanggalMulai).toLocaleDateString()} - {new Date(p.tanggalSelesai).toLocaleDateString()}</p>
                </div>
                <div className="bg-[#FAFAF6] p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5"><MapPin size={11} /> Lokasi</p>
                  <p className="text-xs font-black text-[#1B1717]">{p.lokasiPenyerahan}</p>
                  {(p.deliveryAddress || p.titikTemuAddress) && (
                    <p className="text-[10px] text-[#3D3636]/40 mt-1 italic line-clamp-2">{p.deliveryAddress || p.titikTemuAddress}</p>
                  )}
                </div>
                <div className="bg-[#FAFAF6] p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5"><CreditCard size={11} /> Pembayaran</p>
                  <p className="text-xs font-black text-[#1B1717]">{p.paymentMethod || "Belum dipilih"}</p>
                </div>
                <div className="bg-[#FAFAF6] p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5"><Info size={11} /> Plat Nomor</p>
                  <p className="text-xs font-black text-[#1B1717]">{p.platNomor || "TBA"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EDEBDD]/20">
                <div className="flex flex-wrap gap-3">
                  {/* Action Buttons */}
                  {p.status === "diproses" && (
                    <button onClick={() => { setSelectedOrder(p); setCancelModal(true); }} className="flex items-center gap-2 text-red-500 font-bold text-xs hover:bg-red-50 px-4 py-2 rounded-xl transition-all duration-300">
                      <Trash2 size={14} /> Batalkan
                    </button>
                  )}
                  
                  {(p.status === "menunggu pembayaran" || p.status === "disetujui_cash") && (
                    <button onClick={() => { setSelectedOrder(p); setPaymentModal(true); }} className="bg-[#810100] text-white px-7 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] shadow-[0_4px_20px_rgba(129,1,0,0.25)] active:scale-95 transition-all duration-300">
                      Konfirmasi Pembayaran
                    </button>
                  )}

                  {/* Document Downloads */}
                  {["pembayaran berhasil", "lunas", "selesai"].includes(p.status) && (
                    <button onClick={() => InvoiceGenerator.generateDPInvoice(p, auth.currentUser)} className="bg-[#1B1717] text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                      <Download size={13} /> Download Invoice DP
                    </button>
                  )}
                </div>
                <div className="text-[10px] font-black text-[#3D3636]/20 uppercase tracking-[0.15em]">
                   Update: {new Date(p.tanggal).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && selectedOrder && (
        <div className="fixed inset-0 z-[200] bg-[#1B1717]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-xl p-8 sm:p-10 shadow-[0_24px_64px_rgba(0,0,0,0.15)] animate-scaleUp">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-[#1B1717] tracking-tight">Pembayaran DP</h3>
              <button onClick={() => setPaymentModal(false)} className="text-[#3D3636]/20 hover:text-red-500 transition-colors duration-300"><X size={28} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4">
                <Info className="text-blue-500 shrink-0" />
                <p className="text-xs font-semibold text-blue-700 leading-relaxed">
                  Lakukan pembayaran DP sebesar 50% dari total biaya untuk mengunci jadwal armada pilihan Anda.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-4">
                  {["Transfer Bank", "E-Wallet", "Cash"].map(m => (
                    <button 
                      key={m} onClick={() => setPaymentForm({ ...paymentForm, method: m, dpAmount: "" })}
                      className={`py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all border-2 ${paymentForm.method === m ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 opacity-60'}`}
                    >{m}</button>
                  ))}
                </div>
              </div>

              {paymentForm.method === "Transfer Bank" && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Tujuan Transfer Bank</p>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">Bank BCA</span>
                        <span className="text-sm font-black text-slate-900 tracking-widest">123456789 (Cakra)</span>
                      </div>
                   </div>
                   <input 
                      type="file" accept="image/*" onChange={e => setPaymentForm({ ...paymentForm, proof: e.target.files[0] })}
                      className="mt-6 w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#810100] file:text-white"
                   />
                </div>
              )}

              {paymentForm.method === "E-Wallet" && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Tujuan E-Wallet</p>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">DANA / OVO</span>
                        <span className="text-sm font-black text-slate-900 tracking-widest">08123456789 (Cakra)</span>
                      </div>
                   </div>
                   <input 
                      type="file" accept="image/*" onChange={e => setPaymentForm({ ...paymentForm, proof: e.target.files[0] })}
                      className="mt-6 w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#810100] file:text-white"
                   />
                </div>
              )}

              {(paymentForm.method === "Transfer Bank" || paymentForm.method === "E-Wallet") && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nominal Pembayaran DP (IDR)</label>
                  <input 
                    type="number" value={paymentForm.dpAmount} onChange={e => setPaymentForm({ ...paymentForm, dpAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-[#810100] focus:border-[#810100] outline-none"
                    placeholder={`Contoh: ${(selectedOrder.perkiraanHarga * 0.5)}`}
                  />
                  <p className="text-[10px] text-amber-600 font-bold italic">
                    *Minimal DP 50% dari total: Rp {(selectedOrder.perkiraanHarga * 0.5).toLocaleString()}
                  </p>
                </div>
              )}

              {paymentForm.method === "Cash" && selectedOrder.status === "disetujui_cash" && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Input Nominal DP (IDR)</label>
                  <input 
                    type="number" value={paymentForm.dpAmount} onChange={e => setPaymentForm({ ...paymentForm, dpAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-[#810100] focus:border-[#810100] outline-none"
                    placeholder="Contoh: 500000"
                  />
                  <p className="text-[10px] text-amber-600 font-bold italic">*Masukkan jumlah uang yang akan Anda berikan tunai.</p>
                </div>
              )}

              <button 
                onClick={handlePaymentSubmit}
                className="w-full py-5 bg-[#810100] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all mt-6"
              >
                Konfirmasi & Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[200] bg-[#1B1717]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-[0_24px_64px_rgba(0,0,0,0.15)] animate-scaleUp text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
               <AlertTriangle size={30} />
            </div>
            <h3 className="text-xl font-black text-[#1B1717] mb-2 tracking-tight">Batalkan Pesanan?</h3>
            <p className="text-[#3D3636]/40 text-sm italic mb-8">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCancelSubmit} className="bg-red-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] shadow-[0_4px_16px_rgba(220,38,38,0.25)]">Ya, Batal</button>
              <button onClick={() => setCancelModal(false)} className="bg-[#FAFAF6] text-[#3D3636]/50 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] border border-[#EDEBDD]/30">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
