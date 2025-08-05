import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProtectedRoute({ children, role }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setAllowed(false);
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAllowed(data.role === role);
      } else {
        setAllowed(false);
      }
    };

    checkRole();
  }, [role]);

  if (allowed === null) return <div>Loading...</div>;
  if (!allowed) return <Navigate to="/" replace />;

  return children;
}
