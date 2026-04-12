import { useState } from "react";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { UserPlus, Mail, Phone, MapPin, Calendar, CreditCard, Eye, EyeOff, ShieldCheck, Lock, StickyNote } from "lucide-react";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Nama harus diisi";
    if (!formData.email.trim()) return "Email harus diisi";
    if (!formData.phone.trim()) return "No. telepon harus diisi";
    if (!formData.simNumber.trim()) return "No. SIM harus diisi";
    if (!formData.birthDate) return "Tanggal lahir harus diisi";
    if (!formData.address.trim()) return "Alamat harus diisi";
    if (!formData.password) return "Password harus diisi";
    if (formData.password.length < 6) return "Password minimal 6 karakter";
    if (formData.password !== formData.confirmPassword) return "Konfirmasi password tidak sesuai";
    if (!formData.email.includes("@")) return "Format email tidak valid";

    // Validate age (must be at least 18 years old)
    const birthDate = new Date(formData.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) return "Driver harus berusia minimal 18 tahun";

    return null;
  };

  const checkEmailExists = async (email) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validate form
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setError("Email sudah terdaftar");
        setLoading(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Create user document in Firestore
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
        verificationStatus: "verified", // Admin-created drivers are automatically verified
        totalOrders: 0,
        totalEarnings: 0,
        rating: 0,
        notes: formData.notes,
        createdAt: new Date(),
        createdBy: "admin", // Track who created the driver
        updatedAt: new Date()
      });

      toast.success("Berhasil", "Driver baru telah berhasil didaftarkan ke sistem.");
      setFormData({
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

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/admin-driver-profiles");
      }, 2000);

    } catch (err) {
      console.error("Error adding driver:", err);
      let errorMsg = "Terjadi kesalahan saat menambahkan driver";
      if (err.code === "auth/email-already-in-use") {
        errorMsg = "Email sudah terdaftar";
      } else if (err.code === "auth/weak-password") {
        errorMsg = "Password terlalu lemah";
      }
      toast.error("Gagal", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-[72px] relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-red-900/5 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-4 md:py-8 md:py-12">
        <div className="mb-6 md:mb-10 animate-fadeInUp">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Tambah Driver</h1>
          <p className="text-gray-400 text-lg">Daftarkan driver baru untuk memperluas jangkauan layanan Anda.</p>
        </div>

        <div className="glass-card bg-gray-900/40 rounded-[2rem] overflow-hidden border border-gray-800 shadow-2xl animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          {/* Header section with icon */}
          <div className="px-4 md:px-8 py-6 md:py-10 bg-gradient-to-r from-brand-900/20 to-transparent border-b border-gray-800 flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-400 shadow-brand-sm border border-brand-500/20">
              <UserPlus size={32} />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-white tracking-tight">Formulir Pendaftaran</h2>
              <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-widest">Lengkapi seluruh data administrasi driver</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 md:p-12 space-y-12">
            {/* Section 1: Personal Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Informasi Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Nama Lengkap Driver *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl px-4 py-3.5 outline-none transition-all"
                      placeholder="Masukkan nama lengkap"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all uppercase tracking-tight"
                      placeholder="driver@cakralimatuujuh.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Nomor Telepon *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all"
                      placeholder="08xxxxxxxxxxxx"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Nomor SIM Aktif *
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <input
                      type="text"
                      name="simNumber"
                      value={formData.simNumber}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all"
                      placeholder="Masukkan No. SIM"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Tanggal Lahir *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Alamat Domisili Lengkap *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-4 py-4 outline-none transition-all resize-none"
                      placeholder="Masukkan alamat sesuai KTP/Domisili"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Account Access */}
            <div className="space-y-6 pt-6 border-t border-gray-800/50">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Akses & Kredensial</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Password Akun *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-12 py-3.5 outline-none transition-all"
                      placeholder="Min. 6 karakter"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                    Ulangi Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-12 py-3.5 outline-none transition-all"
                      placeholder="Konfirmasi password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Additional Notes */}
            <div className="space-y-6 pt-6 border-t border-gray-800/50">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1 group-focus-within:text-brand-400 transition-colors">
                  Catatan Tambahan (Opsional)
                </label>
                <div className="relative">
                  <StickyNote className="absolute left-4 top-4 h-4 w-4 text-gray-600 group-focus-within:text-brand-500 transition-colors" />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full bg-black/40 border border-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-white text-sm rounded-xl pl-12 pr-4 py-4 outline-none transition-all resize-none"
                    placeholder="Contoh: Pengalaman driving 5th, Area Jakarta Timur, dsb."
                  />
                </div>
              </div>
            </div>

            {/* Form Footer / Submit Buttons */}
            <div className="pt-10 border-t border-gray-800 flex flex-col sm:flex-row justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate("/admin-driver-management")}
                className="px-4 md:px-8 py-4 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-2xl font-bold transition-all border border-gray-700 order-2 sm:order-1"
                disabled={loading}
              >
                Batalkan & Kembali
              </button>
              <button
                type="submit"
                className="px-4 md:px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-brand-sm disabled:opacity-50 order-1 sm:order-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    Daftarkan Driver Baru
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
