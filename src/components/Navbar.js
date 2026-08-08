import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import {
  User, LogIn, LogOut, Gauge, Car, Users, Bell, ClipboardList,
  TrendingUp, History, CreditCard, Camera, Settings, Clock,
  DollarSign, ChevronDown, Key, ChevronRight, Map, Menu,
} from "lucide-react";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [user, setUser]                     = useState(null);
  const [role, setRole]                     = useState(null);
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen]       = useState(false);   // mobile profile dropdown
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false); // desktop account dropdown
  const [layananDropdownOpen, setLayananDropdownOpen] = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const [loadingNotif, setLoadingNotif]     = useState(false);

  const profileRef        = useRef(null);
  const desktopProfileRef = useRef(null);
  const notifRef          = useRef(null);
  const navigate          = useNavigate();
  const location          = useLocation();

  // ── Scroll listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Click-outside listeners ───────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
      if (desktopProfileRef.current && !desktopProfileRef.current.contains(e.target))
        setDesktopProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotificationOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── ESC key closes all dropdowns ─────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setDesktopProfileOpen(false);
        setNotificationOpen(false);
        setLayananDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // ── Close dropdowns on route change ──────────────────────────────────────
  useEffect(() => {
    setProfileOpen(false);
    setDesktopProfileOpen(false);
    setNotificationOpen(false);
  }, [location.pathname]);

  // ── Auth state ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) setRole(snap.data().role);
      } else {
        setRole(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    return () => unsub();
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || role === undefined) return;
    const unsubs = [];
    const qUser = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const unsubUser = onSnapshot(qUser, (snap) => {
      const userNotifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const userUnread = snap.docs.filter((d) => !d.data().read).length;

      if (role === "admin") {
        const qAdmin = query(
          collection(db, "notifications"),
          where("userId", "==", "admin"),
          orderBy("timestamp", "desc")
        );
        const unsubAdmin = onSnapshot(qAdmin, (adminSnap) => {
          const adminNotifs = adminSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const adminUnread = adminSnap.docs.filter((d) => !d.data().read).length;
          const all = [...userNotifs, ...adminNotifs].sort(
            (a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0)
          );
          setNotifications(all);
          setUnreadCount(userUnread + adminUnread);
        });
        unsubs.push(unsubAdmin);
      } else {
        setNotifications(userNotifs);
        setUnreadCount(userUnread);
      }
    });
    unsubs.push(unsubUser);
    return () => unsubs.forEach((u) => u());
  }, [user, role]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkAsRead = async (id) => {
    try { await updateDoc(doc(db, "notifications", id), { read: true }); }
    catch (e) { console.error("Gagal update notifikasi:", e); }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    try {
      setLoadingNotif(true);
      await Promise.all(unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })));
    } catch (e) { console.error("Gagal update semua notifikasi:", e); }
    finally { setLoadingNotif(false); }
  };

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setProfileOpen(false);
    setDesktopProfileOpen(false);
    navigate("/login");
  }, [navigate]);

  // ── Menu definitions ──────────────────────────────────────────────────────
  const adminMenu = [
    { name: "Dashboard",    path: "/admin-dashboard",          icon: <TrendingUp size={16} /> },
    { name: "Pesanan",      path: "/manajemen-pesanan",         icon: <ClipboardList size={16} /> },
    { name: "Sewa Mobil",   path: "/home",                      icon: <Key size={16} /> },
    { name: "Mobil",        path: "/car-management",            icon: <Car size={16} /> },
    { name: "Client",       path: "/client-management",         icon: <Users size={16} /> },
    { name: "Driver",       path: "/admin-driver-management",   icon: <Settings size={16} /> },
    { name: "Open Trip",    path: "/admin/open-trip",           icon: <Map size={16} /> },
    { name: "Paket Wisata", path: "/admin-tour-packages",       icon: <Map size={16} /> },
  ];

  const driverMenu = [
    { name: "Dashboard",  path: "/driver-dashboard",       icon: <Gauge size={16} /> },
    { name: "Order",      path: "/driver-orders",          icon: <ClipboardList size={16} /> },
    { name: "Verifikasi", path: "/vehicle-verification",   icon: <Camera size={16} /> },
    { name: "Bayar",      path: "/payment-verification",   icon: <CreditCard size={16} /> },
    { name: "Profil",     path: "/driver-profile",         icon: <User size={16} /> },
  ];

  // ── Notification route helper ─────────────────────────────────────────────
  const getNotifRoute = (notif) => {
    if (notif.link) return notif.link;
    const msg = (notif.message || "").toLowerCase();
    if (role === "admin") {
      if (msg.includes("pembayaran") || msg.includes("pesanan") || msg.includes("pemesanan") ||
          msg.includes("mobil") || msg.includes("pelunasan") || msg.includes("cash"))
        return "/manajemen-pesanan";
      return "/admin-dashboard";
    }
    if (msg.includes("pembayaran") || msg.includes("pesanan") || msg.includes("pemesanan") ||
        msg.includes("mobil") || msg.includes("invoice") || msg.includes("pelunasan") ||
        msg.includes("disetujui") || msg.includes("ditolak") || msg.includes("cash") ||
        msg.includes("selesai") || msg.includes("lunas"))
      return "/history-pesanan";
    return "/";
  };

  // ── Shared active-link style helper ──────────────────────────────────────
  const activeLink = (path) => location.pathname === path;

  return (
    <>
      {/* ════ MAIN NAV WRAPPER (scrollable top bar + nav bar) ════ */}
      <div
        className={`fixed top-0 left-0 right-0 z-[80] transition-all duration-500 ${
          scrolled ? "translate-y-[-36px]" : "translate-y-0"
        }`}
      >
        {/* ── TOP UTILITY BAR (Charcoal + Red Accent) ── */}
        <div className="bg-[#0f172a] text-white/80 py-2 px-6 border-b border-white/5">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em]">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                <Clock size={11} className="text-[#990000]" />
                <span>Layanan 24 Jam</span>
              </div>
              <div className="items-center gap-2 hover:text-white transition-colors cursor-pointer hidden md:flex border-l border-white/10 pl-8">
                <DollarSign size={11} className="text-[#C5A059]" />
                <span>Tarif Transparan &amp; Kompetitif</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="hidden lg:inline opacity-50 font-medium">
                Melayani perjalanan Anda dengan sepenuh hati
              </span>
            </div>
          </div>
        </div>

        {/* ── MAIN NAVIGATION BAR ── */}
        <nav
          className={`transition-all duration-500 ${
            scrolled
              ? "bg-white shadow-xl py-2.5 border-b border-slate-100"
              : "bg-white/95 backdrop-blur-md shadow-sm py-3.5"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between min-h-[52px]">

            {/* ── LOGO ── */}
            <Link to="/" className="flex items-center gap-3.5 shrink-0 group py-1">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[#990000] rounded-xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
                <img src={logo} alt="Logo" className="relative h-10 w-10 object-contain rounded-xl shadow-sm border border-slate-100" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-black tracking-tight text-lg text-[#0f172a] leading-tight">
                  Cakra Lima Tujuh
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-0.5 w-3.5 bg-[#990000] rounded-full shrink-0" />
                  <span className="text-[7.5px] font-bold text-slate-400 tracking-[0.18em] uppercase whitespace-nowrap">
                    Premium Rent, Tour &amp; Travel
                  </span>
                </div>
              </div>
            </Link>

            {/* ── DESKTOP CENTER NAV (pill) — all roles, lg+ only ── */}
            <div className="hidden lg:flex items-center bg-slate-50/90 rounded-full px-2.5 py-1.5 border border-slate-200/60 shadow-sm">
              {role === "driver" ? (
                <>
                  {driverMenu.map((m) => (
                    <Link
                      key={m.path}
                      to={m.path}
                      className={`px-4 py-2.5 rounded-full text-[12px] font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeLink(m.path)
                          ? "text-[#990000] bg-white shadow-md shadow-[#990000]/10"
                          : "text-slate-700 hover:text-[#990000]"
                      }`}
                    >
                      {m.icon} {m.name}
                    </Link>
                  ))}
                </>
              ) : role === "admin" ? (
                <>
                  {adminMenu.map((m) => (
                    <Link
                      key={m.path}
                      to={m.path}
                      className={`px-3.5 py-2.5 rounded-full text-[11.5px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-all ${
                        activeLink(m.path)
                          ? "text-[#990000] bg-white shadow-md shadow-[#990000]/10"
                          : "text-slate-700 hover:text-[#990000]"
                      }`}
                    >
                      {m.icon} {m.name}
                    </Link>
                  ))}
                </>
              ) : (
                /* Public / Client desktop center nav */
                <>
                  {/* Layanan with sub-dropdown */}
                  <div
                    className="relative"
                    onMouseEnter={() => setLayananDropdownOpen(true)}
                    onMouseLeave={() => setLayananDropdownOpen(false)}
                  >
                    <Link
                      to="/home"
                      className={`px-5 py-2.5 rounded-full text-[12.5px] font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeLink("/home")
                          ? "text-[#990000] bg-white shadow-md shadow-[#990000]/10"
                          : "text-slate-700 hover:text-[#990000]"
                      }`}
                    >
                      Layanan
                      <ChevronDown
                        size={15}
                        className={layananDropdownOpen ? "rotate-180 transition-transform text-[#990000]" : "transition-transform"}
                      />
                    </Link>
                    {layananDropdownOpen && (
                      <div className="absolute top-[calc(100%+12px)] left-0 w-80 bg-white border border-slate-100 shadow-[0_25px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-4 animate-dropdownIn z-[100]">
                        <Link
                          to="/home?type=lepas"
                          className="flex items-center gap-5 p-5 hover:bg-[#990000]/5 rounded-3xl transition-all group/item"
                        >
                          <div className="w-12 h-12 bg-[#990000] text-white rounded-2xl flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg shadow-[#990000]/20">
                            <Key size={22} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Sewa Lepas Kunci</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">Explore mandiri tanpa sopir</p>
                          </div>
                        </Link>
                        <Link
                          to="/home?type=driver"
                          className="flex items-center gap-5 p-5 hover:bg-[#990000]/5 rounded-3xl transition-all group/item border-t border-slate-50 mt-1"
                        >
                          <div className="w-12 h-12 bg-[#0f172a] text-[#C5A059] rounded-2xl flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg">
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

                  <Link
                    to="/open-trip"
                    className={`px-5 py-2.5 rounded-full text-[12.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                      activeLink("/open-trip")
                        ? "text-[#990000] bg-white shadow-md shadow-[#990000]/10"
                        : "text-slate-700 hover:text-[#990000]"
                    }`}
                  >
                    Open Trip
                  </Link>
                  <Link
                    to="/company-profile"
                    className={`px-5 py-2.5 rounded-full text-[12.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                      activeLink("/company-profile")
                        ? "text-[#990000] bg-white shadow-md shadow-[#990000]/10"
                        : "text-slate-700 hover:text-[#990000]"
                    }`}
                  >
                    Company
                  </Link>
                  <Link
                    to="/tour-packages"
                    className={`px-5 py-2.5 rounded-full text-[12.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                      activeLink("/tour-packages")
                        ? "text-[#990000] bg-white shadow-md shadow-[#990000]/10"
                        : "text-slate-700 hover:text-[#990000]"
                    }`}
                  >
                    Paket Wisata
                  </Link>
                </>
              )}
            </div>

            {/* ── RIGHT SIDE ACTIONS ── */}
            <div className="flex items-center gap-3">

              {/* Notification bell — visible on all screen sizes when logged in */}
              {user && (
                <div className="relative" ref={notifRef}>
                  <button
                    id="notification-bell"
                    aria-label="Notifikasi"
                    aria-expanded={notificationOpen}
                    onClick={() => {
                      setNotificationOpen((v) => !v);
                      setDesktopProfileOpen(false);
                      setProfileOpen(false);
                    }}
                    className="flex p-2.5 sm:p-3 rounded-full bg-slate-50 text-slate-500 hover:bg-[#990000]/10 hover:text-[#990000] transition-all relative"
                  >
                    <Bell
                      size={18}
                      className={notificationOpen ? "animate-swing text-[#990000]" : ""}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#990000] rounded-full border-2 border-white animate-pulse" />
                    )}
                  </button>

                  {/* Notification dropdown */}
                  {notificationOpen && (
                    <div className="absolute top-[calc(100%+12px)] right-0 w-[min(400px,calc(100vw-2rem))] bg-white border border-slate-100 shadow-[0_30px_60px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-6 animate-dropdownIn z-[110]">
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
                      <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center">
                            <Bell size={40} className="mx-auto text-slate-200 mb-4 opacity-50" />
                            <p className="text-xs font-bold text-slate-400 italic">Belum ada notifikasi untuk Anda.</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (!n.read) handleMarkAsRead(n.id);
                                setNotificationOpen(false);
                                navigate(getNotifRoute(n));
                              }}
                              className={`p-4 rounded-3xl transition-all cursor-pointer border ${
                                n.read
                                  ? "bg-slate-50/50 border-transparent opacity-60"
                                  : "bg-[#990000]/5 border-[#990000]/20 hover:bg-[#990000]/10 shadow-sm"
                              }`}
                            >
                              <div className="flex gap-4">
                                <div
                                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    n.read ? "bg-slate-200 text-slate-500" : "bg-[#990000] text-white"
                                  }`}
                                >
                                  <Bell size={18} />
                                </div>
                                <div className="flex-1">
                                  <p className={`text-[11px] leading-relaxed mb-2 ${n.read ? "text-slate-500 font-medium" : "text-slate-900 font-black"}`}>
                                    {n.message}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                      <Clock size={10} />
                                      {n.timestamp?.toDate
                                        ? n.timestamp.toDate().toLocaleString("id-ID", {
                                            hour: "2-digit", minute: "2-digit",
                                            day: "2-digit", month: "short",
                                          })
                                        : "Baru saja"}
                                    </div>
                                    <ChevronRight size={12} className="text-slate-300" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DESKTOP ACCOUNT DROPDOWN (lg+) ── */}
              {user ? (
                <div className="hidden lg:block relative" ref={desktopProfileRef}>
                  <button
                    id="desktop-profile-btn"
                    aria-haspopup="true"
                    aria-expanded={desktopProfileOpen}
                    onClick={() => {
                      setDesktopProfileOpen((v) => !v);
                      setNotificationOpen(false);
                    }}
                    className={`flex items-center gap-3 px-1.5 py-1.5 rounded-full transition-all border ${
                      role === "admin"
                        ? "border-[#990000]/30 bg-[#990000]/10"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="w-9 h-9 bg-[#990000] text-white rounded-full flex items-center justify-center text-sm font-black shadow-md">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden xl:block text-left mr-2">
                      <p className="text-[9px] font-black text-slate-900 uppercase leading-none mb-1">
                        {user.email?.split("@")[0]}
                      </p>
                      <p className="text-[8px] font-bold text-[#990000] uppercase tracking-widest opacity-80">
                        {role || "Member"}
                      </p>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform mr-2 ${desktopProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {desktopProfileOpen && (
                    <div
                      role="menu"
                      className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.15)] rounded-[2rem] p-3 animate-dropdownIn z-[90]"
                    >
                      {/* User info */}
                      <div className="px-4 py-3 mb-2 border-b border-slate-50">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Account</p>
                        <p className="text-[10px] font-black text-slate-900 truncate">{user.email}</p>
                      </div>

                      {/* Admin links */}
                      {role === "admin" && adminMenu.map((m) => (
                        <Link
                          key={m.path}
                          to={m.path}
                          role="menuitem"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[#990000]/10 rounded-2xl transition-all text-slate-600 hover:text-[#990000]"
                        >
                          <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]">{m.icon}</div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{m.name} Control</span>
                        </Link>
                      ))}

                      {/* Driver links */}
                      {role === "driver" && driverMenu.map((m) => (
                        <Link
                          key={m.path}
                          to={m.path}
                          role="menuitem"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 rounded-2xl transition-all text-slate-600 hover:text-emerald-600"
                        >
                          <div className="bg-white p-1.5 rounded-lg shadow-sm">{m.icon}</div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{m.name} Panel</span>
                        </Link>
                      ))}

                      {/* Client links */}
                      {(role === "client" || !role) && (
                        <Link
                          to="/history-pesanan"
                          role="menuitem"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[#990000]/10 rounded-2xl transition-all text-slate-600 hover:text-[#990000]"
                        >
                          <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]"><History size={16} /></div>
                          <span className="text-[10px] font-black uppercase tracking-widest">History Pesanan</span>
                        </Link>
                      )}

                      <div className="h-px bg-slate-50 my-2" />
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full flex items-center gap-3 px-4 py-4 text-[#990000] hover:bg-[#990000]/10 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest"
                      >
                        <LogOut size={16} /> Logout System
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  id="login-btn-desktop"
                  className="hidden lg:flex items-center gap-3 bg-[#990000] text-white px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] hover:bg-[#7A0000] shadow-lg shadow-[#990000]/20 transition-all group"
                >
                  Member Access <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              {/* ── MOBILE PROFILE BUTTON (visible only on < lg) ── */}
              <div className="lg:hidden relative" ref={profileRef}>
                <button
                  id="mobile-profile-btn"
                  aria-label="Menu navigasi"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  onClick={() => {
                    setProfileOpen((v) => !v);
                    setNotificationOpen(false);
                  }}
                  className={`flex items-center gap-2 p-1.5 rounded-full transition-all border min-w-[44px] min-h-[44px] justify-center ${
                    profileOpen
                      ? "border-[#990000]/40 bg-[#990000]/10"
                      : "border-slate-200 bg-slate-50 hover:bg-[#990000]/10 hover:border-[#990000]/30"
                  }`}
                >
                  {user ? (
                    <div className="w-8 h-8 bg-[#990000] text-white rounded-full flex items-center justify-center text-sm font-black shadow-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <Menu size={20} className="text-slate-600" />
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* ── MOBILE DROPDOWN PANEL ── */}
                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute top-[calc(100%+12px)] right-0 w-[min(300px,calc(100vw-2rem))] bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2rem] p-3 animate-dropdownIn z-[90]"
                  >
                    {user ? (
                      <>
                        {/* User info header */}
                        <div className="px-4 py-3 mb-2 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#990000] text-white rounded-full flex items-center justify-center font-black shadow-sm">
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                {user.email?.split("@")[0]}
                              </p>
                              <p className="text-[8px] font-bold text-[#990000] uppercase tracking-widest opacity-80">
                                {role || "Member"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Admin mobile menu */}
                        {role === "admin" && adminMenu.map((m) => (
                          <Link
                            key={m.path}
                            to={m.path}
                            role="menuitem"
                            onClick={() => setProfileOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                              activeLink(m.path)
                                ? "bg-[#990000]/10 text-[#990000]"
                                : "text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000]"
                            }`}
                          >
                            <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]">{m.icon}</div>
                            {m.name}
                          </Link>
                        ))}

                        {/* Driver mobile menu */}
                        {role === "driver" && driverMenu.map((m) => (
                          <Link
                            key={m.path}
                            to={m.path}
                            role="menuitem"
                            onClick={() => setProfileOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                              activeLink(m.path)
                                ? "bg-emerald-50 text-emerald-600"
                                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                            }`}
                          >
                            <div className="bg-white p-1.5 rounded-lg shadow-sm">{m.icon}</div>
                            {m.name}
                          </Link>
                        ))}

                        {/* Client / public mobile menu */}
                        {(role === "client" || !role) && (
                          <>
                            <Link
                              to="/home"
                              role="menuitem"
                              onClick={() => setProfileOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                                activeLink("/home") ? "bg-[#990000]/10 text-[#990000]" : "text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000]"
                              }`}
                            >
                              <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]"><Car size={16} /></div>
                              Layanan
                            </Link>
                            <Link
                              to="/open-trip"
                              role="menuitem"
                              onClick={() => setProfileOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                                activeLink("/open-trip") ? "bg-[#990000]/10 text-[#990000]" : "text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000]"
                              }`}
                            >
                              <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]"><Map size={16} /></div>
                              Open Trip
                            </Link>
                            <Link
                              to="/company-profile"
                              role="menuitem"
                              onClick={() => setProfileOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                                activeLink("/company-profile") ? "bg-[#990000]/10 text-[#990000]" : "text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000]"
                              }`}
                            >
                              <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]"><Users size={16} /></div>
                              Company
                            </Link>
                            <Link
                              to="/tour-packages"
                              role="menuitem"
                              onClick={() => setProfileOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                                activeLink("/tour-packages") ? "bg-[#990000]/10 text-[#990000]" : "text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000]"
                              }`}
                            >
                              <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]"><Map size={16} /></div>
                              Paket Wisata
                            </Link>
                            <Link
                              to="/history-pesanan"
                              role="menuitem"
                              onClick={() => setProfileOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                                activeLink("/history-pesanan") ? "bg-[#990000]/10 text-[#990000]" : "text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000]"
                              }`}
                            >
                              <div className="bg-white p-1.5 rounded-lg shadow-sm text-[#990000]"><History size={16} /></div>
                              History Pesanan
                            </Link>
                          </>
                        )}

                        <div className="h-px bg-slate-50 my-2" />
                        <button
                          onClick={handleLogout}
                          role="menuitem"
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-[#990000] hover:bg-[#990000]/10 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest"
                        >
                          <LogOut size={16} /> Logout
                        </button>
                      </>
                    ) : (
                      /* Not logged in — mobile */
                      <div className="p-2 space-y-1">
                        <Link
                          to="/login"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3.5 bg-[#990000] text-white rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest shadow-md shadow-[#990000]/20"
                        >
                          <LogIn size={16} /> Login
                        </Link>
                        <div className="h-px bg-slate-100 my-1" />
                        <Link
                          to="/home"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000] rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest"
                        >
                          <Car size={16} /> Layanan
                        </Link>
                        <Link
                          to="/open-trip"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000] rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest"
                        >
                          <Map size={16} /> Open Trip
                        </Link>
                        <Link
                          to="/tour-packages"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000] rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest"
                        >
                          <Map size={16} /> Paket Wisata
                        </Link>
                        <Link
                          to="/company-profile"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-[#990000]/10 hover:text-[#990000] rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest"
                        >
                          <Users size={16} /> Company
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
// Navbar v2 — includes Sewa Mobil for admin
