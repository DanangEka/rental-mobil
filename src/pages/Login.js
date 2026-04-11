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
    <div className="min-h-screen flex items-center justify-center relative bg-black overflow-hidden px-4 sm:px-6 py-12 lg:px-8">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-brand-800/20 mix-blend-screen filter blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-red-900/30 mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md z-10 animate-fadeInUp">
        {/* Brand Logo or Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-900/40 border border-brand-500/30 shadow-brand mb-6 card-hover backdrop-blur-sm">
            <LogIn className="text-brand-300 w-8 h-8" />
          </Link>
          <h2 className="text-3xl font-black text-white tracking-tight">Selamat Datang Kembali</h2>
          <p className="mt-2 text-sm text-gray-400">Silakan masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Card */}
        <div className="glass-card bg-gray-900/60 p-8 sm:p-10 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 animate-popIn">
              <div className="mt-0.5 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="input-dark w-full bg-black/50 border-gray-700 focus:border-brand-500 pl-4 py-3.5 rounded-xl text-white outline-none transition-all group-hover:border-gray-600"
                  placeholder="nama@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative group">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="input-dark w-full bg-black/50 border-gray-700 focus:border-brand-500 pl-4 pr-12 py-3.5 rounded-xl text-white outline-none transition-all group-hover:border-gray-600"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-400 p-1 transition-colors outline-none focus:text-brand-400"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              <div className="flex justify-end mt-2">
                <button className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                  Lupa password?
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading || !email || !password}
              className={`w-full relative group overflow-hidden bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center mt-2 focus:ring-4 focus:ring-brand-500/30 shadow-brand
                ${(!isLoading && email && password) ? 'hover:-translate-y-1 hover:shadow-brand-lg' : ''}`}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer hidden sm:block"></div>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">
              Belum punya akun rental?{" "}
              <Link to="/signup" className="text-brand-400 font-bold hover:text-brand-300 transition-colors inline-block hover:-translate-y-0.5">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
