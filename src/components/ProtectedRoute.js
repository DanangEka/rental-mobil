import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import RouteLoading from "./ui/RouteLoading";

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

  if (allowed === null) return <RouteLoading label="Memuat halaman…" showDots />;
  if (!allowed)         return <Navigate to="/login" replace />;
  return children;
}
