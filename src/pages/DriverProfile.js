import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { User, Phone, Mail, MapPin, Calendar, Star, Car, DollarSign, Edit2, Save, X, ShieldCheck, Briefcase } from "lucide-react";
import { useToast } from "../components/Toast";

export default function DriverProfile() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [stats, setStats] = useState({
    totalTrips: 0,
    rating: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch driver profile data
    const fetchDriverData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDriverData(data);
        setEditForm(data);
      }
    };

    fetchDriverData();

    // Fetch driver statistics
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      where("status", "==", "selesai"),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let totalEarnings = 0;
      querySnapshot.forEach((doc) => {
        totalEarnings += doc.data().perkiraanHarga || 0;
      });

      setStats(prev => ({
        ...prev,
        totalTrips: querySnapshot.size,
        totalEarnings: totalEarnings
      }));
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, editForm);
      setDriverData(editForm);
      setIsEditing(false);
      toast.success("Berhasil", "Profil Anda telah diperbarui.");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal", "Terjadi kesalahan saat memperbarui profil.");
    }
  };

  const handleCancel = () => {
    setEditForm(driverData);
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Belum diisi";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (!user || !driverData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="text-gray-400 mt-4 font-medium tracking-wide">Memuat profil driver...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-[72px] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/5 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-4 md:py-8 md:py-12">
        <div className="mb-6 md:mb-10 animate-fadeInUp">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Profil Driver</h1>
          <p className="text-gray-400 text-lg">Pantau aktivitas, statistik, dan kelola data pribadi Anda.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card bg-gray-900/60 rounded-2xl md:rounded-3xl overflow-hidden border border-gray-800 animate-fadeInUp shadow-2xl" style={{ animationDelay: "0.1s" }}>
              <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/20">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
                      <User size={20} />
                   </div>
                   <h2 className="text-xl font-bold text-white tracking-tight">Data Pribadi</h2>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-bold text-sm border border-gray-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Profil
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all font-bold text-sm shadow-brand-sm"
                    >
                      <Save className="h-4 w-4" />
                      Simpan
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl transition-all font-bold text-sm border border-gray-700"
                    >
                      <X className="h-4 w-4" />
                      Batal
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                      Nama Lengkap
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.nama || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                        className="w-full bg-black/40 border border-gray-700 focus:border-brand-500 text-white text-sm rounded-xl px-4 py-3 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl px-4 py-3 text-white font-semibold">
                         {driverData.nama || "—"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                      Alamat Email
                    </label>
                    <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl px-4 py-3 text-gray-400 flex items-center gap-3">
                      <Mail className="h-4 w-4 text-brand-500/50" />
                      <span className="font-medium">{user.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                      Nomor Telepon
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.noTelepon || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, noTelepon: e.target.value }))}
                        className="w-full bg-black/40 border border-gray-700 focus:border-brand-500 text-white text-sm rounded-xl px-4 py-3 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl px-4 py-3 text-white font-semibold flex items-center gap-3">
                        <Phone className="h-4 w-4 text-brand-500/50" />
                        <span>{driverData.noTelepon || "—"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                      Nomor SIM
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.simNumber || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, simNumber: e.target.value }))}
                        className="w-full bg-black/40 border border-gray-700 focus:border-brand-500 text-white text-sm rounded-xl px-4 py-3 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl px-4 py-3 text-white font-semibold flex items-center gap-3">
                         <ShieldCheck className="h-4 w-4 text-brand-500/50" />
                         <span>{driverData.simNumber || "—"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                      Tanggal Lahir
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.tanggalLahir || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tanggalLahir: e.target.value }))}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-black/40 border border-gray-700 focus:border-brand-500 text-white text-sm rounded-xl px-4 py-3 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl px-4 py-3 text-white font-semibold flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-brand-500/50" />
                        <span>{formatDate(driverData.tanggalLahir)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                      Alamat Lengkap
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.alamat || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, alamat: e.target.value }))}
                        className="w-full bg-black/40 border border-gray-700 focus:border-brand-500 text-white text-sm rounded-xl px-4 py-3 outline-none transition-all resize-none"
                        rows={3}
                      />
                    ) : (
                      <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl px-4 py-4 text-gray-300 italic text-sm leading-relaxed flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-brand-500/50 mt-1 flex-shrink-0" />
                        <span>{driverData.alamat || "Belum melengkapi data alamat."}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="space-y-6">
            {/* Main Stats Card */}
            <div className="glass-card bg-brand-950/20 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-brand-500/20 shadow-brand-sm animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <h3 className="text-sm font-black text-brand-400 uppercase tracking-[0.2em] mb-6 md:mb-8 flex items-center gap-2">
                 <Star className="h-4 w-4" fill="currentColor" /> Statistik Driver
              </h3>
              
              <div className="space-y-8">
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm font-medium">Rating Keseluruhan</span>
                    <span className="text-white text-xl font-black">{stats.rating.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000" 
                       style={{ width: `${(stats.rating / 5) * 100}%` }}
                     ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 bg-black/40 border border-gray-800 rounded-2xl group hover:border-brand-500/30 transition-all">
                     <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Perjalanan</p>
                     <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-white">{stats.totalTrips}</span>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                           <Car size={18} />
                        </div>
                     </div>
                  </div>

                  <div className="p-5 bg-black/40 border border-gray-800 rounded-2xl group hover:border-brand-500/30 transition-all">
                     <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Pendapatan</p>
                     <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-green-400">Rp {stats.totalEarnings.toLocaleString()}</span>
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                           <DollarSign size={18} />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info Card */}
            <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-gray-800 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-800 pb-4">Info Akun</h3>
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black rounded-full border border-green-500/20 uppercase tracking-wider">
                    Verified Driver
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Tipe Akun</span>
                  <span className="text-white text-sm font-bold flex items-center gap-2">
                    <Briefcase size={14} className="text-brand-400" />
                    {driverData.role}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Bergabung Sejak</span>
                  <span className="text-gray-300 text-sm font-medium">
                    {formatDate(driverData.createdAt?.toDate())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
