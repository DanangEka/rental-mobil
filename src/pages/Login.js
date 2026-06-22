import { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "../components/Toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.warning("Mohon isi email dan password Anda.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Jika belum ada, buat otomatis dengan role client
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: "client",
          verificationStatus: "unverified",
          createdAt: new Date(),
        });
        toast.success("Berhasil masuk. Selamat datang!");
        navigate("/");
      } else {
        const userData = userDoc.data();
        const role = userData.role;
        const verificationStatus = userData.verificationStatus;

        if (role === "admin") {
          toast.success("Selamat datang, Admin!");
          navigate("/");
        } else if (role === "client") {
          // Check verification status for client
          if (verificationStatus === "unverified") {
            toast.warning("Akun Anda belum diverifikasi. Silakan upload KTP di profil.", "Verifikasi Diperlukan");
          } else if (verificationStatus === "pending") {
            toast.info("Akun Anda sedang dalam proses verifikasi oleh Admin.", "Menunggu Verifikasi");
          } else {
            toast.success("Berhasil masuk.");
          }
          navigate("/");
        } else if (role === "driver") {
          toast.success("Selamat datang, Driver!");
          navigate("/driver-dashboard");
        } else {
          setError("Role tidak dikenali.");
          toast.error("Role tidak dikenali.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      let errMsg = "Email atau password salah.";
      if (err.code === "auth/too-many-requests") errMsg = "Terlalu banyak percobaan. Silakan coba lagi nanti.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Avoid redirect loops if already logged in and simply revisiting
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;

          if (role === "admin" || role === "client") {
            navigate("/");
          } else if (role === "driver") {
            navigate("/driver-dashboard");
          }
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-slate-50 overflow-hidden px-4 sm:px-6 py-8 md:py-12 lg:px-8">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#fff1f1_0%,_#f8fafc_50%,_#ffffff_100%)]"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-brand-100/50 mix-blend-multiply filter blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-slate-200/50 mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md z-10 animate-fadeInUp">
        {/* Brand Logo or Header */}
        <div className="text-center mb-6 md:mb-8">
          <Link to="/" className="inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 shadow-xl mb-6 card-hover">
            <LogIn className="text-brand-600 w-8 h-8" />
          </Link>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Selamat Datang Kembali<span className="text-brand-600">.</span></h2>
          <p className="mt-2 text-sm font-medium text-slate-400 uppercase tracking-widest">Silakan masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Card */}
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-popIn">
              <div className="mt-0.5 text-red-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 pl-4 py-4 rounded-2xl text-slate-900 outline-none transition-all font-semibold"
                  placeholder="nama@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Password</label>
              <div className="relative group">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 pl-4 pr-12 py-4 rounded-2xl text-slate-900 outline-none transition-all font-semibold"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 p-1 transition-colors outline-none focus:text-brand-600"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              <div className="flex justify-end mt-3">
                <button className="text-[10px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest transition-colors">
                  Lupa password?
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading || !email || !password}
              className={`w-full relative group overflow-hidden bg-brand-800 hover:bg-brand-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center mt-2 shadow-lg shadow-brand/20
                ${(!isLoading && email && password) ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/30' : ''}`}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer hidden sm:block"></div>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  <span className="text-xs uppercase tracking-widest">Memproses...</span>
                </>
              ) : (
                <>
                  <span className="text-xs uppercase tracking-widest">Masuk Sistem</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Belum punya akun rental?{" "}
              <Link to="/signup" className="text-brand-600 font-black hover:text-brand-700 transition-colors inline-block hover:-translate-y-0.5">
                DAFTAR SEKARANG
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
