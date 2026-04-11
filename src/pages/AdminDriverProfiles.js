import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { User, Mail, Phone, MapPin, Calendar, Car, Star, DollarSign, Edit, Eye } from "lucide-react";

export default function AdminDriverProfiles() {
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filter, setFilter] = useState("all"); // all, active, inactive

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch all drivers
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const driversData = [];
      querySnapshot.forEach((doc) => {
        driversData.push({ id: doc.id, ...doc.data() });
      });
      setDrivers(driversData);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.toDate()).toLocaleDateString("id-ID");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 border-green-500/30 text-green-400";
      case "inactive":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      default:
        return "bg-gray-800/50 border-gray-700 text-gray-400";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "inactive":
        return "Tidak Aktif";
      default:
        return status;
    }
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
    } catch (error) {
      console.error("Error updating driver status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[5%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[5%] w-[45vw] h-[45vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-10 pt-8 animate-fadeInUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">Profil Driver</h1>
              <p className="text-gray-400 text-lg">Kelola database mitra pengemudi dan monitor statistik performa mereka.</p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-10 glass-card bg-gray-900/40 rounded-3xl p-6 border border-gray-800 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                filter === "all"
                  ? "bg-brand-600 text-white shadow-brand-sm"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700"
              }`}
            >
              Semua Driver
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                filter === "active"
                  ? "bg-green-600 text-white shadow-lg shadow-green-900/20"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilter("inactive")}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                filter === "inactive"
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700"
              }`}
            >
              Tidak Aktif
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-purple-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Driver</p>
                <p className="text-3xl font-black text-white">{drivers.length}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                <User size={24} />
              </div>
            </div>
          </div>
          
          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-green-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Driver Aktif</p>
                <p className="text-3xl font-black text-white">
                  {drivers.filter(d => d.status === "active").length}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-2xl text-green-400">
                <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center font-black text-xs">A</div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Order</p>
                <p className="text-3xl font-black text-white">
                  {drivers.reduce((total, driver) => total + (driver.totalOrders || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                <Car size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-6 rounded-3xl border border-gray-800 group hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Pendapatan</p>
                <p className="text-2xl font-black text-emerald-400 tracking-tighter">
                  Rp {drivers.reduce((total, driver) => total + (driver.totalEarnings || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                <DollarSign size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Drivers Grid */}
        <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
            <h2 className="text-2xl font-black text-white tracking-tight">Daftar Driver ({filteredDrivers.length})</h2>
          </div>

          <div className="space-y-6">
            {filteredDrivers.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-[2.5rem] p-20 text-center border border-gray-800">
                <User className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                <p className="text-gray-500 font-bold">Belum ada mitra pengemudi terdaftar dalam sistem.</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="glass-card bg-gray-900/40 rounded-[2rem] border border-gray-800 overflow-hidden hover:border-brand-500/30 transition-all group"
                >
                  <div className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-800/50">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-500/20 shadow-brand-sm">
                          <User size={30} />
                        </div>
                        <div>
                          <h4 className="text-2xl font-black text-white tracking-tight">{driver.displayName || driver.name || "N/A"}</h4>
                          <p className="text-gray-500 text-sm font-semibold">{driver.email} • ID: {driver.id}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(driver.status)}`}>
                          {getStatusText(driver.status)}
                        </span>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Update Status</span>
                           <select
                            value={driver.status || "active"}
                            onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white text-[10px] font-black uppercase rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                           >
                            <option value="active">Aktif</option>
                            <option value="inactive">Tidak Aktif</option>
                           </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <Phone size={16} className="text-brand-400" />
                            <div>
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Kontak</p>
                               <p className="text-white font-bold">{driver.phone || "N/A"}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-brand-400" />
                            <div>
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Domisili</p>
                               <p className="text-white font-bold truncate max-w-[200px]">{driver.address || "N/A"}</p>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800/50 text-center">
                           <Car size={16} className="text-blue-400 mx-auto mb-2" />
                           <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Orders</p>
                           <p className="text-xl font-black text-white">{driver.totalOrders || 0}</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800/50 text-center">
                           <Star size={16} className="text-yellow-400 mx-auto mb-2" />
                           <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Rating</p>
                           <p className="text-xl font-black text-white">{driver.rating || 0}</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800/50 text-center">
                           <DollarSign size={16} className="text-emerald-400 mx-auto mb-2" />
                           <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Cuan</p>
                           <p className="text-sm font-black text-white">{(driver.totalEarnings / 1000).toFixed(0)}k</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center gap-3">
                        <div className="flex items-center gap-3">
                           <Calendar size={16} className="text-gray-500" />
                           <p className="text-xs text-gray-400 font-bold group-hover:text-gray-200 transition-colors">
                              Mitra Sejak: {formatDate(driver.createdAt)}
                           </p>
                        </div>
                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="w-full bg-brand-600/10 hover:bg-brand-600 text-brand-400 hover:text-white border border-brand-500/20 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                          Lihat Berkas Lengkap
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Premium Detail Modal */}
        {selectedDriver && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="glass-card bg-gray-950/80 border border-gray-800 rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
              <button
                onClick={() => setSelectedDriver(null)}
                className="absolute top-8 right-8 w-12 h-12 bg-gray-800 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-4 focus:ring-red-500/20"
              >
                <span className="text-2xl font-black">×</span>
              </button>

              <div className="p-12">
                <div className="flex items-center gap-8 mb-12">
                   <div className="w-24 h-24 bg-brand-500 rounded-3xl flex items-center justify-center text-white shadow-brand-lg">
                      <User size={48} />
                   </div>
                   <div>
                      <h3 className="text-4xl font-black text-white tracking-tighter mb-2">{selectedDriver.displayName || selectedDriver.name}</h3>
                      <p className="text-brand-400 font-black uppercase tracking-widest text-sm">Mitra Pengemudi Pro</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                       <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Informasi Identitas</h4>
                       </div>
                       <div className="space-y-4 bg-gray-900/40 p-6 rounded-[2rem] border border-gray-800">
                          <div className="flex justify-between border-b border-gray-800 pb-3">
                            <span className="text-gray-500 font-bold">Email Utama</span>
                            <span className="text-white font-black">{selectedDriver.email}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-800 pb-3">
                            <span className="text-gray-500 font-bold">Nomor WhatsApp</span>
                            <span className="text-white font-black">{selectedDriver.phone || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-800 pb-3">
                            <span className="text-gray-500 font-bold">Lisensi SIM</span>
                            <span className="text-white font-black">{selectedDriver.simNumber || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-800 pb-3">
                            <span className="text-gray-500 font-bold">Tgl. Lahir</span>
                            <span className="text-white font-black">{formatDate(selectedDriver.birthDate)}</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-gray-500 font-bold">Alamat Terverifikasi</span>
                            <span className="text-white font-black leading-relaxed italic">{selectedDriver.address || "N/A"}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                     <div>
                        <div className="flex items-center gap-3 mb-6">
                           <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                           <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Metrik Performa</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-gray-900/40 p-6 rounded-[2rem] border border-gray-800 text-center">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Order</p>
                              <p className="text-3xl font-black text-white">{selectedDriver.totalOrders || 0}</p>
                           </div>
                           <div className="bg-gray-900/40 p-6 rounded-[2rem] border border-gray-800 text-center">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Kualitas (1-5)</p>
                              <p className="text-3xl font-black text-yellow-400">{selectedDriver.rating || 0}</p>
                           </div>
                           <div className="bg-gray-900/40 p-6 rounded-[2rem] border border-gray-800 text-center col-span-2">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Akumulasi Pendapatan</p>
                              <p className="text-4xl font-black text-emerald-400 tracking-tighter">Rp {(selectedDriver.totalEarnings || 0).toLocaleString()}</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-brand-500/5 p-6 rounded-[2rem] border border-brand-500/10">
                        <div className="flex items-center gap-2 mb-3">
                           <Edit size={14} className="text-brand-400" />
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Catatan Administrasi</span>
                        </div>
                        <p className="text-sm text-gray-300 italic leading-relaxed">
                           {selectedDriver.notes || "Tidak ada catatan khusus untuk mitra ini."}
                        </p>
                     </div>
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
