import { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
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
        navigate("/");
      } else {
        const userData = userDoc.data();
        const role = userData.role;
        const verificationStatus = userData.verificationStatus;

        if (role === "admin") {
          navigate("/");
        } else if (role === "client") {
          // Check verification status for client
          if (verificationStatus === "unverified") {
            alert("Akun Anda belum diverifikasi. Silakan upload KTP di halaman profil untuk verifikasi.");
          } else if (verificationStatus === "pending") {
            alert("Akun Anda sedang dalam proses verifikasi. Silakan tunggu konfirmasi admin.");
          }
          navigate("/");
        } else if (role === "driver") {
          // Driver login - redirect to driver dashboard
          navigate("/driver-dashboard");
        } else {
          setError("Role tidak dikenali.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Email atau password salah.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          const verificationStatus = userData.verificationStatus;

          if (role === "admin") {
            navigate("/");
          } else if (role === "client") {
            // Check verification status for client
            if (verificationStatus === "unverified") {
              alert("Akun Anda belum diverifikasi. Silakan upload KTP di halaman profil untuk verifikasi.");
            } else if (verificationStatus === "pending") {
              alert("Akun Anda sedang dalam proses verifikasi. Silakan tunggu konfirmasi admin.");
            }
            navigate("/");
          } else if (role === "driver") {
            // Driver login - redirect to driver dashboard
            navigate("/driver-dashboard");
          }
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50 px-4 py-8">
      <div className="bg-white shadow-2xl rounded-2xl max-w-md w-full p-8 space-y-8 border border-gray-100">
        <div className="flex justify-center">
          <div className="bg-[#990000] rounded-full p-4 shadow-lg">
            <LogIn className="text-white w-8 h-8" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Selamat Datang</h2>
          <p className="text-gray-600 text-sm md:text-base">
            Masukkan email dan password Anda untuk melanjutkan
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="Masukkan email Anda"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Masukkan password Anda"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            className="bg-[#990000] hover:bg-red-700 text-white w-full py-3 rounded-lg transition-all duration-200 text-base font-semibold shadow-md hover:shadow-lg"
            onClick={handleLogin}
          >
            Masuk
          </button>
        </div>

        <div className="text-center">
          <span className="text-gray-600 text-sm">Belum punya akun? </span>
          <Link
            to="/signup"
            className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
          >
            Daftar sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
