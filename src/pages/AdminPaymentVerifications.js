import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { CreditCard, Calendar, User, DollarSign, Eye, CheckCircle, XCircle } from "lucide-react";

export default function AdminPaymentVerifications() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filter, setFilter] = useState("all"); // all, today, week, month, pending, approved, rejected

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch all payment verifications
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
    return new Date(timestamp.toDate()).toLocaleString("id-ID");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "approved":
        return "Disetujui";
      case "rejected":
        return "Ditolak";
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "cash":
        return "Tunai";
      case "transfer":
        return "Transfer Bank";
      case "other":
        return "Lainnya";
      default:
        return method;
    }
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;

    if (["pending", "approved", "rejected"].includes(filter)) {
      return verification.status === filter;
    }

    const now = new Date();
    const verificationDate = new Date(verification.timestamp?.toDate());

    switch (filter) {
      case "today":
        return verificationDate.toDateString() === now.toDateString();
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return verificationDate >= weekAgo;
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return verificationDate >= monthAgo;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[5%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-10 pt-8 animate-fadeInUp">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Verifikasi Pembayaran</h1>
          <p className="text-gray-400 text-lg">Validasi setoran tunai dari driver untuk memastikan integritas keuangan.</p>
        </div>

        {/* Filter Section */}
        <div className="mb-8 glass-card bg-gray-900/40 rounded-3xl p-6 border border-gray-800 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-wrap items-center gap-3">
             <div className="p-2 bg-brand-500/20 rounded-xl text-brand-400 mr-2">
                <CreditCard size={20} />
             </div>
            {["all", "pending", "approved", "rejected", "today"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-brand-sm"
                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-700"
                }`}
              >
                {f === "all" ? "Semua" : f === "pending" ? "Menunggu" : f === "approved" ? "Disetujui" : f === "rejected" ? "Ditolak" : "Hari Ini"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-brand-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                <p className="text-3xl font-black text-white">{verifications.length}</p>
              </div>
              <div className="p-3 bg-brand-500/20 rounded-2xl text-brand-400">
                <CreditCard size={24} />
              </div>
            </div>
          </div>
          
          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-yellow-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Menunggu</p>
                <p className="text-3xl font-black text-white">
                  {verifications.filter(v => v.status === "pending").length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-2xl text-yellow-400 text-xs font-black">
                WP
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-green-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Disetujui</p>
                <p className="text-3xl font-black text-white">
                  {verifications.filter(v => v.status === "approved").length}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-2xl text-green-400 text-xs font-black">
                OK
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-red-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Ditolak</p>
                <p className="text-3xl font-black text-white">
                  {verifications.filter(v => v.status === "rejected").length}
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-2xl text-red-400 text-xs font-black">
                REJ
              </div>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="glass-card bg-gray-900/40 rounded-3xl border border-gray-800 overflow-hidden animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="px-8 py-6 border-b border-gray-800 bg-gray-900/20 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <DollarSign size={20} className="text-brand-400" />
              Verifikasi Pembayaran ({filteredVerifications.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-800">
            {filteredVerifications.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={28} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">Belum ada data pembayaran yang masuk</p>
              </div>
            ) : (
              filteredVerifications.map((verification, idx) => (
                <div
                  key={verification.id}
                  className="p-8 hover:bg-gray-800/20 transition-all group"
                  style={{ animationDelay: `${0.1 * idx}s` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border ${
                          verification.status === "pending" 
                            ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" 
                            : verification.status === "approved"
                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                            : "bg-red-500/20 border-red-500/50 text-red-400"
                        }`}>
                          {getStatusText(verification.status)}
                        </span>
                        <span className="text-sm text-gray-500 font-semibold bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700">
                          {formatDate(verification.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nominal</p>
                          <p className="text-brand-400 font-black text-xl">{formatCurrency(verification.paymentAmount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Driver</p>
                          <p className="text-white font-bold">{verification.driverId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Metode</p>
                          <p className="text-gray-300 font-medium">{getPaymentMethodText(verification.paymentMethod)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order ID</p>
                          <p className="text-gray-500 font-mono text-xs truncate max-w-[120px]">{verification.orderId}</p>
                        </div>
                      </div>

                      {verification.notes && (
                        <div className="mt-4 p-4 bg-gray-950/50 border border-gray-800 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Catatan</p>
                          <p className="text-gray-400 text-sm italic">{verification.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                       <button
                        onClick={() => setSelectedVerification(verification)}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl border border-gray-700 transition-all group-hover:border-brand-500/50 active:scale-95 shadow-lg"
                      >
                        <Eye size={18} />
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Overlay */}
        {selectedVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div 
              className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-fadeIn" 
              onClick={() => setSelectedVerification(null)}
            ></div>
            
            <div className="relative bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoomIn max-h-[90vh] flex flex-col">
              <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-2xl">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Verifikasi Pembayaran</h3>
                  <p className="text-gray-400 text-sm mt-1">Order #{selectedVerification.orderId.substring(0, 8)}...</p>
                </div>
                <button
                  onClick={() => setSelectedVerification(null)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-800 text-gray-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="bg-gray-800/30 p-8 rounded-[2rem] border border-gray-800 text-center relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <DollarSign size={80} className="text-brand-500" />
                          </div>
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Total Diterima</h4>
                          <p className="text-4xl font-black text-brand-400 tracking-tight">{formatCurrency(selectedVerification.paymentAmount)}</p>
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 rounded-full border border-brand-500/20">
                             <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                             <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{getPaymentMethodText(selectedVerification.paymentMethod)}</span>
                          </div>
                       </div>

                       <div className="bg-gray-800/30 p-6 rounded-[2rem] border border-gray-800">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Informasi Transaksi</h4>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Status</span>
                                <span className={`px-3 py-1 text-[10px] font-black rounded-full border ${
                                   selectedVerification.status === 'approved' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 
                                   selectedVerification.status === 'pending' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' : 
                                   'bg-red-500/20 border-red-500/30 text-red-400'
                                }`}>
                                   {getStatusText(selectedVerification.status).toUpperCase()}
                                </span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Waktu Entry</span>
                                <span className="text-white text-sm font-bold">{formatDate(selectedVerification.timestamp)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Driver Pengirim</span>
                                <span className="text-white text-sm font-bold">{selectedVerification.driverId}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Lampiran Bukti</h4>
                       {selectedVerification.paymentProof ? (
                          <div className="group relative bg-black rounded-[2rem] border border-gray-800 overflow-hidden aspect-[3/4] shadow-2xl">
                             <div className="absolute inset-0 flex items-center justify-center p-12 bg-gray-900/50">
                                <div className="text-center">
                                   <CreditCard size={64} className="text-gray-800 mx-auto mb-4" />
                                   <p className="text-gray-400 font-bold mb-2">{selectedVerification.paymentProof.name || "Bukti_Pembayaran.jpg"}</p>
                                   <p className="text-gray-600 text-sm">{(selectedVerification.paymentProof.size / 1024 / 1024).toFixed(2)} MB</p>
                                   <button className="mt-8 flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-2xl text-white font-bold hover:bg-brand-600 transition-colors mx-auto">
                                      <Download size={18} />
                                      Unduh File
                                   </button>
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-gray-800/20 border-2 border-dashed border-gray-800 rounded-[2rem] p-16 text-center">
                             <XCircle size={48} className="text-gray-800 mx-auto mb-4" />
                             <p className="text-gray-600 font-medium italic">Tidak ada lampiran gambar</p>
                          </div>
                       )}

                       {selectedVerification.notes && (
                          <div className="bg-brand-500/5 border border-brand-500/20 p-6 rounded-3xl">
                             <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-2">Catatan Driver</h4>
                             <p className="text-gray-300 text-sm italic leading-relaxed">"{selectedVerification.notes}"</p>
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
