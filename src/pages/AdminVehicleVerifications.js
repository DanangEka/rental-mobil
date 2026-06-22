import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Camera, Calendar, User, Car, Eye, Download, ShieldCheck, Filter, LayoutGrid } from "lucide-react";

export default function AdminVehicleVerifications() {
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;
    const now = new Date();
    const verificationDate = verification.timestamp?.toDate ? verification.timestamp.toDate() : new Date(verification.timestamp);
    if (filter === "today") return verificationDate.toDateString() === now.toDateString();
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
            <ShieldCheck size={14} />
            <span>Fleet Quality Control</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verifikasi Fisik Unit</h1>
          <p className="text-slate-500 mt-1">Audit dokumentasi visual armada sebelum dan sesudah operasional.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
          
          {/* Sidebar Filter */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter size={14} /> Log Period
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: "all", label: "Semua Verifikasi" },
                  { id: "today", label: "Masuk Hari Ini" },
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

            <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-lg overflow-hidden relative group">
               <div className="relative z-10 text-center">
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">Total Dokumentasi</p>
                  <p className="text-4xl font-black">{verifications.length}</p>
               </div>
               <div className="absolute right-0 bottom-0 p-6 opacity-20 relative z-0 group-hover:scale-110 transition-transform">
                  <Camera size={60} />
               </div>
            </div>
          </div>

          {/* List Content */}
          <div className="lg:col-span-3">
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
                <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                   <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Aset Visual Armada</h2>
                   <span className="text-[10px] font-bold text-slate-400">{filteredVerifications.length} Reports</span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
                  {filteredVerifications.length === 0 ? (
                    <div className="p-20 text-center">
                       <Camera size={40} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-slate-400 font-bold italic text-sm">Belum ada verifikasi unit yang tercatat.</p>
                    </div>
                  ) : (
                    filteredVerifications.map((v) => (
                      <div key={v.id} className="p-6 md:px-8 hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-center gap-6 flex-1">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${v.status === 'sebelum' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                 <Car size={28} />
                              </div>
                              <div className="min-w-0">
                                 <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{v.namaMobil}</h4>
                                    <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                      v.status === 'sebelum' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    }`}>
                                      {v.status === 'sebelum' ? 'PRE-RENTAL' : 'POST-RENTAL'}
                                    </span>
                                 </div>
                                 <p className="text-xs font-bold text-slate-400">Mitra: {v.driverId} • {formatDate(v.timestamp)}</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-6">
                              <div className="text-right hidden sm:block">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Client Email</p>
                                 <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{v.clientEmail}</p>
                              </div>
                              <button 
                                onClick={() => setSelectedVerification(v)}
                                className="bg-[#990000] hover:bg-[#7a0000] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
                              >
                                <Eye size={16} /> Inspect
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

        {/* Inspection Modal */}
        {selectedVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
              <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Inspection Detail: {selectedVerification.namaMobil}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Log #{selectedVerification.id.substring(0, 8)}</p>
                 </div>
                 <button onClick={() => setSelectedVerification(null)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors text-2xl font-black">×</button>
              </div>

              <div className="p-10 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="space-y-8">
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Verifikasi</p>
                          <p className={`text-xl font-black tracking-tight ${selectedVerification.status === 'sebelum' ? 'text-blue-600' : 'text-emerald-600'}`}>
                             {selectedVerification.status === 'sebelum' ? 'SEBELUM RENTAL' : 'SETELAH RENTAL'}
                          </p>
                       </div>
                       
                       <div className="space-y-4">
                          {[
                            { label: "Pengemudi", val: selectedVerification.driverId },
                            { label: "Pelanggan", val: selectedVerification.clientEmail },
                            { label: "Waktu Input", val: formatDate(selectedVerification.timestamp) },
                            { label: "Order ID", val: selectedVerification.orderId },
                          ].map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-4 py-3 border-b border-slate-50 last:border-0">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[80px]">{item.label}</span>
                               <span className="text-xs font-black text-slate-900 text-right break-all">{item.val}</span>
                            </div>
                          ))}
                       </div>

                       {selectedVerification.notes && (
                         <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 italic">Remark Driver:</p>
                            <p className="text-sm text-slate-700 font-medium italic leading-relaxed">"{selectedVerification.notes}"</p>
                         </div>
                       )}
                    </div>

                    <div className="md:col-span-2">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-1">Visual Evidence ({selectedVerification.photos?.length || 0})</p>
                       {selectedVerification.photos && selectedVerification.photos.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {selectedVerification.photos.map((photo, idx) => (
                              <div key={idx} className="rounded-2xl overflow-hidden aspect-video border border-slate-200 bg-slate-50 group relative shadow-md">
                                 {photo.url ? (
                                   <img src={photo.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Evidence" />
                                 ) : (
                                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                      <Camera size={32} className="mb-2" />
                                      <p className="text-[10px] font-bold">Image Unavailable</p>
                                   </div>
                                 )}
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a href={photo.url} target="_blank" rel="noreferrer" className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Full View</a>
                                 </div>
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 py-32 flex flex-col items-center justify-center text-slate-300">
                            <Camera size={64} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">No Photos Recorded</p>
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
