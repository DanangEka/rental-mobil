import { useState } from "react";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { UserPlus, Mail, Phone, MapPin, Calendar, CreditCard, Eye, EyeOff, ShieldCheck, Lock, StickyNote, ArrowLeft } from "lucide-react";
import { useToast } from "../components/Toast";

export default function AdminAddDriver() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    simNumber: "",
    birthDate: "",
    address: "",
    password: "",
    confirmPassword: "",
    notes: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Gagal", "Konfirmasi password tidak sesuai");
      return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        displayName: formData.name,
        name: formData.name,
        phone: formData.phone,
        simNumber: formData.simNumber,
        birthDate: new Date(formData.birthDate),
        address: formData.address,
        role: "driver",
        status: "active",
        verificationStatus: "verified",
        totalOrders: 0,
        totalEarnings: 0,
        rating: 0,
        notes: formData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success("Berhasil", "Mitra pengemudi telah terdaftar.");
      setTimeout(() => navigate("/admin-driver-profiles"), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Gagal", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-20 text-slate-800">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header with Back Button */}
        <div className="mb-10">
          <button 
            onClick={() => navigate("/admin-driver-management")}
            className="flex items-center gap-2 text-slate-400 hover:text-[#990000] font-bold text-[10px] uppercase tracking-widest mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Kembali ke Menu
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tambah Driver Baru</h1>
          <p className="text-slate-500 mt-1">Daftarkan mitra pengemudi baru ke dalam ekosistem Cakra Lima Tujuh.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeInUp">
          <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center gap-6">
             <div className="w-14 h-14 bg-red-50 text-[#990000] rounded-2xl flex items-center justify-center shadow-inner">
                <UserPlus size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Formulir Pendaftaran</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lengkapi metadata operasional pengemudi</p>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-10">
            {/* Sec 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Profil Fundamental</label>
                  <div className="space-y-4">
                     <div className="relative group">
                        <input
                          type="text" name="name" value={formData.name} onChange={handleInputChange} required
                          placeholder="Nama Lengkap Sesuai KTP"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                        />
                     </div>
                     <div className="relative group">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                        <input
                          type="email" name="email" value={formData.email} onChange={handleInputChange} required
                          placeholder="Email Address"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                        />
                     </div>
                     <div className="relative group">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                        <input
                          type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required
                          placeholder="No. WhatsApp / HP"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Legalitas & Biometrik</label>
                  <div className="space-y-4">
                     <div className="relative group">
                        <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                        <input
                          type="text" name="simNumber" value={formData.simNumber} onChange={handleInputChange} required
                          placeholder="Nomor Seri SIM"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                        />
                     </div>
                     <div className="relative group">
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                        <input
                          type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all"
                        />
                     </div>
                     <div className="relative group">
                        <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                        <input
                          type="text" name="address" value={formData.address} onChange={handleInputChange} required
                          placeholder="Domisili Lengkap"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Sec 2 */}
            <div className="space-y-4 pt-4 border-t border-slate-50">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kredensial Login</label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="relative group">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                    <input
                      type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} required
                      placeholder="Password Baru"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#990000] transition-colors" size={18} />
                    <input
                      type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required
                      placeholder="Konfirmasi Password"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-4 py-3.5 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
               </div>
            </div>

            {/* Sec 3 */}
            <div className="space-y-4 pt-4">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Catatan Internal (Opsional)</label>
               <textarea 
                  name="notes" value={formData.notes} onChange={handleInputChange} rows={3}
                  placeholder="Informasi tambahan seperti pengalaman, area tugas, atau referensi..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-2xl px-6 py-4 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300 resize-none"
               />
            </div>

            <div className="pt-10 flex justify-end">
               <button 
                  type="submit" disabled={loading}
                  className="bg-[#990000] hover:bg-[#7a0000] disabled:opacity-50 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-900/10 active:scale-95 flex items-center gap-3"
               >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {loading ? "Mendaftarkan..." : "Daftarkan Driver"}
               </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
