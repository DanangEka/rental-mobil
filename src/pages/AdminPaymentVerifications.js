import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { CreditCard, DollarSign, Eye, FileText, Filter, Clock } from "lucide-react";

export default function AdminPaymentVerifications() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "paymentVerifications"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const verificationsData = [];
      querySnapshot.forEach((doc) => {
        verificationsData.push({ id: doc.id, ...doc.data() });
      });
      setVerifications(verificationsData);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;
    if (["pending", "approved", "rejected"].includes(filter)) {
      return verification.status === filter;
    }
    const now = new Date();
    const verificationDate = verification.timestamp?.toDate ? verification.timestamp.toDate() : new Date(verification.timestamp);
    if (filter === "today") return verificationDate.toDateString() === now.toDateString();
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
            <DollarSign size={14} />
            <span>Financial Logistics</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verifikasi Pembayaran</h1>
          <p className="text-slate-500 mt-1">Audit setoran tunai dari mitra pengemudi untuk validasi harian.</p>
        </div>

        {/* Filters and Stats Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter size={14} /> Log Filter
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: "all", label: "Semua Laporan" },
                  { id: "pending", label: "Menunggu Approval" },
                  { id: "approved", label: "Disetujui" },
                  { id: "rejected", label: "Ditolak" },
                  { id: "today", label: "Hari Ini" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-5 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-widest transition-all ${filter === f.id ? 'bg-[#990000] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#990000] rounded-3xl p-8 text-white shadow-lg overflow-hidden relative">
               <div className="relative z-10">
                  <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-1">Menunggu Review</p>
                  <p className="text-4xl font-black">{verifications.filter(v => v.status === "pending").length}</p>
               </div>
               <div className="absolute right-0 bottom-0 p-6 opacity-20 relative z-0">
                  <Clock size={60} />
               </div>
            </div>
          </div>

          <div className="lg:col-span-3">
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                   <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Daftar Setoran</h2>
                   <span className="text-[10px] font-bold text-slate-400">{filteredVerifications.length} Entries</span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
                  {filteredVerifications.length === 0 ? (
                    <div className="p-20 text-center">
                       <FileText size={40} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-slate-400 font-bold italic text-sm">Tidak ada log pembayaran ditemukan.</p>
                    </div>
                  ) : (
                    filteredVerifications.map((v) => (
                      <div key={v.id} className="p-6 md:px-8 hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-center gap-6 flex-1">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${v.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                 <CreditCard size={24} />
                              </div>
                              <div>
                                 <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-lg font-black text-slate-900">{formatCurrency(v.amount)}</h4>
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                      v.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      v.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                      'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                      {v.status}
                                    </span>
                                 </div>
                                 <p className="text-xs font-bold text-slate-400">Driver: {v.driverId} • {formatDate(v.timestamp)}</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                                 <p className="text-[10px] font-mono text-slate-900">#{v.orderId?.substring(0, 8)}</p>
                              </div>
                              <button 
                                onClick={() => setSelectedVerification(v)}
                                className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                              >
                                Detail
                              </button>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>

        </div>

        {/* Modal Selection */}
        {selectedVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-scaleUp">
              <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Audit Transaksi</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Report #{selectedVerification.id.substring(0, 8)}</p>
                 </div>
                 <button onClick={() => setSelectedVerification(null)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors text-2xl font-black">×</button>
              </div>

              <div className="p-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">DP Diterima (Client)</p>
                             <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                               {formatCurrency(selectedVerification.dpAmount || (selectedVerification.totalAmount ? selectedVerification.totalAmount * 0.5 : 0))}
                             </p>
                          </div>
                          
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                             <p className="text-[10px] font-bold text-[#990000] uppercase tracking-widest mb-2">Pelunasan (Driver)</p>
                             <p className="text-2xl font-black text-[#990000] tracking-tighter">
                               {formatCurrency(selectedVerification.amount || 0)}
                             </p>
                          </div>
                       </div>
                       
                       <div className="space-y-4 pt-4">
                          <div className="flex justify-between items-center py-2 border-b border-slate-50">
                             <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Driver ID</span>
                             <span className="text-xs font-semibold text-slate-700">{selectedVerification.driverId}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-50">
                             <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Waktu Setor</span>
                             <span className="text-sm font-black text-slate-900">{formatDate(selectedVerification.timestamp)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-50">
                             <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Metode Pembayaran</span>
                             <span className="text-sm font-black text-slate-500 uppercase">{selectedVerification.method || selectedVerification.paymentMethod || "Tunai (Cash)"}</span>
                          </div>
                       </div>

                       {selectedVerification.notes && (
                         <div className="p-6 bg-red-50/50 border border-red-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-[#990000] uppercase tracking-widest mb-1 italic">Catatan Driver:</p>
                            <p className="text-sm text-slate-600 font-medium italic">"{selectedVerification.notes}"</p>
                         </div>
                       )}
                    </div>

                    <div>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lampiran Bukti</p>
                       {selectedVerification.paymentProof ? (
                         <div className="bg-slate-100 rounded-[2rem] overflow-hidden aspect-[3/4] border border-slate-200 shadow-inner group relative">
                            <img src={selectedVerification.paymentProof} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Proof" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6">
                               <a href={selectedVerification.paymentProof} target="_blank" rel="noreferrer" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl flex items-center gap-2">
                                  <Eye size={16} /> Buka Gambar
                               </a>
                            </div>
                         </div>
                       ) : (
                         <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 h-80 flex flex-col items-center justify-center text-slate-300">
                            <FileText size={48} className="mb-4" />
                            <p className="text-xs font-bold uppercase">No Image Provided</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
