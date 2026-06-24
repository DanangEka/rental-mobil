import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { X, User, LogIn, LogOut, Gauge, Car, Users, Bell, ClipboardList, TrendingUp, History, CreditCard, Camera, Settings, Clock, DollarSign, ChevronDown, Key, ChevronRight, Map, Menu } from "lucide-react";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [layananDropdownOpen, setLayananDropdownOpen] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLayananDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setRole(docSnap.data().role);
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
    const qUser = query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
    const unsubscribeUser = onSnapshot(qUser, (querySnapshot) => {
      const userNotifs = [];
      let userUnread = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userNotifs.push({ id: doc.id, ...data });
        if (!data.read) userUnread++;
      });

      if (role === "admin") {
        const qAdmin = query(collection(db, "notifications"), where("userId", "==", "admin"), orderBy("timestamp", "desc"));
        const unsubscribeAdmin = onSnapshot(qAdmin, (adminSnapshot) => {
          const adminNotifs = adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const adminUnread = adminSnapshot.docs.filter(d => !d.data().read).length;
          const allNotifs = [...userNotifs, ...adminNotifs].sort((a,b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
          setNotifications(allNotifs);
          setUnreadCount(userUnread + adminUnread);
        });
        unsubscribes.push(unsubscribeAdmin);
      } else {
        setNotifications(userNotifs);
        setUnreadCount(userUnread);
      }
    });
    unsubscribes.push(unsubscribeUser);
    return () => unsubscribes.forEach(u => u());
  }, [user, role]);

  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Gagal update notifikasi:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    try {
      setLoadingNotif(true);
      await Promise.all(unreadNotifs.map(n => updateDoc(doc(db, "notifications", n.id), { read: true })));
      setLoadingNotif(false);
    } catch (error) {
      console.error("Gagal update semua notifikasi:", error);
      setLoadingNotif(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setSidebarOpen(false);
    navigate("/login");
  };

  const adminMenu = [
    { name: "Dashboard", path: "/admin-dashboard", icon: <TrendingUp size={16} /> },
    { name: "Pesanan", path: "/manajemen-pesanan", icon: <ClipboardList size={16} /> },
    { name: "Mobil", path: "/car-management", icon: <Car size={16} /> },
    { name: "Client", path: "/client-management", icon: <Users size={16} /> },
    { name: "Driver", path: "/admin-driver-management", icon: <Settings size={16} /> },
    { name: "Paket Wisata", path: "/admin-tour-packages", icon: <Map size={16} /> },
  ];

  const driverMenu = [
    { name: "Dashboard", path: "/driver-dashboard", icon: <Gauge size={16} /> },
    { name: "Order", path: "/driver-orders", icon: <ClipboardList size={16} /> },
    { name: "Verifikasi", path: "/vehicle-verification", icon: <Camera size={16} /> },
    { name: "Bayar", path: "/payment-verification", icon: <CreditCard size={16} /> },
    { name: "Profil", path: "/driver-profile", icon: <User size={16} /> },
  ];

  return (
    <>
      {/* Sidebar for Mobile Only */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white text-slate-900 z-[100] transform transition-transform duration-500 ease-smooth shadow-2xl lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-lg" />
              <span className="font-black text-sm tracking-tight">Cakra Lima Tujuh</span>
           </div>
           <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-1 flex flex-col h-[calc(100%-81px)]">
           {/* Driver-specific mobile sidebar */}
           {role === 'driver' ? (
             <>
               <p className="px-5 pt-3 pb-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Driver Panel</p>
               {driverMenu.map(m => (
                 <Link
                   key={m.path}
                   to={m.path}
                   onClick={() => setSidebarOpen(false)}
                   className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${
                     location.pathname === m.path ? 'bg-red-50 text-[#990000]' : 'text-slate-600 hover:bg-slate-50'
                   }`}
                 >
                   {m.icon}
                   {m.name}
                 </Link>
               ))}
             </>
           ) : role === 'admin' ? (
             <>
               <p className="px-5 pt-3 pb-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Admin Panel</p>
               {adminMenu.map(m => (
                 <Link
                   key={m.path}
                   to={m.path}
                   onClick={() => setSidebarOpen(false)}
                   className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${
                     location.pathname === m.path ? 'bg-red-50 text-[#990000]' : 'text-slate-600 hover:bg-slate-50'
                   }`}
                 >
                   {m.icon}
                   {m.name}
                 </Link>
               ))}
             </>
           ) : (
             <>
               <Link to={user ? "/home" : "/login"} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/home' ? 'bg-red-50 text-[#990000]' : 'hover:bg-slate-50'}`}>Layanan</Link>
               <Link to={user ? "/open-trip" : "/login"} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/open-trip' ? 'bg-red-50 text-[#990000]' : 'hover:bg-slate-50'}`}>Open Trip</Link>
               <Link to="/company-profile" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/company-profile' ? 'bg-red-50 text-[#990000]' : 'hover:bg-slate-50'}`}>Company</Link>
               <Link to={user ? "/tour-packages" : "/login"} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/tour-packages' ? 'bg-red-50 text-[#990000]' : 'hover:bg-slate-50'}`}>Paket Wisata</Link>
               {user && role === 'client' && (
                 <Link to="/history-pesanan" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === '/history-pesanan' ? 'bg-red-50 text-[#990000]' : 'hover:bg-slate-50'}`}>
                   <History size={16} /> History Pesanan
                 </Link>
               )}
             </>
           )}

           {/* Spacer */}
           <div className="flex-1" />

           {/* Auth buttons at bottom */}
           {user ? (
             <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-[#990000] hover:bg-red-50 mt-4 mb-4">
                <LogOut size={16} /> Logout
             </button>
           ) : (
             <Link to="/login" onClick={() => setSidebarOpen(false)} className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest bg-[#990000] text-white mt-4 mb-4">
                <LogIn size={16} /> Login
             </Link>
           )}
        </nav>
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* REFINED NAVIGATION STRUCTURE */}
      <div className={`fixed top-0 left-0 right-0 z-[80] transition-all duration-500 ${scrolled ? 'translate-y-[-36px]' : 'translate-y-0'}`}>
        
        {/* --- MINIMAL TOP UTILITY BAR --- */}
        <div className="bg-[#990000] text-white/90 py-2 px-6">
           <div className="max-w-7xl mx-auto flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em]">
              <div className="flex items-center gap-8">
                 <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                    <Clock size={11} className="text-red-300" /> <span>Layanan 24 Jam</span>
                 </div>
                 <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer hidden md:flex border-l border-white/10 pl-8">
                    <DollarSign size={11} className="text-red-300" /> <span>Tarif Transparan & Kompetitif</span>
                 </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="hidden lg:inline opacity-50 font-medium">Melayani perjalanan Anda dengan sepenuh hati</span>
              </div>
           </div>
        </div>

        {/* --- MAIN NAVIGATION BAR --- */}
        <nav className={`transition-all duration-500 ${scrolled ? 'bg-white shadow-xl py-3 border-b border-slate-100' : 'bg-white/95 backdrop-blur-md shadow-sm py-5'}`}>
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            {/* Mobile Burger Menu */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-red-50 hover:text-[#990000] rounded-xl transition-all"
            >
              <Menu size={24} />
            </button>

            {/* Logo Group */}
            <Link to="/" className="flex items-center gap-4 shrink-0 group">
               <div className="relative">
                  <div className="absolute inset-0 bg-[#990000] rounded-xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
                  <img src={logo} alt="Logo" className="relative h-11 w-11 rounded-xl shadow-sm border border-slate-100" />
               </div>
               <div className="flex flex-col">
                  <span className="font-black tracking-tight text-xl text-slate-900 leading-none mb-1">Cakra Lima Tujuh</span>
                  <div className="flex items-center gap-2">
                     <div className="h-0.5 w-4 bg-[#990000] rounded-full" />
                     <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase">Premium Rental</span>
                  </div>
               </div>
            </Link>

            {/* Desktop Center Links — role-aware */}
            <div className="hidden lg:flex items-center bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200/60 shadow-sm">
               {role === 'driver' ? (
                 /* Driver-specific center nav */
                 <>
                   {driverMenu.map(m => (
                     <Link
                       key={m.path}
                       to={m.path}
                       className={`px-6 py-3 rounded-full text-[13px] font-black uppercase tracking-wider flex items-center gap-2.5 transition-all ${
                         location.pathname === m.path
                           ? 'text-[#990000] bg-white shadow-md shadow-red-900/5'
                           : 'text-slate-700 hover:text-[#990000]'
                       }`}
                     >
                       {m.icon}
                       {m.name}
                     </Link>
                   ))}
                 </>
               ) : role === 'admin' ? (
                 /* Admin-specific center nav */
                 <>
                   {adminMenu.map(m => (
                     <Link
                       key={m.path}
                       to={m.path}
                       className={`px-5 py-3 rounded-full text-[12px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                         location.pathname === m.path
                           ? 'text-[#990000] bg-white shadow-md shadow-red-900/5'
                           : 'text-slate-700 hover:text-[#990000]'
                       }`}
                     >
                       {m.icon}
                       {m.name}
                     </Link>
                   ))}
                 </>
               ) : (
                 /* Public / Client center nav */
                 <>
                    <div className="relative" onMouseEnter={() => setLayananDropdownOpen(true)} onMouseLeave={() => setLayananDropdownOpen(false)}>
                       <Link to={user ? "/home" : "/login"} className={`px-7 py-3 rounded-full text-[13px] font-black uppercase tracking-wider flex items-center gap-2.5 transition-all ${location.pathname === '/home' ? 'text-[#990000] bg-white shadow-md shadow-red-900/5' : 'text-slate-700 hover:text-[#990000]'}`}>
                         Layanan <ChevronDown size={16} className={layananDropdownOpen ? 'rotate-180 transition-transform text-[#990000]' : 'transition-transform'} />
                       </Link>
                       {layananDropdownOpen && user && (
                         <div className="absolute top-[calc(100%+12px)] left-0 w-80 bg-white border border-slate-100 shadow-[0_25px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-4 animate-fadeInUp z-[100]">
                            <Link to="/home?type=lepas" className="flex items-center gap-5 p-5 hover:bg-red-50/50 rounded-3xl transition-all group/item">
                               <div className="w-12 h-12 bg-[#990000] text-white rounded-2xl flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg shadow-red-900/20">
                                  <Key size={22} />
                               </div>
                               <div>
                                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Sewa Lepas Kunci</p>
                                  <p className="text-[10px] font-bold text-slate-500 mt-1">Explore mandiri tanpa sopir</p>
                               </div>
                            </Link>
                            <Link to="/home?type=driver" className="flex items-center gap-5 p-5 hover:bg-red-50/50 rounded-3xl transition-all group/item border-t border-slate-50 mt-1">
                               <div className="w-12 h-12 bg-[#990000] text-white rounded-2xl flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg shadow-red-900/20">
                                  <Users size={22} />
                               </div>
                               <div>
                                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Dengan Driver</p>
                                  <p className="text-[10px] font-bold text-slate-500 mt-1">Layanan sopir profesional</p>
                               </div>
                            </Link>
                         </div>
                       )}
                    </div>

                    <Link to={user ? "/open-trip" : "/login"} className={`px-7 py-3 rounded-full text-[13px] font-black uppercase tracking-wider transition-all ${location.pathname === '/open-trip' ? 'text-[#990000] bg-white shadow-md shadow-red-900/5' : 'text-slate-700 hover:text-[#990000]'}`}>Open Trip</Link>
                    <Link to="/company-profile" className={`px-7 py-3 rounded-full text-[13px] font-black uppercase tracking-wider transition-all ${location.pathname === '/company-profile' ? 'text-[#990000] bg-white shadow-md shadow-red-900/5' : 'text-slate-700 hover:text-[#990000]'}`}>Company</Link>
                    <Link to={user ? "/tour-packages" : "/login"} className={`px-7 py-3 rounded-full text-[13px] font-black uppercase tracking-wider transition-all ${location.pathname === '/tour-packages' ? 'text-[#990000] bg-white shadow-md shadow-red-900/5' : 'text-slate-700 hover:text-[#990000]'}`}>Paket Wisata</Link>
                 </>
               )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
               {user && (
                 <div className="relative">
                    <button onClick={() => setNotificationOpen(!notificationOpen)} className="hidden sm:flex p-3 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-[#990000] transition-all relative group">
                        <Bell size={20} className="group-hover:animate-swing" />
                        {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                    </button>

                    {/* Notification Dropdown Overlay */}
                    {notificationOpen && (
                      <div className="absolute top-[calc(100%+15px)] right-0 w-[400px] bg-white border border-slate-100 shadow-[0_30px_60px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-6 animate-fadeInUp z-[110]">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notifikasi</h4>
                          {unreadCount > 0 && (
                            <button 
                              onClick={handleMarkAllAsRead}
                              disabled={loadingNotif}
                              className="text-[10px] font-black text-[#990000] hover:underline uppercase tracking-tighter disabled:opacity-50"
                            >
                              {loadingNotif ? "Processing..." : "Tandai semua dibaca"}
                            </button>
                          )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                              <Bell size={40} className="mx-auto text-slate-200 mb-4 opacity-50" />
                              <p className="text-xs font-bold text-slate-400 italic">Belum ada notifikasi untuk Anda.</p>
                            </div>
                          ) : (
                            notifications.map(n => {
                              const getNotifRoute = (notif) => {
                                if (notif.link) return notif.link;
                                const msg = (notif.message || '').toLowerCase();
                                if (role === 'admin') {
                                  if (msg.includes('pembayaran') || msg.includes('pesanan') || msg.includes('pemesanan') || msg.includes('mobil') || msg.includes('pelunasan') || msg.includes('cash')) return '/manajemen-pesanan';
                                  return '/admin-dashboard';
                                }
                                if (msg.includes('pembayaran') || msg.includes('pesanan') || msg.includes('pemesanan') || msg.includes('mobil') || msg.includes('invoice') || msg.includes('pelunasan') || msg.includes('disetujui') || msg.includes('ditolak') || msg.includes('cash') || msg.includes('selesai') || msg.includes('lunas')) return '/history-pesanan';
                                return '/';
                              };
                              return (
                                <div 
                                  key={n.id} 
                                  onClick={() => {
                                    if (!n.read) handleMarkAsRead(n.id);
                                    const route = getNotifRoute(n);
                                    setNotificationOpen(false);
                                    navigate(route);
                                  }}
                                  className={`p-5 rounded-3xl transition-all cursor-pointer border ${n.read ? 'bg-slate-50/50 border-transparent opacity-60' : 'bg-red-50/40 border-red-100 hover:bg-red-50 shadow-sm'}`}
                                >
                                  <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${n.read ? 'bg-slate-200 text-slate-500' : 'bg-[#990000] text-white'}`}>
                                      <Bell size={18} />
                                    </div>
                                    <div className="flex-1">
                                      <p className={`text-[11px] leading-relaxed mb-2 ${n.read ? 'text-slate-500 font-medium' : 'text-slate-900 font-black'}`}>
                                        {n.message}
                                      </p>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                          <Clock size={10} />
                                          {n.timestamp?.toDate ? n.timestamp.toDate().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'Baru saja'}
                                        </div>
                                        <ChevronRight size={12} className="text-slate-300" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                 </div>
               )}

               {user ? (
                 <div className="relative group">
                    <button className={`flex items-center gap-3 px-1.5 py-1.5 rounded-full transition-all border ${role === 'admin' ? 'border-[#990000]/20 bg-red-50/30' : 'border-slate-200 bg-slate-50'}`}>
                       <div className="w-9 h-9 bg-[#990000] text-white rounded-full flex items-center justify-center text-sm font-black shadow-lg shadow-red-900/20">
                          {user.email?.charAt(0).toUpperCase()}
                       </div>
                       <div className="hidden xl:block text-left mr-2">
                          <p className="text-[9px] font-black text-slate-900 uppercase leading-none mb-1">{user.email?.split('@')[0]}</p>
                          <p className="text-[8px] font-bold text-[#990000] uppercase tracking-widest opacity-70">{role || 'Member'}</p>
                       </div>
                       <ChevronDown size={14} className="text-slate-400 group-hover:rotate-180 transition-transform mr-2" />
                    </button>
                    
                    {/* ACCOUNT DROPDOWN */}
                    <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.15)] rounded-[2rem] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all group-hover:translate-y-2 z-[90]">
                       <div className="px-4 py-3 mb-2 border-b border-slate-50">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Account</p>
                          <p className="text-[10px] font-black text-slate-900 truncate">{user.email}</p>
                       </div>
                        {role !== "driver" && (
                          <>
                            <Link to="/home" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-2xl transition-all group/sewa">
                           <div className="bg-white p-1.5 rounded-lg shadow-sm group-hover/sewa:bg-red-50 transition-colors"><Car size={16} className="text-[#990000]" /></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover/sewa:text-[#990000]">Sewa Mobil</span>
                        </Link>
                        <div className="h-px bg-slate-50 my-2" />
                          </>
                        )}
                       
                       {role === 'admin' && adminMenu.map(m => (
                         <Link key={m.path} to={m.path} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/50 rounded-2xl transition-all text-slate-600 hover:text-[#990000]">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm">{m.icon}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{m.name} Control</span>
                         </Link>
                       ))}

                       {role === 'driver' && driverMenu.map(m => (
                         <Link key={m.path} to={m.path} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 rounded-2xl transition-all text-slate-600 hover:text-emerald-600">
                             <div className="bg-white p-1.5 rounded-lg shadow-sm">{m.icon}</div>
                             <span className="text-[10px] font-black uppercase tracking-widest">{m.name} Panel</span>
                         </Link>
                       ))}

                       {/* CLIENT & GENERAL HISTORY LINK */}
                       {(role === 'client' || !role) && (
                         <Link to="/history-pesanan" className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/50 rounded-2xl transition-all text-slate-600 hover:text-[#990000]">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm"><History size={16} /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">History Pesanan</span>
                         </Link>
                       )}

                       <div className="h-px bg-slate-50 my-2" />
                       <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-4 text-[#990000] hover:bg-red-50 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest">
                          <LogOut size={16} /> Logout System
                       </button>
                    </div>
                 </div>
               ) : (
                 <Link to="/login" className="hidden sm:flex items-center gap-3 bg-[#990000] text-white px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] hover:bg-slate-900 shadow-xl shadow-red-900/10 transition-all group">
                    Member Access <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                 </Link>
               )}

            </div>

          </div>
        </nav>
      </div>
    </>
  );
}
