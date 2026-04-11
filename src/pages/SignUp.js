import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../components/Toast";
import { Eye, EyeOff, UserPlus, Loader2, ArrowRight, Shield, MapPin, Phone, User, CheckCircle } from "lucide-react";

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "",
    nomorTelepon: "",
    alamat: "",
    provinsi: "",
    kabupaten: "",
    kecamatan: "",
    kelurahan: "",
    rt: "",
    rw: "",
    penanggungJawab: "",
    penanggungJawabAlamat: "",
    penanggungJawabTelepon: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPenanggungJawab, setShowPenanggungJawab] = useState(false);

  const javaProvinces = ["banten", "dki jakarta", "jawa barat", "jawa tengah", "jawa timur", "di yogyakarta"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const calculatePasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) score += 25;
    if (pass.match(/\d/)) score += 25;
    if (pass.match(/[^a-zA-Z\d]/)) score += 25;
    return score;
  };
  
  const passStrength = calculatePasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.nama || !form.email || !form.password || !form.nomorTelepon ||
      !form.alamat || !form.provinsi || !form.kabupaten || !form.kecamatan || 
      !form.kelurahan || !form.rt || !form.rw
    ) {
      toast.warning("Mohon lengkapi seluruh field wajib.");
      return;
    }

    if (showPenanggungJawab && (!form.penanggungJawab.trim() || !form.penanggungJawabAlamat.trim() || !form.penanggungJawabTelepon.trim())) {
      toast.warning("Mohon lengkapi seluruh field penanggung jawab untuk domisili luar pulau Jawa.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password minimal harus 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        ...form,
        role: "client",
        verificationStatus: "unverified",
        createdAt: serverTimestamp(),
      });

      await signOut(auth);
      
      toast.success("Pendaftaran berhasil!", "Silakan masuk dan lakukan verifikasi KTP.");
      navigate("/login");
    } catch (error) {
      console.error("Signup error:", error);
      let errMsg = error.message;
      if (error.code === 'auth/email-already-in-use') errMsg = "Email sudah digunakan.";
      toast.error(errMsg, "Pendaftaran Gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/20 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/20 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-4xl z-10 animate-fadeInUp mt-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-900/40 border border-brand-500/30 shadow-brand mb-6 backdrop-blur-sm">
            <UserPlus className="text-brand-300 w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">Mulai Perjalanan Anda</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">Bergabung dengan ribuan pelanggan puas kami dan rasakan kemudahan sewa mobil dengan layanan premium.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card bg-gray-900/70 p-6 sm:p-10 md:p-12 rounded-3xl shadow-2xl border border-gray-800 relative overflow-hidden">
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <div className="space-y-12">
            {/* Section 1: Akun */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                <Shield className="text-brand-500 w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Informasi Akun</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap*</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-400">
                      <User size={18} />
                    </div>
                    <input type="text" name="nama" value={form.nama} onChange={handleChange} className="input-dark bg-black/50 border-gray-700 pl-11 group-hover:border-gray-600 focus:border-brand-500 transition-colors" placeholder="Sesuai KTP" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nomor Telepon / WhatsApp*</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-400">
                      <Phone size={18} />
                    </div>
                    <input type="tel" name="nomorTelepon" value={form.nomorTelepon} onChange={handleChange} className="input-dark bg-black/50 border-gray-700 pl-11 group-hover:border-gray-600 focus:border-brand-500 transition-colors" placeholder="081234567890" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email*</label>
                  <div className="relative group">
                    <input type="email" name="email" value={form.email} onChange={handleChange} className="input-dark bg-black/50 border-gray-700 group-hover:border-gray-600 focus:border-brand-500 transition-colors" placeholder="nama@email.com" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password*</label>
                  <div className="relative group">
                    <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} className="input-dark bg-black/50 border-gray-700 pr-12 group-hover:border-gray-600 focus:border-brand-500 transition-colors" placeholder="Minimal 6 karakter" required minLength="6" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-400 focus:outline-none">
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  {form.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${passStrength <= 25 ? 'w-1/4 bg-red-500' : passStrength <= 50 ? 'w-2/4 bg-yellow-500' : passStrength <= 75 ? 'w-3/4 bg-blue-500' : 'w-full bg-green-500'}`}></div>
                      </div>
                      <p className="text-xs text-right text-gray-400">
                        {passStrength <= 25 ? 'Perlu Ditingkatkan' : passStrength <= 50 ? 'Sedang' : passStrength <= 75 ? 'Kuat' : 'Sangat Kuat'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Alamat */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                <MapPin className="text-brand-500 w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Domisili Sesuai KTP</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Provinsi*</label>
                  <input type="text" name="provinsi" value={form.provinsi} onChange={handleChange} onBlur={() => {
                    const prov = form.provinsi.toLowerCase().trim();
                    setShowPenanggungJawab(prov && !javaProvinces.some(jp => prov.includes(jp)));
                  }} className="input-dark bg-black/50 border-gray-700" placeholder="Contoh: Jawa Timur" required />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Kabupaten / Kota*</label>
                  <input type="text" name="kabupaten" value={form.kabupaten} onChange={handleChange} className="input-dark bg-black/50 border-gray-700" placeholder="Contoh: Surabaya" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Kecamatan*</label>
                  <input type="text" name="kecamatan" value={form.kecamatan} onChange={handleChange} className="input-dark bg-black/50 border-gray-700" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Kelurahan / Desa*</label>
                  <input type="text" name="kelurahan" value={form.kelurahan} onChange={handleChange} className="input-dark bg-black/50 border-gray-700" required />
                </div>

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">RT*</label>
                    <input type="text" name="rt" value={form.rt} onChange={handleChange} className="input-dark bg-black/50 border-gray-700" placeholder="001" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">RW*</label>
                    <input type="text" name="rw" value={form.rw} onChange={handleChange} className="input-dark bg-black/50 border-gray-700" placeholder="002" required />
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Alamat Detail*</label>
                  <textarea name="alamat" value={form.alamat} onChange={handleChange} rows="3" className="input-dark bg-black/50 border-gray-700 resize-none py-3" placeholder="Nama Jalan, Gedung, No. Rumah" required></textarea>
                </div>
              </div>
            </div>

            {/* Section 3: Penanggung Jawab (Luar Jawa) */}
            {showPenanggungJawab && (
              <div className="space-y-6 bg-brand-900/10 border border-brand-800/50 p-6 sm:p-8 rounded-2xl animate-fadeInUp">
                <div className="flex items-start gap-3 border-b border-brand-800/30 pb-4 mb-2">
                  <div className="bg-brand-500/20 p-2 rounded-xl text-brand-400 mt-1">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Data Penanggung Jawab</h3>
                    <p className="text-sm text-brand-200">Karena domisili Anda berada di luar pulau Jawa, kami membutuhkan data kerabat yang bisa dihubungi.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nama Penanggung Jawab*</label>
                    <input type="text" name="penanggungJawab" value={form.penanggungJawab} onChange={handleChange} className="input-dark bg-black/70 border-brand-900/50 focus:border-brand-500" required />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nomor Telepon*</label>
                    <input type="tel" name="penanggungJawabTelepon" value={form.penanggungJawabTelepon} onChange={handleChange} className="input-dark bg-black/70 border-brand-900/50 focus:border-brand-500" required />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Alamat Lengkap Penanggung Jawab*</label>
                    <textarea name="penanggungJawabAlamat" value={form.penanggungJawabAlamat} onChange={handleChange} rows="2" className="input-dark bg-black/70 border-brand-900/50 focus:border-brand-500 resize-none" required></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800">
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative group overflow-hidden bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center text-lg shadow-brand ${!loading ? 'hover:-translate-y-1 hover:shadow-brand-lg' : ''}`}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  <span>Memproses Pendaftaran...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 mr-2" />
                  <span>Daftar Akun Sekarang</span>
                </>
              )}
            </button>

            <div className="mt-8 text-center">
              <p className="text-gray-400">
                Sudah memiliki akun?{" "}
                <Link to="/login" className="text-brand-400 font-bold hover:text-brand-300 transition-colors hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
