import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner ring */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#C9A84C] animate-spin" />
        </div>
        {/* Bouncing dots */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Memuat halaman…
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, role }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setAllowed(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const userRole = snap.data().role;
        if (Array.isArray(role)) {
          setAllowed(role.includes(userRole));
        } else {
          setAllowed(userRole === role);
        }
      } else {
        setAllowed(false);
      }
    };

    checkRole();
  }, [role]);

  if (allowed === null) return <LoadingSkeleton />;
  if (!allowed)         return <Navigate to="/login" replace />;
  return children;
}
