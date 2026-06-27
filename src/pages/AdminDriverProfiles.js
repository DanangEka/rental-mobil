import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { User, Phone, MapPin, Star, DollarSign, ArrowRight } from "lucide-react";

export default function AdminDriverProfiles() {
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
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
      collection(db, "users"),
      where("role", "==", "driver")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const driversData = [];
      querySnapshot.forEach((doc) => {
        driversData.push({ id: doc.id, ...doc.data() });
      });
      driversData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setDrivers(driversData);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === "all") return true;
    return driver.status === filter;
  });

  const handleStatusChange = async (driverId, newStatus) => {
    try {
      await updateDoc(doc(db, "users", driverId), {
        status: newStatus,
        updatedAt: new Date()
      });
      alert("Status mitra diperbarui.");
    } catch (error) {
      console.error("Error updating driver status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
              <User size={14} />
              <span>Mitra Pengemudi</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Database Profil Driver</h1>
            <p className="text-slate-500 mt-1">Monitor kinerja, status aktif, dan data fundamental mitra pengemudi.</p>
          </div>
          
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
            {[
              { id: "all", label: "Semua" },
              { id: "active", label: "Aktif" },
              { id: "inactive", label: "Nonaktif" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === f.id ? 'bg-[#990000] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDrivers.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-200 py-24 text-center">
              <User size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold italic text-sm">Belum ada mitra pengemudi yang terdaftar.</p>
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                      <User size={32} />
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      (driver.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-[#990000] border-red-100'
                    }`}>
                      {driver.status || 'active'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-[#990000] transition-colors mb-1">{driver.displayName || driver.name || driver.nama || 'Anonymous Driver'}</h3>
                  <p className="text-xs font-bold text-slate-400 mb-6">{driver.email}</p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                       <Phone size={14} className="text-slate-300" />
                       <span>{driver.phone || driver.noTelepon || "-"}</span>
                    </div>
                    <div className="flex items-start gap-3 text-[10px] font-bold text-slate-400">
                       <MapPin size={14} className="text-slate-300 flex-shrink-0" />
                       <span className="line-clamp-2 italic">{driver.address || "Alamat belum diverifikasi"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                     <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Order</p>
                        <p className="text-lg font-black text-slate-900">{driver.totalOrders || 0} <span className="text-[10px] font-bold text-slate-400">Poin</span></p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rating</p>
                        <div className="flex items-center justify-end gap-1">
                           <Star size={12} className="text-amber-400 fill-amber-400" />
                           <p className="text-lg font-black text-slate-900">{driver.rating || 0}</p>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="mt-auto px-8 py-6 bg-slate-50 flex items-center justify-between">
                   <button 
                    onClick={() => setSelectedDriver(driver)}
                    className="flex items-center gap-2 text-[#990000] text-[10px] font-bold uppercase tracking-widest hover:gap-4 transition-all"
                   >
                     Lihat Detail Mitra <ArrowRight size={14} />
                   </button>
                   <div className="flex items-center gap-2">
                      <select 
                        value={driver.status || 'active'}
                        onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                        className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:ring-0 cursor-pointer hover:text-slate-600"
                      >
                         <option value="active">Aktif</option>
                         <option value="inactive">Nonaktif</option>
                      </select>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Info */}
        {selectedDriver && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-[#990000] rounded-2xl flex items-center justify-center">
                       <User size={24} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900">Profil Lengkap Mitra</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID Log: {selectedDriver.id.substring(0, 12).toUpperCase()}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedDriver(null)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-2xl">×</button>
              </div>

              <div className="p-10 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Informasi Autentikasi</h4>
                          {[
                             { label: "Nama Terdaftar", val: selectedDriver.displayName || selectedDriver.name || selectedDriver.nama },
                             { label: "Email Sistem", val: selectedDriver.email },
                             { label: "Telepon / WA", val: selectedDriver.phone || selectedDriver.noTelepon || "-" },
                            { label: "Bergabung Pada", val: formatDate(selectedDriver.createdAt) },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                               <span className="text-sm font-black text-slate-900">{item.val}</span>
                            </div>
                          ))}
                       </div>

                       <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <MapPin size={10} /> Alamat Tinggal
                          </h4>
                          <p className="text-sm text-slate-600 font-medium italic">"{selectedDriver.address || "Informasi alamat belum diinput atau diverifikasi oleh mitra."}"</p>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Dashboard Performa</h4>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Order</p>
                             <p className="text-3xl font-black text-slate-900 tracking-tighter">{selectedDriver.totalOrders || 0}</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rating</p>
                             <p className="text-3xl font-black text-amber-500 tracking-tighter">{selectedDriver.rating || 0}</p>
                          </div>
                          <div className="col-span-2 bg-emerald-50 p-8 rounded-3xl border border-emerald-100 text-center relative overflow-hidden group">
                             <div className="relative z-10">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Total Pendapatan</p>
                                <p className="text-4xl font-black text-emerald-700 tracking-tighter">Rp {(selectedDriver.totalEarnings || 0).toLocaleString()}</p>
                             </div>
                             <DollarSign size={80} className="absolute -right-8 -bottom-8 text-emerald-100 group-hover:scale-110 transition-transform" />
                          </div>
                       </div>

                       {selectedDriver.notes && (
                         <div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
                            <p className="text-[10px] font-bold text-[#990000] uppercase tracking-widest mb-1 italic">Internal Admin Notes:</p>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{selectedDriver.notes}"</p>
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
