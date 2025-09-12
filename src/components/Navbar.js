import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Menu, X, Home, User, LogIn, LogOut, Gauge, Car, Users } from "lucide-react";
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
    { name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Profil Perusahaan", path: "/company-profile", icon: <User size={20} /> },
    ...(user && role === "client"
      ? [{ name: "Profil", path: "/profil", icon: <User size={20} /> }]
      : []),
    ...(user && role === "admin"
      ? [
          { name: "Admin Dashboard", path: "/admin-dashboard", icon: <Gauge size={20} /> },
          { name: "Manajemen Mobil", path: "/car-management", icon: <Car size={20} /> },
          { name: "Manajemen Client", path: "/client-management", icon: <Users size={20} /> }
        ]
      : []),
    ...(!user
      ? [{ name: "Login", path: "/login", icon: <LogIn size={20} /> }]
      : []),
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-[#990000] text-white z-50 transform transition-all duration-300 ease-in-out shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-red-700 flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-red-700 rounded-lg transition-colors duration-200 md:hidden"
          >
            <X className="text-white w-6 h-6" />
          </button>
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow-md" />
          <span className="font-bold text-xl tracking-wide">Cakra Lima Tujuh</span>
        </div>
        <nav className="flex flex-col space-y-2 p-6">
          {menu.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-base font-medium ${
                location.pathname === item.path
                  ? "bg-red-700 text-white shadow-lg"
                  : "text-red-100 hover:bg-red-700 hover:text-white hover:shadow-md"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-4 py-3 mt-6 text-left bg-red-700 hover:bg-red-800 rounded-xl transition-all duration-200 text-base font-medium shadow-md hover:shadow-lg"
            >
              <LogOut size={20} />
              Logout
            </button>
          )}
        </nav>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Top Navbar */}
      <nav className="bg-[#990000] text-white px-4 py-4 md:px-6 md:py-4 flex justify-between items-center shadow-lg z-40 relative">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-red-700 rounded-lg transition-colors duration-200"
          >
            <Menu className="text-white w-6 h-6" />
          </button>
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow-md" />
          <Link
            to={user ? "/" : "/login"}
            className="font-bold text-xl md:text-2xl tracking-wide hover:text-red-200 transition-colors duration-200"
          >
            Cakra Lima Tujuh
          </Link>
        </div>
        {/* Optional: Add user info or additional elements here for larger screens */}
        <div className="hidden md:flex items-center space-x-4">
          {user && (
            <span className="text-sm text-red-200">
              Welcome, {user.email?.split('@')[0]}
            </span>
          )}
        </div>
      </nav>
    </>
  );
}
