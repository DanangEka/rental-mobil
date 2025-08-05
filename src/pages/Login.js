import { useState, useEffect } from "react";
import { auth, db, googleProvider } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import logo from "../assets/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAdminLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        navigate("/admin-dashboard");
      } else {
        setError("Akun ini bukan admin.");
      }
    } catch {
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
          name: user.displayName,
          email: user.email,
          role: "client",
        });
      }

      navigate("/profil");
    } catch {
      setError("Gagal login dengan Google.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.exists() ? userDoc.data().role : null;
        if (role === "admin") navigate("/admin-dashboard");
        if (role === "client") navigate("/profil");
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
          Login sebagai <b>Admin</b> atau <b>Client (Google)</b>
        </p>

        {error && (
          <div className="text-sm text-red-600 text-center">{error}</div>
        )}

        {/* Admin Login Form */}
        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email Admin"
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
            onClick={handleAdminLogin}
          >
            Login Admin
          </button>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-2">
          <hr className="flex-grow border-gray-300" />
          <span className="text-gray-400 text-xs">or sign in with</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Login */}
        <div className="flex justify-center">
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
        </div>
      </div>
    </div>
  );
}
