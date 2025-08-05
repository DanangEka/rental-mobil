import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Menu, X, Home, User, LogIn, LogOut, Gauge } from "lucide-react";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    await signOut(auth);
    setSidebarOpen(false);
    setUser(null);
    setRole(null);
    navigate("/login");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRole(docSnap.data().role);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const menu = [
    { name: "Home", path: "/", icon: <Home size={18} /> },
    ...(user && role === "client"
      ? [{ name: "Profil", path: "/profil", icon: <User size={18} /> }]
      : []),
    ...(user && role === "admin"
      ? [{ name: "Admin Dashboard", path: "/admin-dashboard", icon: <Gauge size={18} /> }]
      : []),
    ...(!user
      ? [{ name: "Login", path: "/login", icon: <LogIn size={18} /> }]
      : []),
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#990000] text-white z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } `}
      >
        <div className="p-4 border-b border-red-800 flex items-center space-x-3">
          <button onClick={toggleSidebar} className="p-1 md:hidden">
            <X className="text-white w-6 h-6" />
          </button>
          <img src={logo} alt="Logo" className="h-8 w-8 rounded-full" />
          <span className="font-bold text-lg">Cakra Lima Tujuh</span>
        </div>
        <nav className="flex flex-col space-y-1 p-4">
          {menu.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                location.pathname === item.path
                  ? "bg-red-800 text-white"
                  : "text-red-100 hover:bg-red-800 hover:text-white"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 mt-4 text-left bg-red-800 hover:bg-red-900 rounded-lg transition text-sm"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </nav>
      </div>

      {/* Top Navbar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-40 z-40"
          onClick={toggleSidebar}
        />
      )}
      <nav className="bg-[#990000] text-white px-4 py-3 flex justify-between items-center shadow-md z-40 relative">
        <div className="flex items-center space-x-3">
          <button onClick={toggleSidebar} className="p-1 block">
            <Menu className="text-white w-6 h-6" />
          </button>
          <img src={logo} alt="Logo" className="h-8 w-8 rounded-full" />
          <Link to="/" className="font-bold text-lg">
            Cakra Lima Tujuh
          </Link>
        </div>
      </nav>
    </>
  );
}
