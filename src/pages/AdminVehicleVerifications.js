import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Camera, Calendar, User, Car, Eye, Download } from "lucide-react";

export default function AdminVehicleVerifications() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filter, setFilter] = useState("all"); // all, today, week, month

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch all vehicle verifications
    const q = query(
      collection(db, "vehicleVerifications"),
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

  const getStatusColor = (status) => {
    switch (status) {
      case "sebelum":
        return "bg-blue-100 text-blue-800";
      case "sesudah":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "sebelum":
        return "Sebelum Sewa";
      case "sesudah":
        return "Sesudah Sewa";
      default:
        return status;
    }
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;

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
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-6 md:mb-10 pt-8 animate-fadeInUp">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Verifikasi Mobil</h1>
          <p className="text-gray-400 text-lg">Pantau kondisi armada sebelum dan sesudah durasi sewa secara real-time.</p>
        </div>

        {/* Filter Section */}
        <div className="mb-6 md:mb-8 glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-800 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-wrap items-center gap-3">
             <div className="p-2 bg-brand-500/20 rounded-xl text-brand-400 mr-2">
                <Car size={20} />
             </div>
            {["all", "today", "week", "month"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 md:px-6 py-2.5 rounded-xl font-bold transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-brand-sm"
                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-700"
                }`}
              >
                {f === "all" ? "Semua" : f === "today" ? "Hari Ini" : f === "week" ? "Minggu Ini" : "Bulan Ini"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-10 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-brand-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl md:text-3xl font-black text-white">{verifications.length}</p>
              </div>
              <div className="p-3 bg-brand-500/20 rounded-2xl text-brand-400">
                <Camera size={24} />
              </div>
            </div>
          </div>
          
          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Sebelum</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {verifications.filter(v => v.status === "sebelum").length}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 text-xs font-black">
                PRE
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-green-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Sesudah</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {verifications.filter(v => v.status === "sesudah").length}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-2xl text-green-400 text-xs font-black">
                POST
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-purple-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Hari Ini</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {verifications.filter(v => {
                    const today = new Date().toDateString();
                    const verificationDate = new Date(v.timestamp?.toDate()).toDateString();
                    return verificationDate === today;
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                <Calendar size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800 overflow-hidden animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-800 bg-gray-900/20 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Eye size={20} className="text-brand-400" />
              Riwayat Verifikasi ({filteredVerifications.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-800">
            {filteredVerifications.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera size={28} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">Belum ada verifikasi yang tercatat</p>
              </div>
            ) : (
              filteredVerifications.map((verification, idx) => (
                <div
                  key={verification.id}
                  className="p-4 sm:p-6 md:p-8 hover:bg-gray-800/20 transition-all group"
                  style={{ animationDelay: `${0.1 * idx}s` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 md:gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border ${
                          verification.status === "sebelum" 
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
                            : "bg-green-500/20 border-green-500/50 text-green-400"
                        }`}>
                          {getStatusText(verification.status)}
                        </span>
                        <span className="text-sm text-gray-500 font-semibold bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700">
                          {formatDate(verification.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Armada</p>
                          <p className="text-white font-bold text-lg group-hover:text-brand-400 transition-colors">{verification.namaMobil}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client</p>
                          <p className="text-gray-300 font-medium truncate">{verification.clientEmail}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Driver</p>
                          <p className="text-gray-300 font-medium">{verification.driverId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order ID</p>
                          <p className="text-brand-300 font-mono text-xs">{verification.orderId}</p>
                        </div>
                      </div>

                      {verification.notes && (
                        <div className="mt-4 p-4 bg-gray-950/50 border border-gray-800 rounded-2xl">
                          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Catatan Driver</p>
                          <p className="text-gray-400 text-sm italic">{verification.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                       <button
                        onClick={() => setSelectedVerification(verification)}
                        className="flex items-center gap-2 px-4 md:px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl transition-all shadow-brand-sm group-hover:scale-105 active:scale-95"
                      >
                        <Eye size={18} />
                        Lihat Foto
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
              className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fadeIn" 
              onClick={() => setSelectedVerification(null)}
            ></div>
            
            <div className="relative bg-gray-900 border border-gray-800 w-full max-w-5xl rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoomIn max-h-[90vh] flex flex-col">
              <div className="p-4 sm:p-6 md:p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-xl">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Detail Verifikasi</h3>
                  <p className="text-gray-400 text-sm mt-1">{selectedVerification.namaMobil} • {getStatusText(selectedVerification.status)}</p>
                </div>
                <button
                  onClick={() => setSelectedVerification(null)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-800 text-gray-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-grow bg-black/20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                  <div className="lg:col-span-1 space-y-6">
                     <div className="bg-gray-800/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Metadata Perjalanan</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">Status</span>
                              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${selectedVerification.status === 'sebelum' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                 {getStatusText(selectedVerification.status).toUpperCase()}
                              </span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">Waktu</span>
                              <span className="text-white text-sm font-bold">{formatDate(selectedVerification.timestamp)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">Driver ID</span>
                              <span className="text-white text-sm font-bold">{selectedVerification.driverId}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">Order ID</span>
                              <span className="text-brand-400 text-xs font-mono">{selectedVerification.orderId}</span>
                           </div>
                        </div>
                     </div>

                     {selectedVerification.notes && (
                        <div className="bg-gray-800/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Catatan Driver</h4>
                           <p className="text-gray-300 text-sm italic leading-relaxed">"{selectedVerification.notes}"</p>
                        </div>
                     )}
                  </div>

                  <div className="lg:col-span-2">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Bukti Visual ({selectedVerification.photos?.length || 0})</h4>
                    {selectedVerification.photos && selectedVerification.photos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedVerification.photos.map((photo, index) => (
                          <div key={index} className="group relative bg-gray-950 border border-gray-800 rounded-2xl md:rounded-3xl overflow-hidden aspect-video">
                            {photo.url ? (
                              <img 
                                src={photo.url} 
                                alt={photo.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-900/50">
                                <Camera size={48} className="text-gray-700 mb-4" />
                                <p className="text-gray-500 text-sm font-medium">Foto ID: {photo.name || index + 1}</p>
                                <p className="text-gray-600 text-xs mt-1">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                               <p className="text-white text-xs font-bold">{photo.name || `Visual Asset ${index + 1}`}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-950/50 border border-dashed border-gray-800 rounded-2xl md:rounded-3xl p-6 sm:p-10 md:p-12 text-center">
                        <Camera size={48} className="text-gray-800 mx-auto mb-4" />
                        <p className="text-gray-500">Tidak ada foto visual yang diunggah</p>
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
