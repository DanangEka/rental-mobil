import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { Menu, X, User, LogIn, LogOut, Gauge, Car, Users, Bell, ClipboardList, TrendingUp, History, FileText, CreditCard, Camera, CheckCircle, Settings, UserPlus, Clock, DollarSign, Calendar } from "lucide-react";
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
          const allNotifs = [...userNotifs, ...adminNotifs].sort((a, b) => {
            const dateA = a.timestamp && typeof a.timestamp.toDate === "function"
              ? a.timestamp.toDate()
              : new Date(0);

            const dateB = b.timestamp && typeof b.timestamp.toDate === "function"
              ? b.timestamp.toDate()
              : new Date(0);

            return dateB - dateA;
          });

          const allUnread = userUnread + adminUnread;
          console.log("Setting all notifications:", allNotifs, "unread:", allUnread);
          setNotifications(allNotifs);
          setUnreadCount(allUnread);
        });
        unsubscribes.push(unsubscribeAdmin);

        // Fetch admin orders as notifications - using getDocs to avoid composite index issues
        const fetchOrders = async () => {
          try {
            // Use getDocs instead of onSnapshot to avoid real-time listener issues
            const { getDocs } = await import("firebase/firestore");
            const querySnapshot = await getDocs(collection(db, "pemesanan"));

            const orders = [];
            querySnapshot.forEach((doc) => {
              orders.push({ id: doc.id, ...doc.data() });
            });

            // Sort by date client-side to avoid composite index
            orders.sort((a, b) => {
              const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
              const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
              return dateB - dateA;
            });

            setOrderNotifications(orders);
          } catch (error) {
            console.error("Error fetching orders:", error);
            setOrderNotifications([]);
          }
        };

        fetchOrders();
      } else if (role === "driver") {
        // Driver specific order listener
        const fetchAvailableOrders = async () => {
          try {
            const { getDocs } = await import("firebase/firestore");
            const querySnapshot = await getDocs(collection(db, "pemesanan"));
            const available = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              // Available means: status in [approve sewa, pembayaran berhasil] AND no driverId
              if (!data.driverId && (data.status === "approve sewa" || data.status === "pembayaran berhasil" || data.status === "disetujui")) {
                available.push({ id: doc.id, ...data, isNewOrder: true });
              }
            });
            
            setOrderNotifications(available);
          } catch (error) {
            console.error("Error fetching driver orders:", error);
          }
        };
        fetchAvailableOrders();
        
        // Also add an interval for drivers
        const interval = setInterval(fetchAvailableOrders, 30000);
        unsubscribes.push(() => clearInterval(interval));
        
        setNotifications(userNotifs);
        setUnreadCount(userUnread);
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
            { name: "List Mobil", path: "/home", icon: <Car size={20} /> },
            { name: "History Pesanan", path: "/history-pesanan", icon: <History size={20} /> }
          ]
        : []),
      ...(user && role === "admin"
        ? [
            { name: "Admin Dashboard", path: "/admin-dashboard", icon: <TrendingUp size={20} /> },
            { name: "Manajemen Pesanan", path: "/manajemen-pesanan", icon: <ClipboardList size={20} /> },
            { name: "List Mobil", path: "/home", icon: <Car size={20} /> },
            { name: "Manajemen Mobil", path: "/car-management", icon: <Car size={20} /> },
            { name: "Manajemen Client", path: "/client-management", icon: <Users size={20} /> },
            { name: "Management Driver", path: "/admin-driver-management", icon: <Settings size={20} /> },
            { name: "Tambah Driver", path: "/admin-add-driver", icon: <UserPlus size={20} /> }
          ]
        : []),
      ...(user && role === "driver"
        ? [
            { name: "Dashboard", path: "/driver-dashboard", icon: <Gauge size={20} /> },
            { name: "Order", path: "/driver-orders", icon: <ClipboardList size={20} /> },
            { name: "Verifikasi Mobil", path: "/vehicle-verification", icon: <Camera size={20} /> },
            { name: "Verifikasi Pembayaran", path: "/payment-verification", icon: <CreditCard size={20} /> },
            { name: "Profil Driver", path: "/driver-profile", icon: <User size={20} /> }
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
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-base font-medium group ${
                location.pathname === item.path
                  ? "bg-red-800 text-white shadow-brand border border-red-700"
                  : "text-red-100 hover:bg-red-800 hover:text-white hover:shadow-brand border border-transparent"
              }`}
            >
              <span className={`transition-transform duration-200 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
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

      {/* Top Navbar Wrapper (Sticky) */}
      <div className="sticky top-0 z-40 w-full">
        <nav className="bg-[#990000]/95 backdrop-blur-md text-white px-4 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-brand border-b border-red-800 transition-all duration-300">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-red-800 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <Menu className="text-white w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-3 group">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow-brand-lg object-contain group-hover:scale-105 transition-transform duration-300 bg-white" />
              <span className="font-bold text-lg md:text-2xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-red-100 to-white hidden sm:block">
                Cakra Lima Tujuh
              </span>
            </Link>
          </div>
          
          <div className="flex flex-nowrap items-center space-x-3 sm:space-x-5">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-800/50 border border-red-700 rounded-full shadow-inner">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold border border-red-400">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-red-50 max-w-[100px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                  {role && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white text-brand-800 rounded-full ml-1">
                      {role === "client" ? "USER" : role}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={toggleNotification}
                  className="relative p-2.5 bg-red-800 hover:bg-red-700 border border-red-700 rounded-xl transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 group"
                >
                  <Bell className="text-white w-5 h-5 group-hover:animate-pulse" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-400 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center border-2 border-[#990000] shadow-md px-1 animate-popIn">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <div className="flex flex-nowrap items-center space-x-2 sm:space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 bg-red-800/80 border border-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-medium text-sm sm:text-base whitespace-nowrap focus:ring-2 focus:ring-red-400"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="hidden xs:inline-block px-4 py-2 bg-white text-[#990000] rounded-xl hover:bg-red-50 transition-all duration-200 font-bold text-sm sm:text-base shadow-brand whitespace-nowrap focus:ring-2 focus:ring-white"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Notification Dropdown */}
        {notificationOpen && user && (
          <div className="absolute top-full right-2 sm:right-6 mt-2 bg-white border border-gray-100 rounded-2xl shadow-card-hover z-50 w-[92vw] sm:w-[380px] max-h-[80vh] overflow-hidden flex flex-col animate-popIn origin-top-right">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bell size={18} className="text-brand-600" />
                Notifikasi
              </h3>
              {unreadCount > 0 && (
                <span className="bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-1 rounded-full">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {notifications.length === 0 && orderNotifications.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Bell className="text-gray-300 w-8 h-8" />
                  </div>
                  <p className="text-gray-500 font-medium">Bebas notifikasi</p>
                  <p className="text-sm text-gray-400 mt-1">Anda sudah membaca semuanya.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.length > 0 && notifications.map((notif) => (
                    <div key={notif.id} className={`p-4 transition-colors hover:bg-gray-50 ${!notif.read ? 'bg-brand-50/30' : ''}`}>
                      <div className="flex gap-3">
                        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notif.read ? 'bg-brand-500 shadow-[0_0_8px_rgba(255,37,37,0.6)]' : 'bg-transparent'}`} />
                        <div>
                          <p className={`text-sm ${!notif.read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(notif.timestamp?.toDate()).toLocaleString('id-ID', { 
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {orderNotifications.length > 0 && (
                    <div className="bg-gray-50">
                      <div className="px-4 py-2 border-y border-gray-100 bg-gray-100/50">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {role === "admin" ? "Pesanan Masuk (Admin)" : "Pesanan Baru Tersedia"}
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {orderNotifications.map((order) => (
                          <div key={order.id} className={`p-4 hover:bg-white transition-colors ${order.isNewOrder ? 'bg-blue-50/30' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">{order.namaMobil}</p>
                              {order.isNewOrder && (
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">NEW</span>
                              )}
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ml-2 ${
                                order.status === 'diproses' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'disetujui' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'menunggu pembayaran' ? 'bg-orange-100 text-orange-800' :
                                order.status === 'pembayaran berhasil' ? 'bg-green-100 text-green-800' :
                                order.status === 'selesai' ? 'bg-brand-100 text-brand-800' :
                                order.status === 'ditolak' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 space-y-1 mt-2">
                              {role === "driver" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/driver-orders");
                                  }}
                                  className="w-full mt-2 py-1.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors"
                                >
                                  Lihat & Terima Order
                                </button>
                              )}
                              <p className="flex items-center gap-1.5"><User size={12} /> {order.namaClient || order.email}</p>
                              <p className="flex items-center gap-1.5"><Calendar size={12} /> {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString() : 'N/A'} - {order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString() : 'N/A'}</p>
                              <p className="flex items-center gap-1.5 font-bold text-gray-700 mt-2">
                                <DollarSign size={12} className="text-green-600" />
                                Rp {order.perkiraanHarga?.toLocaleString() || '-'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
