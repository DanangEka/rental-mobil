import { useState, useEffect } from "react";
import { auth, db, googleProvider } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
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
          createdAt: new Date(),
        });
        navigate("/profil");
      } else {
        const role = userDoc.data().role;
        if (role === "admin") {
          navigate("/admin-dashboard");
        } else if (role === "client") {
          navigate("/profil");
        } else {
          setError("Role tidak dikenali.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Email atau password salah.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Buat dokumen user baru dengan role client
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "User",
          email: user.email,
          role: "client",
          createdAt: new Date(),
        });
      }

      navigate("/profil");
    } catch (err) {
      console.error("Google login error:", err);
      setError("Gagal login dengan Google.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === "admin") {
            navigate("/admin-dashboard");
          } else if (role === "client") {
            navigate("/profil");
          }
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f8dada] px-4">
      <div className="bg-white shadow-2xl rounded-xl max-w-sm w-full p-6 space-y-6">
        <div className="flex justify-center">
          <div className="bg-[#990000] rounded-full p-3">
            <LogIn className="text-white w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-xl font-bold text-[#990000]">Sign in</h2>
        <p className="text-center text-sm text-gray-500">
          Masukkan email dan password Anda
        </p>

        {error && (
          <div className="text-sm text-red-600 text-center">{error}</div>
        )}

        {/* Login Form */}
        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-2 text-gray-500"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            className="bg-[#990000] text-white w-full py-2 rounded-lg hover:bg-red-800 transition"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-2">
          <hr className="flex-grow border-gray-300" />
          <span className="text-gray-400 text-xs">or sign in with</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Login */}
        <div className="flex justify-center space-x-4">
          <button
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            onClick={handleGoogleLogin}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
          </button>
          <Link
            to="/signup"
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition flex items-center justify-center"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
