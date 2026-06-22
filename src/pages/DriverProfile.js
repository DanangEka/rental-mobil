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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990000] mx-auto"></div>
          <p className="text-slate-500 mt-4 font-black text-xs uppercase tracking-widest">Memuat profil driver...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-12 text-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-red-100 mix-blend-multiply filter blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200 mix-blend-multiply filter blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-10 lg:py-12">
        <div className="mb-8 md:mb-10 animate-fadeInUp">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
             <User size={14} />
             <span>Driver Identity</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3">Profil Driver</h1>
          <p className="text-slate-500 text-lg">Pantau aktivitas, statistik, dan kelola data pribadi Anda.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 animate-fadeInUp shadow-xl shadow-slate-200/50" style={{ animationDelay: "0.1s" }}>
              <div className="px-6 md:px-10 py-5 md:py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-red-50 rounded-2xl text-[#990000] border border-red-100 shadow-sm">
                      <User size={22} />
                   </div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Data Pribadi</h2>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-7 py-3 bg-[#990000] hover:bg-slate-900 text-white rounded-full transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/10 active:scale-95"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Profil
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/10 active:scale-95"
                    >
                      <Save className="h-4 w-4" />
                      Simpan
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-7 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                      Nama Lengkap
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.nama || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#990000] text-slate-900 text-[13px] font-bold rounded-2xl px-5 py-4 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-50 rounded-2xl px-5 py-4 text-slate-900 font-bold text-[13px]">
                         {driverData.nama || "—"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                      Alamat Email
                    </label>
                    <div className="bg-slate-50/50 border border-slate-50 rounded-2xl px-5 py-4 text-slate-400 flex items-center gap-4 text-[13px]">
                      <Mail className="h-4 w-4 text-red-200" />
                      <span className="font-bold">{user.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                      Nomor Telepon
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.noTelepon || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, noTelepon: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#990000] text-slate-900 text-[13px] font-bold rounded-2xl px-5 py-4 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-50 rounded-2xl px-5 py-4 text-slate-900 font-bold text-[13px] flex items-center gap-4">
                        <Phone className="h-4 w-4 text-red-200" />
                        <span>{driverData.noTelepon || "—"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                      Nomor SIM
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.simNumber || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, simNumber: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#990000] text-slate-900 text-[13px] font-bold rounded-2xl px-5 py-4 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-50 rounded-2xl px-5 py-4 text-slate-900 font-bold text-[13px] flex items-center gap-4">
                         <ShieldCheck className="h-4 w-4 text-red-200" />
                         <span>{driverData.simNumber || "—"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                      Tanggal Lahir
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.tanggalLahir || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tanggalLahir: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#990000] text-slate-900 text-[13px] font-bold rounded-2xl px-5 py-4 outline-none transition-all"
                      />
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-50 rounded-2xl px-5 py-4 text-slate-900 font-bold text-[13px] flex items-center gap-4">
                        <Calendar className="h-4 w-4 text-red-200" />
                        <span>{formatDate(driverData.tanggalLahir)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                      Alamat Lengkap
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.alamat || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, alamat: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-[#990000] text-slate-900 text-[13px] font-bold rounded-2xl px-5 py-4 outline-none transition-all resize-none"
                        rows={3}
                      />
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-50 rounded-2xl px-5 py-5 text-slate-600 font-medium text-[13px] leading-relaxed flex items-start gap-4">
                        <MapPin className="h-4 w-4 text-red-200 mt-1 flex-shrink-0" />
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
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                 <Star className="h-5 w-5 text-amber-400" fill="currentColor" /> Statistik Driver
              </h3>
              
              <div className="space-y-10">
                <div className="group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">Rating Keseluruhan</span>
                    <span className="text-slate-900 text-2xl font-black">{stats.rating.toFixed(1)} <span className="text-slate-300 text-sm">/ 5.0</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                     <div 
                       className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all duration-1000" 
                       style={{ width: `${(stats.rating / 5) * 100}%` }}
                     ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] group hover:border-[#990000]/30 transition-all">
                     <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Perjalanan</p>
                     <div className="flex items-center justify-between">
                        <span className="text-3xl font-black text-slate-900">{stats.totalTrips}</span>
                        <div className="p-3 bg-white rounded-xl text-blue-500 border border-slate-100 shadow-sm">
                           <Car size={20} />
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] group hover:border-[#990000]/30 transition-all">
                     <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Pendapatan</p>
                     <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-emerald-600">Rp {stats.totalEarnings.toLocaleString()}</span>
                        <div className="p-3 bg-white rounded-xl text-emerald-500 border border-slate-100 shadow-sm">
                           <DollarSign size={20} />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 animate-fadeInUp shadow-xl shadow-slate-200/50" style={{ animationDelay: "0.3s" }}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Info Akun</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">Status</span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100 uppercase tracking-widest">
                    Verified Driver
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">Tipe Akun</span>
                  <span className="text-slate-900 text-sm font-black flex items-center gap-2 uppercase tracking-tighter">
                    <Briefcase size={14} className="text-[#990000]" />
                    {driverData.role}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-400 text-[9px] uppercase font-black tracking-widest block mb-1">Bergabung Sejak</span>
                  <span className="text-slate-800 text-[13px] font-bold">
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
