import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../components/Toast";
import { Eye, EyeOff, UserPlus, Loader2, Shield, MapPin, Phone, User, CheckCircle } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#fff1f1_0%,_#f8fafc_50%,_#ffffff_100%)]"></div>
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-100/40 mix-blend-multiply filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200/40 mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-4xl z-10 animate-fadeInUp mt-6 md:mt-8">
        <div className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 shadow-xl mb-6">
            <UserPlus className="text-brand-600 w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Mulai Perjalanan Anda<span className="text-brand-600">.</span></h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">Bergabung dengan ribuan pelanggan puas kami dan rasakan kemudahan sewa mobil dengan layanan premium.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 md:p-14 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
          <div className="space-y-16">
            {/* Section 1: Akun */}
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Informasi Akun</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nama Lengkap*</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-600">
                      <User size={18} />
                    </div>
                    <input type="text" name="nama" value={form.nama} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 pl-12 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="Sesuai KTP" required />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nomor Telepon / WhatsApp*</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-600">
                      <Phone size={18} />
                    </div>
                    <input type="tel" name="nomorTelepon" value={form.nomorTelepon} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 pl-12 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="081234567890" required />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Email*</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="nama@email.com" required />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Password*</label>
                  <div className="relative group">
                    <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 pr-12 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="Minimal 6 karakter" required minLength="6" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-600">
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-3 px-1">
                      <div className="flex h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${passStrength <= 25 ? 'w-1/4 bg-red-400' : passStrength <= 50 ? 'w-2/4 bg-amber-400' : passStrength <= 75 ? 'w-3/4 bg-blue-400' : 'w-full bg-emerald-400'}`}></div>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-right mt-1.5 text-slate-400">
                        Strength: {passStrength <= 25 ? 'Weak' : passStrength <= 50 ? 'Moderate' : passStrength <= 75 ? 'Strong' : 'Excellent'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Alamat */}
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Domisili Sesuai KTP</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Provinsi*</label>
                  <input type="text" name="provinsi" value={form.provinsi} onChange={handleChange} onBlur={() => {
                    const prov = form.provinsi.toLowerCase().trim();
                    setShowPenanggungJawab(prov && !javaProvinces.some(jp => prov.includes(jp)));
                  }} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="Contoh: Jawa Timur" required />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Kabupaten / Kota*</label>
                  <input type="text" name="kabupaten" value={form.kabupaten} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="Contoh: Surabaya" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Kecamatan*</label>
                  <input type="text" name="kecamatan" value={form.kecamatan} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Kelurahan / Desa*</label>
                  <input type="text" name="kelurahan" value={form.kelurahan} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" required />
                </div>

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">RT*</label>
                    <input type="text" name="rt" value={form.rt} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="001" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">RW*</label>
                    <input type="text" name="rw" value={form.rw} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" placeholder="002" required />
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Alamat Detail*</label>
                  <textarea name="alamat" value={form.alamat} onChange={handleChange} rows="3" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold resize-none" placeholder="Nama Jalan, Gedung, No. Rumah" required></textarea>
                </div>
              </div>
            </div>

            {/* Section 3: Penanggung Jawab */}
            {showPenanggungJawab && (
              <div className="space-y-8 bg-brand-50/50 border border-brand-100 p-8 md:p-12 rounded-[2.5rem] animate-fadeInUp">
                <div className="flex items-start gap-4 border-b border-brand-100/50 pb-6 mb-2">
                  <div className="bg-brand-600 text-white p-3 rounded-2xl shrink-0">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Data Penanggung Jawab</h3>
                    <p className="text-slate-500 font-medium mt-1">Domisili luar pulau Jawa memerlukan data kerabat sebagai penanggung jawab.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nama Penanggung Jawab*</label>
                    <input type="text" name="penanggungJawab" value={form.penanggungJawab} onChange={handleChange} className="w-full bg-white border border-brand-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" required />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nomor Telepon*</label>
                    <input type="tel" name="penanggungJawabTelepon" value={form.penanggungJawabTelepon} onChange={handleChange} className="w-full bg-white border border-brand-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold" required />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Alamat Lengkap Penanggung Jawab*</label>
                    <textarea name="penanggungJawabAlamat" value={form.penanggungJawabAlamat} onChange={handleChange} rows="2" className="w-full bg-white border border-brand-100 px-5 py-4 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all font-semibold resize-none" required></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 pt-10 border-t border-slate-50">
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative group overflow-hidden bg-brand-800 hover:bg-brand-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-2xl transition-all duration-300 flex items-center justify-center text-lg shadow-xl shadow-brand/20 ${!loading ? 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand/30' : ''}`}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  <span className="text-xs uppercase tracking-widest">Memproses Pendaftaran...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 mr-3" />
                  <span className="text-xs uppercase tracking-widest">Daftar Akun Sekarang</span>
                </>
              )}
            </button>

            <div className="mt-8 text-center">
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Sudah memiliki akun?{" "}
                <Link to="/login" className="text-brand-600 font-black hover:text-brand-700 transition-colors">
                  MASUK DI SINI
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
