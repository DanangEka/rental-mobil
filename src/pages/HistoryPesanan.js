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
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-3">
              <History size={14} />
              <span>Log Perjalanan Anda</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">History Pesanan</h1>
          </div>
          <button onClick={handleRefresh} className="flex items-center gap-2 bg-white px-6 py-3.5 rounded-2xl font-bold shadow-sm border border-slate-100 active:scale-95 transition-all">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" placeholder="Cari mobil..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-[#990000] transition-all font-semibold"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none">
            <option value="all">Semua Status</option>
            <option value="ongoing">Berjalan</option>
            <option value="lunas">Lunas</option>
            <option value="selesai">Selesai</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>

        {/* List */}
        <div className="space-y-6">
          {filteredPemesanan.map(p => (
            <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all p-6 md:p-10">
              <div className="flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-red-50 text-[#990000] rounded-3xl flex items-center justify-center shrink-0">
                    <Car size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{p.namaMobil}</h3>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                       <span>#{p.id.slice(0,8)}</span>
                       <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                       <span>{p.rentalType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimasi Biaya</p>
                  <p className="text-3xl font-black text-[#990000]">Rp {p.perkiraanHarga?.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><Calendar size={12} /> Periode</p>
                  <p className="text-xs font-black text-slate-700">{new Date(p.tanggalMulai).toLocaleDateString()} - {new Date(p.tanggalSelesai).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><MapPin size={12} /> Lokasi</p>
                  <p className="text-xs font-black text-slate-700">{p.lokasiPenyerahan}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><CreditCard size={12} /> Pembayaran</p>
                  <p className="text-xs font-black text-slate-700">{p.paymentMethod || "Belum dipilih"}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><Info size={12} /> Plat Nomor</p>
                  <p className="text-xs font-black text-slate-700">{p.platNomor || "TBA"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 mt-10 pt-8 border-t border-slate-50">
                <div className="flex flex-wrap gap-4">
                  {/* Action Buttons */}
                  {p.status === "diproses" && (
                    <button onClick={() => { setSelectedOrder(p); setCancelModal(true); }} className="flex items-center gap-2 text-red-500 font-bold text-xs hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
                      <Trash2 size={16} /> Batalkan
                    </button>
                  )}
                  
                  {(p.status === "menunggu pembayaran" || p.status === "disetujui_cash") && (
                    <button onClick={() => { setSelectedOrder(p); setPaymentModal(true); }} className="bg-[#990000] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all animate-pulse">
                      Konfirmasi Pembayaran
                    </button>
                  )}

                  {/* Document Downloads */}
                  {["pembayaran berhasil", "lunas", "selesai"].includes(p.status) && (
                    <button onClick={() => InvoiceGenerator.generateDPInvoice(p, auth.currentUser)} className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                      <Download size={14} /> Download Invoice DP
                    </button>
                  )}
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                   Update: {new Date(p.tanggal).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && selectedOrder && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Pembayaran DP</h3>
              <button onClick={() => setPaymentModal(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={32} /></button>
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
                <div className="grid grid-cols-2 gap-4">
                  {["Transfer Bank", "Cash"].map(m => (
                    <button 
                      key={m} onClick={() => setPaymentForm({ ...paymentForm, method: m })}
                      className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${paymentForm.method === m ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 opacity-60'}`}
                    >{m}</button>
                  ))}
                </div>
              </div>

              {paymentForm.method === "Transfer Bank" && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Tujuan Transfer</p>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">Bank BCA</span>
                        <span className="text-sm font-black text-slate-900 tracking-widest">123456789 (Cakra)</span>
                      </div>
                   </div>
                   <input 
                      type="file" accept="image/*" onChange={e => setPaymentForm({ ...paymentForm, proof: e.target.files[0] })}
                      className="mt-6 w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#990000] file:text-white"
                   />
                </div>
              )}

              {paymentForm.method === "Cash" && selectedOrder.status === "disetujui_cash" && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Input Nominal DP (IDR)</label>
                  <input 
                    type="number" value={paymentForm.dpAmount} onChange={e => setPaymentForm({ ...paymentForm, dpAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-[#990000] focus:border-[#990000] outline-none"
                    placeholder="Contoh: 500000"
                  />
                  <p className="text-[10px] text-amber-600 font-bold italic">*Masukkan jumlah uang yang akan Anda berikan tunai.</p>
                </div>
              )}

              <button 
                onClick={handlePaymentSubmit}
                className="w-full py-5 bg-[#990000] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all mt-6"
              >
                Konfirmasi & Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl animate-scaleUp text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle size={36} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Batalkan Pesanan?</h3>
            <p className="text-slate-500 text-sm italic mb-8">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleCancelSubmit} className="bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Ya, Batal</button>
              <button onClick={() => setCancelModal(false)} className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
