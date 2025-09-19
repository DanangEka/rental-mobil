import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { Menu, X, User, LogIn, LogOut, Gauge, Car, Users, Bell, ClipboardList, TrendingUp } from "lucide-react";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const toggleNotification = () => {
    setNotificationOpen(!notificationOpen);
    if (!notificationOpen && unreadCount > 0) {
      // Mark all as read
      notifications.forEach(async (notif) => {
        if (!notif.read) {
          await updateDoc(doc(db, "notifications", notif.id), { read: true });
        }
      });
    }
  };

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
        } else {
          // If no document, check if admin via claims
          currentUser.getIdTokenResult().then((idTokenResult) => {
            if (idTokenResult.claims.admin === true) {
              setRole("admin");
            }
          });
        }
      } else {
        setRole(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || role === undefined) return;

    const unsubscribes = [];

    // Always fetch user notifications
    const qUser = query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
    const unsubscribeUser = onSnapshot(qUser, (querySnapshot) => {
      console.log("User notifications snapshot:", querySnapshot.docs.length);
      const userNotifs = [];
      let userUnread = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("User notification data:", data);
        userNotifs.push({ id: doc.id, ...data });
        if (!data.read) userUnread++;
      });

      // If admin, also fetch admin notifications
      if (role === "admin") {
        const qAdmin = query(collection(db, "notifications"), where("userId", "==", "admin"), orderBy("timestamp", "desc"));
        const unsubscribeAdmin = onSnapshot(qAdmin, (adminSnapshot) => {
          console.log("Admin notifications snapshot:", adminSnapshot.docs.length);
          const adminNotifs = [];
          let adminUnread = 0;
          adminSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Admin notification data:", data);
            adminNotifs.push({ id: doc.id, ...data });
            if (!data.read) adminUnread++;
          });

          // Merge and sort
          const allNotifs = [...userNotifs, ...adminNotifs].sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
          const allUnread = userUnread + adminUnread;
          console.log("Setting all notifications:", allNotifs, "unread:", allUnread);
          setNotifications(allNotifs);
          setUnreadCount(allUnread);
        });
        unsubscribes.push(unsubscribeAdmin);

        // Fetch admin orders as notifications
        const qOrders = query(collection(db, "pemesanan"), orderBy("tanggal", "desc"));
        const unsubscribeOrders = onSnapshot(qOrders, (orderSnapshot) => {
          const orders = [];
          orderSnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
          });
          setOrderNotifications(orders);
        });
        unsubscribes.push(unsubscribeOrders);
      } else {
        console.log("Setting user notifications:", userNotifs, "unread:", userUnread);
        setNotifications(userNotifs);
        setUnreadCount(userUnread);
      }
    });
    unsubscribes.push(unsubscribeUser);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, role]);

    const menu = [
      { name: "Tentang Kami", path: "/company-profile", icon: <User size={20} /> },
      ...(user && role === "client"
        ? [
            { name: "Profil", path: "/profil", icon: <User size={20} /> },
            { name: "List Mobil", path: "/home", icon: <Car size={20} /> }
          ]
        : []),
      ...(user && role === "admin"
        ? [
            { name: "Admin Dashboard", path: "/admin-dashboard", icon: <TrendingUp size={20} /> },
            { name: "Manajemen Pesanan", path: "/manajemen-pesanan", icon: <ClipboardList size={20} /> },
            { name: "List Mobil", path: "/home", icon: <Car size={20} /> },
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
          <Link to="/">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow-md object-contain" />
          </Link>
          <Link
            to="/"
            className="font-bold text-lg md:text-2xl tracking-wide hover:text-red-200 transition-colors duration-200"
          >
            Cakra Lima Tujuh
          </Link>
        </div>
        {/* Optional: Add user info or additional elements here for larger screens */}
        <div className="flex flex-nowrap items-center space-x-2 sm:space-x-4">
          {user ? (
            <>
              <button
                onClick={toggleNotification}
                className="relative p-2 hover:bg-red-700 rounded-lg transition-colors duration-200"
              >
                <Bell className="text-white w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <span className="hidden sm:inline text-sm text-red-200 truncate max-w-[120px]">
                Welcome, {user.email?.split('@')[0]}
              </span>
            </>
          ) : (
            <div className="flex flex-nowrap items-center space-x-2 sm:space-x-4">
              <Link
                to="/login"
                className="px-3 py-1 sm:px-4 sm:py-2 bg-transparent border border-red-300 text-red-200 rounded-lg hover:bg-red-700 hover:text-white transition-colors duration-200 font-medium text-sm sm:text-base whitespace-nowrap"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium text-sm sm:text-base whitespace-nowrap"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Notification Dropdown */}
      {notificationOpen && user && (
        <div className="absolute top-16 right-4 left-4 sm:right-4 sm:left-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-[90vw] sm:w-80 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Notifikasi</h3>
          </div>
          <div className="p-2">
            {notifications.length === 0 && orderNotifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Tidak ada notifikasi</p>
            ) : (
              <>
                {notifications.length > 0 && notifications.map((notif) => (
                  <div key={notif.id} className={`p-3 border-b border-gray-100 ${!notif.read ? 'bg-blue-50' : ''}`}>
                    <p className="text-sm text-gray-800">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.timestamp?.toDate()).toLocaleString()}
                    </p>
                  </div>
                ))}
                {orderNotifications.length > 0 && (
                  <>
                    <div className="p-4 border-t border-gray-200">
                      <h4 className="text-md font-semibold text-gray-700">Pesanan Masuk</h4>
                    </div>
                    {orderNotifications.map((order) => (
                      <div key={order.id} className="p-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-900">{order.namaMobil}</p>
                        <p className="text-xs text-gray-700">Client: {order.email}</p>
                        <p className="text-xs text-gray-700">
                          Tanggal: {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString() : 'N/A'} - {order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-xs font-medium text-gray-800">
                          Status: <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            order.status === 'diproses' ? 'bg-yellow-600 text-white' :
                            order.status === 'disetujui' ? 'bg-green-600 text-white' :
                            order.status === 'menunggu pembayaran' ? 'bg-orange-600 text-white' :
                            order.status === 'pembayaran berhasil' ? 'bg-blue-600 text-white' :
                            order.status === 'selesai' ? 'bg-purple-600 text-white' :
                            order.status === 'ditolak' ? 'bg-red-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {order.status}
                          </span>
                        </p>
                        <p className="text-xs font-semibold text-green-600">
                          Total: Rp {order.perkiraanHarga?.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
