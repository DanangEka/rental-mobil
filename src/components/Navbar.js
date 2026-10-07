import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { Icon } from "../components/ui";
import logo from "../assets/logo.png";

/* Nav items. `icon` is a Material Symbols name resolved through src/icon-codepoints.json. */
const ADMIN_MENU = [
  { name: "Dashboard",    path: "/admin-dashboard",            icon: "trending_up" },
  { name: "Pesanan",      path: "/manajemen-pesanan",           icon: "assignment" },
  { name: "Layanan Sewa", path: "/home",                       icon: "vpn_key" },
  { name: "Data Mobil",   path: "/car-management",             icon: "directions_car" },
  { name: "Jadwal",       path: "/jadwal-armada",              icon: "view_timeline" },
  { name: "Client",       path: "/client-management",          icon: "group" },
  { name: "Driver",       path: "/admin-driver-management",    icon: "settings" },
  { name: "Open Trip",    path: "/admin/open-trip",            icon: "map" },
  { name: "Testimoni",    path: "/admin-testimoni",            icon: "rate_review" },
  { name: "Paket Wisata", path: "/admin-tour-packages",        icon: "luggage" },
  { name: "Keuangan",     path: "/laporan-keuangan-rekap-kas", icon: "account_balance_wallet" },
];

const DRIVER_MENU = [
  { name: "Dashboard",  path: "/driver-dashboard",     icon: "speed" },
  { name: "Order",      path: "/driver-orders",        icon: "assignment" },
  { name: "Verifikasi", path: "/vehicle-verification", icon: "photo_camera" },
  { name: "Bayar",      path: "/payment-verification", icon: "credit_card" },
  { name: "Profil",     path: "/driver-profile",       icon: "person" },
];

/**
 * Client sections. `Layanan` is a section rather than a leaf — its three real
 * destinations live in `LAYANAN_ITEMS` below and are rendered inside its
 * dropdown on desktop and inside the drawer on mobile. `section` items render a
 * group heading in the drawer instead of a single link.
 */
const CLIENT_MENU = [
  { name: "Layanan",       path: "/home",            icon: "directions_car", section: true },
  { name: "Discovery",     path: "/discovery",       icon: "explore" },
  { name: "Open Trip",     path: "/open-trip",       icon: "map" },
  { name: "Testimoni",     path: "/testimoni",       icon: "rate_review" },
  { name: "Company",       path: "/company-profile", icon: "group" },
  { name: "Paket Wisata",  path: "/tour-packages",   icon: "luggage" },
];

/**
 * The three things under "Layanan", defined once and rendered by both the
 * desktop dropdown and the mobile drawer. Previously the desktop dropdown
 * hardcoded these three blocks inline, so adding Trip Planner meant editing
 * markup rather than a list — and the mobile side had no way to reach any of
 * them. `tone` is the icon-chip pair, kept beside the item so neither renderer
 * invents its own colour.
 */
const LAYANAN_ITEMS = [
  {
    name: "Sewa Lepas Kunci",
    path: "/home?type=lepas",
    icon: "vpn_key",
    tone: "bg-c57-primary-container text-c57-on-primary",
    blurb: "Explore mandiri tanpa sopir",
  },
  {
    name: "Dengan Driver",
    path: "/home?type=driver",
    icon: "local_taxi",
    tone: "bg-c57-scrim text-c57-accent-line",
    blurb: "Layanan sopir profesional",
  },
  {
    name: "Trip Planner",
    path: "/trip-planner",
    icon: "route",
    tone: "bg-c57-tertiary-container text-c57-on-tertiary-container",
    blurb: "Rancang rute & kalkulasi biaya instan",
  },
];

/**
 * Account-scoped destinations, kept out of the menus above. These used to be
 * appended to whichever role menu was active, which meant the avatar popover
 * carried the entire product navigation — eleven items for an admin inside a
 * 300px panel. The popover now holds only these plus Logout.
 *
 * Both routes are `ProtectedRoute role="client"` in App.js, so the list is
 * applied to clients and signed-out visitors only (see `accountItems`).
 */
const ACCOUNT_ITEMS = [
  { name: "Profil",          path: "/profil",          icon: "person" },
  { name: "History Pesanan", path: "/history-pesanan", icon: "history" },
];

export default function Navbar() {
  const [user, setUser]                     = useState(null);
  const [role, setRole]                     = useState(null);
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen]       = useState(false);   // mobile profile dropdown
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false); // desktop account dropdown
  const [layananDropdownOpen, setLayananDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);   // mobile nav drawer (< xl)
  const [scrolled, setScrolled]             = useState(false);
  const [loadingNotif, setLoadingNotif]     = useState(false);

  const profileRef        = useRef(null);
  const desktopProfileRef = useRef(null);
  const notifRef          = useRef(null);
  const layananRef        = useRef(null);
  const drawerRef        = useRef(null);
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
      if (layananRef.current && !layananRef.current.contains(e.target))
        setLayananDropdownOpen(false);
      if (drawerRef.current && !drawerRef.current.contains(e.target))
        setDrawerOpen(false);
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
        setDrawerOpen(false);
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
    setLayananDropdownOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  /* The drawer is a full-height overlay, so it locks the page behind it the way
     `Modal` does. Restored to its prior value rather than blindly cleared —
     a nested surface may already be holding a lock. */
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [drawerOpen]);

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

  /* Exact pathname match. The `?type=` variants under "Layanan" share `/home`, so
     they are compared against the search string too — otherwise every sub-item
     of the dropdown lit up whenever any one of them was open. */
  const activeLink = (path) => {
    const [base, query] = path.split("?");
    if (location.pathname !== base) return false;
    if (!query) return true;
    return new URLSearchParams(location.search).get("type") === query;
  };

  /* A section item (only "Layanan" today) is active when any of its children
     is, not just when `/home` itself is the current route. */
  const layananActive =
    activeLink("/home") || LAYANAN_ITEMS.some((i) => activeLink(i.path));

  /* Navigation for the current role, shared by the drawer and the guest view.
     Clients and signed-out visitors both get CLIENT_MENU — every entry on it is
     a public route. */
  const drawerMenu =
    role === "admin" ? ADMIN_MENU : role === "driver" ? DRIVER_MENU : CLIENT_MENU;

  /* Account-scoped links, filtered to what the route guards in App.js actually
     allow. `/profil` and `/history-pesanan` are both `ProtectedRoute role="client"`
     and there is no admin or driver equivalent of either, so those roles get
     Logout only — previously admins reached a dead link here. Drivers
     additionally already carry "Profil" inside DRIVER_MENU. */
  const accountItems =
    role === "client" || !role
      ? ACCOUNT_ITEMS
      : [];

  /* The three role menus share one active/inactive treatment, so the class
     computation lives once rather than being repeated in four places. */
  /* `override` lets a caller supply the active state instead of deriving it from
     `path` — used by the "Layanan" toggle, which stays lit while any of its
     three children is the current route, not only when `/home` is. */
  const navItemClass = (path, override) =>
    [
      "px-space-md py-space-xs rounded-full font-label-md text-label-md uppercase",
      "tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5",
      (override === undefined ? activeLink(path) : override)
        ? "bg-c57-surface-container text-c57-primary font-semibold"
        : "text-c57-on-surface-variant hover:text-c57-on-surface hover:bg-c57-surface-container-high",
    ].join(" ");

  /* Compact variant for admin — shorter padding so 11 items fit without scrolling. */
  const adminNavItemClass = (path) =>
    [
      // token-lint-disable-next-line
      "px-2 py-1 rounded-full text-[10px] font-semibold uppercase",
      "tracking-wider transition-all whitespace-nowrap flex items-center gap-1",
      activeLink(path)
        ? "bg-c57-surface-container text-c57-primary"
        : "text-c57-on-surface-variant hover:text-c57-on-surface hover:bg-c57-surface-container-high",
    ].join(" ");

  const menuLinkClass = (path) =>
    [
      "w-full flex items-center gap-space-sm px-4 py-3 rounded-c57-md transition-all",
      "font-label-md text-label-md uppercase tracking-wider",
      activeLink(path)
        ? "bg-c57-primary/10 text-c57-primary"
        : "text-c57-on-surface-variant hover:bg-c57-primary/10 hover:text-c57-primary",
    ].join(" ");

  /* Driver surfaces use the semantic available-* pair rather than introducing a
     second green. */
  const driverLinkClass = (path) =>
    [
      "w-full flex items-center gap-space-sm px-4 py-3 rounded-c57-md transition-all",
      "font-label-md text-label-md uppercase tracking-wider",
      activeLink(path)
        ? "bg-c57-available-bg text-c57-available-text"
        : "text-c57-on-surface-variant hover:bg-c57-available-bg hover:text-c57-available-text",
    ].join(" ");

  /* One drawer, three roles — drivers keep their available-* treatment rather
     than being flattened onto the client's primary-tinted rows. */
  const drawerLinkClass = (path) =>
    role === "driver" ? driverLinkClass(path) : menuLinkClass(path);

  return (
    <>
      {/* ════ MAIN NAV WRAPPER (scrollable top bar + nav bar) ════ */}
      <div
        className={`fixed top-0 left-0 right-0 z-[80] transition-all duration-500 ${
          scrolled ? "translate-y-[-40px]" : "translate-y-0"
        }`}
      >
        {/* ── TOP UTILITY BAR ── */}
        <div className="w-full bg-c57-scrim text-c57-on-scrim h-10 px-margin-mobile sm:px-margin-tablet lg:px-margin flex items-center justify-between">
          <div className="flex items-center gap-space-md overflow-hidden whitespace-nowrap">
            <div className="flex items-center gap-space-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c57-available-text opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-c57-available-text" />
              </span>
              <span className="text-c57-on-scrim tracking-wider">Layanan 24 Jam</span>
            </div>
            <span className="hidden md:inline-block text-c57-on-secondary-fixed">•</span>
            <span className="hidden md:inline-flex items-center gap-space-xs text-c57-secondary-fixed-dim">
              <Icon name="attach_money" size="sm" />
              Tarif Transparan &amp; Kompetitif
            </span>
            <span className="hidden lg:inline-block text-c57-on-secondary-fixed">•</span>
            <span className="hidden lg:inline text-c57-secondary-fixed-dim">
              Surabaya/Sidoarjo Hub Juanda
            </span>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <span className="text-c57-secondary-fixed-dim hidden sm:inline">Hotline Resmi:</span>
            <a
              href="tel:+6281257570057"
              className="text-c57-surface-bright font-semibold hover:text-c57-secondary-fixed transition-colors"
            >
              +62 812-5757-0057
            </a>
          </div>
        </div>

        {/* ── MAIN NAVIGATION BAR ── */}
        <nav
          className={`h-20 flex items-center transition-all duration-500 px-margin-mobile sm:px-margin-tablet lg:px-margin ${
            scrolled
              ? "bg-c57-surface-container-lowest shadow-c57-overlay"
              : "bg-c57-surface-container-lowest/95 backdrop-blur-md shadow-c57-card"
          }`}
        >
          <div className="flex items-center justify-between w-full">

            {/* ── LOGO ── */}
            <Link to="/" className="flex items-center gap-space-sm group shrink-0">
              <div className="w-11 h-11 rounded-full bg-c57-primary-container flex items-center justify-center overflow-hidden shadow-c57-card transition-transform group-hover:scale-105">
                <img src={logo} alt="Cakra Lima Tujuh" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-c57-on-surface tracking-tight uppercase leading-none font-semibold">
                  Cakra Lima Tujuh
                </span>
                <span className="font-label-sm text-label-sm text-c57-primary tracking-[0.22em] uppercase font-semibold mt-1">
                  Premium Travel Agen
                </span>
              </div>
            </Link>

            {/* ── DESKTOP CENTER NAV (pill) — all roles, xl+ only ── */}
            <div className="hidden xl:flex min-w-0 flex-1 justify-center px-4">
            <div className={`flex items-center gap-0.5 bg-c57-surface-container-low p-1.5 rounded-full ${
              role === "admin" ? "overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""
            }`}>
              {role === "driver" ? (
                DRIVER_MENU.map((m) => (
                  <Link key={m.path} to={m.path} className={navItemClass(m.path)}>
                    <Icon name={m.icon} size="sm" />
                    {m.name}
                  </Link>
                ))
              ) : role === "admin" ? (
                ADMIN_MENU.map((m) => (
                  <Link key={m.path} to={m.path} className={adminNavItemClass(m.path)}>
                    <Icon name={m.icon} size="xs" />
                    {m.name}
                  </Link>
                ))
              ) : (
                <>
                  {/* Layanan with sub-dropdown */}
                  <div className="relative" ref={layananRef}>
                    <button
                      type="button"
                      aria-expanded={layananDropdownOpen}
                      onClick={() => setLayananDropdownOpen((v) => !v)}
                      className={`${navItemClass("/home", layananActive)} cursor-pointer`}
                    >
                      Layanan
                      <Icon
                        name="expand_more"
                        size="sm"
                        className={layananDropdownOpen ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </button>
                    {layananDropdownOpen && (
                      <div className="absolute top-[calc(100%+12px)] left-0 w-80 bg-c57-surface-container-lowest border border-c57-surface-variant shadow-c57-overlay rounded-c57-lg p-4 animate-dropdownIn z-[100]">
                        {LAYANAN_ITEMS.map((item, idx) => {
                          const isActive = activeLink(item.path);
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setLayananDropdownOpen(false)}
                              className={[
                                "flex items-center gap-5 p-5 rounded-c57-lg transition-all group/item",
                                idx > 0 ? "border-t border-c57-surface-variant mt-1" : "",
                                isActive ? "bg-c57-primary/5" : "hover:bg-c57-primary/5",
                              ].join(" ")}
                            >
                              <div className={[
                                "w-12 h-12 rounded-c57-md flex items-center justify-center",
                                "group-hover/item:scale-110 transition-transform shadow-c57-card",
                                item.tone,
                              ].join(" ")}
                              >
                                <Icon name={item.icon} size="xl" />
                              </div>
                              <div>
                                <p className="font-label-md text-label-md text-c57-on-surface uppercase tracking-widest">
                                  {item.name}
                                </p>
                                <p className="font-body-sm text-body-sm text-c57-on-surface-variant mt-1">
                                  {item.blurb}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Link to="/discovery" className={navItemClass("/discovery")}>
                    <Icon name="explore" size="sm" />
                    Discovery
                  </Link>
                  <Link to="/open-trip" className={navItemClass("/open-trip")}>
                    Open Trip
                  </Link>
                  <Link to="/testimoni" className={navItemClass("/testimoni")}>
                    <Icon name="rate_review" size="sm" />
                    Testimoni
                  </Link>
                  <Link to="/company-profile" className={navItemClass("/company-profile")}>
                    Company
                  </Link>
                  <Link to="/tour-packages" className={navItemClass("/tour-packages")}>
                    Paket Wisata
                  </Link>
                </>
              )}
            </div>
            </div>

            {/* ── RIGHT SIDE ACTIONS ── */}
            <div className="flex items-center gap-space-sm shrink-0">

              {/* Notification bell — all screen sizes when logged in */}
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
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 sm:p-3 rounded-full bg-c57-surface-container-low text-c57-on-surface-variant hover:bg-c57-primary/10 hover:text-c57-primary transition-all relative"
                  >
                    <Icon
                      name="notifications"
                      size="lg"
                      className={notificationOpen ? "animate-swing text-c57-primary" : ""}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-c57-primary-container rounded-full border-2 border-c57-surface-container-lowest animate-pulse" />
                    )}
                  </button>

                  {notificationOpen && (
                    <div className="absolute top-[calc(100%+12px)] right-0 w-[min(400px,calc(100vw-2rem))] bg-c57-surface-container-lowest border border-c57-surface-variant shadow-c57-overlay rounded-c57-lg p-6 animate-dropdownIn z-[110]">
                      <div className="flex items-center justify-between mb-6 border-b border-c57-surface-variant pb-4">
                        <h4 className="font-label-md text-label-md text-c57-on-surface uppercase tracking-widest">
                          Notifikasi
                        </h4>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            disabled={loadingNotif}
                            className="font-label-sm text-label-sm text-c57-primary hover:underline uppercase disabled:opacity-50"
                          >
                            {loadingNotif ? "Processing..." : "Tandai semua dibaca"}
                          </button>
                        )}
                      </div>
                      <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center">
                            <Icon name="notifications" size="3xl" className="mx-auto text-c57-outline-variant mb-4" />
                            <p className="font-body-sm text-body-sm text-c57-outline italic">
                              Belum ada notifikasi untuk Anda.
                            </p>
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
                              className={`p-4 rounded-c57-md transition-all cursor-pointer border ${
                                n.read
                                  ? "bg-c57-surface-container-low border-transparent opacity-60"
                                  : "bg-c57-primary/5 border-c57-primary/20 hover:bg-c57-primary/10"
                              }`}
                            >
                              <div className="flex gap-4">
                                <div
                                  className={`w-10 h-10 rounded-c57-md flex items-center justify-center flex-shrink-0 ${
                                    n.read
                                      ? "bg-c57-surface-container-high text-c57-on-surface-variant"
                                      : "bg-c57-primary-container text-c57-on-primary"
                                  }`}
                                >
                                  <Icon name="notifications" size="lg" />
                                </div>
                                <div className="flex-1">
                                  <p
                                    className={`font-body-sm text-body-sm leading-relaxed mb-2 ${
                                      n.read
                                        ? "text-c57-on-surface-variant"
                                        : "text-c57-on-surface font-semibold"
                                    }`}
                                  >
                                    {n.message}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 font-label-sm text-label-sm text-c57-outline uppercase">
                                      <Icon name="schedule" size="xs" />
                                      {n.timestamp?.toDate
                                        ? n.timestamp.toDate().toLocaleString("id-ID", {
                                            hour: "2-digit", minute: "2-digit",
                                            day: "2-digit", month: "short",
                                          })
                                        : "Baru saja"}
                                    </div>
                                    <Icon name="chevron_right" size="xs" className="text-c57-outline-variant" />
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

              {/* ── DESKTOP ACCOUNT (xl+) ── */}
              {user ? (
                <div className="hidden xl:block relative" ref={desktopProfileRef}>
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
                        ? "border-c57-primary/30 bg-c57-primary/10"
                        : "border-c57-surface-variant bg-c57-surface-container-low"
                    }`}
                  >
                    <div className="w-9 h-9 bg-c57-primary-container text-c57-on-primary rounded-full flex items-center justify-center font-label-lg text-label-lg">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left mr-2">
                      <p className="font-label-sm text-label-sm text-c57-on-surface uppercase leading-none">
                        {user.email?.split("@")[0]}
                      </p>
                      <p className="font-label-sm text-label-sm text-c57-primary uppercase">
                        {role || "Member"}
                      </p>
                    </div>
                    <Icon
                      name="expand_more"
                      size="sm"
                      className={`text-c57-outline transition-transform mr-1 ${desktopProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {desktopProfileOpen && (
                    <div
                      role="menu"
                      className="absolute top-[calc(100%+12px)] right-0 w-72 bg-c57-surface-container-lowest border border-c57-surface-variant shadow-c57-overlay rounded-c57-lg p-3 animate-dropdownIn z-[90]"
                    >
                      <div className="px-4 py-3 mb-2 border-b border-c57-surface-variant">
                        <p className="font-label-sm text-label-sm text-c57-outline uppercase">Active Account</p>
                        <p className="font-body-sm text-body-sm text-c57-on-surface truncate">{user.email}</p>
                      </div>

                      {role === "admin" && ADMIN_MENU.map((m) => (
                        <Link
                          key={m.path}
                          to={m.path}
                          role="menuitem"
                          className="flex items-center gap-space-sm px-4 py-3 rounded-c57-md transition-all text-c57-on-surface-variant hover:bg-c57-primary/10 hover:text-c57-primary"
                        >
                          <div className="bg-c57-surface-container-lowest p-1.5 rounded-c57-sm shadow-c57-card text-c57-primary">
                            <Icon name={m.icon} size="lg" />
                          </div>
                          <span className="font-label-sm text-label-sm uppercase">{m.name} Control</span>
                        </Link>
                      ))}

                      {role === "driver" && DRIVER_MENU.map((m) => (
                        <Link
                          key={m.path}
                          to={m.path}
                          role="menuitem"
                          className="flex items-center gap-space-sm px-4 py-3 rounded-c57-md transition-all text-c57-on-surface-variant hover:bg-c57-available-bg hover:text-c57-available-text"
                        >
                          <div className="bg-c57-surface-container-lowest p-1.5 rounded-c57-sm shadow-c57-card">
                            <Icon name={m.icon} size="lg" />
                          </div>
                          <span className="font-label-sm text-label-sm uppercase">{m.name} Panel</span>
                        </Link>
                      ))}

                      {(role === "client" || !role) && (
                        <>
                          <Link
                            to="/profil"
                            role="menuitem"
                            className="flex items-center gap-space-sm px-4 py-3 rounded-c57-md transition-all text-c57-on-surface-variant hover:bg-c57-primary/10 hover:text-c57-primary"
                          >
                            <div className="bg-c57-surface-container-lowest p-1.5 rounded-c57-sm shadow-c57-card text-c57-primary">
                              <Icon name="person" size="lg" />
                            </div>
                            <span className="font-label-sm text-label-sm uppercase">Profil</span>
                          </Link>
                          <Link
                            to="/history-pesanan"
                            role="menuitem"
                            className="flex items-center gap-space-sm px-4 py-3 rounded-c57-md transition-all text-c57-on-surface-variant hover:bg-c57-primary/10 hover:text-c57-primary"
                          >
                            <div className="bg-c57-surface-container-lowest p-1.5 rounded-c57-sm shadow-c57-card text-c57-primary">
                              <Icon name="history" size="lg" />
                            </div>
                            <span className="font-label-sm text-label-sm uppercase">History Pesanan</span>
                          </Link>
                        </>
                      )}

                      <div className="h-px bg-c57-surface-variant my-2" />
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full flex items-center gap-space-sm px-4 py-3 text-c57-primary hover:bg-c57-primary/10 rounded-c57-md transition-all font-label-md text-label-md uppercase"
                      >
                        <Icon name="logout" size="lg" /> Logout System
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden xl:flex items-center gap-space-sm">
                  <Link
                    to="/login"
                    id="login-btn-desktop"
                    className="flex items-center gap-2 px-space-md py-2 text-c57-on-surface hover:text-c57-primary font-label-md text-label-md uppercase tracking-wider transition-colors"
                  >
                    <Icon name="login" size="sm" />
                    Masuk
                  </Link>
                  <Link
                    to="/signup"
                    id="signup-btn-desktop"
                    className="inline-flex items-center justify-center gap-2 px-space-lg py-2.5 rounded-full bg-c57-primary-container text-c57-on-primary font-label-md text-label-md uppercase tracking-wider shadow-c57-card hover:bg-c57-primary hover:shadow-c57-overlay transition-all group"
                  >
                    <Icon name="person_add" size="sm" />
                    Daftar
                    <Icon name="chevron_right" size="sm" className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}

              {/* ── MOBILE: hamburger only (visible below xl) ── */}
              <div className="xl:hidden flex items-center">
                <button
                  id="mobile-nav-btn"
                  type="button"
                  aria-label="Buka menu navigasi"
                  aria-haspopup="dialog"
                  aria-expanded={drawerOpen}
                  onClick={() => {
                    setDrawerOpen(true);
                    setNotificationOpen(false);
                  }}
                  className="relative flex items-center justify-center p-2 rounded-full border border-c57-surface-variant bg-c57-surface-container-low text-c57-on-surface-variant transition-all min-w-[44px] min-h-[44px] hover:bg-c57-primary/10 hover:text-c57-primary hover:border-c57-primary/30"
                >
                  {user ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-c57-primary-container font-label-md text-label-md text-c57-on-primary">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <Icon name="menu" size="xl" />
                  )}
                </button>
              </div>



            </div>
          </div>
        </nav>
      </div>

      {/* ════ MOBILE DRAWER — rendered via Portal to escape transform context ════ */}
      {drawerOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="fixed inset-y-0 right-0 z-[120] flex h-full w-[min(320px,88vw)] flex-col border-l border-c57-surface-variant bg-c57-surface-container-lowest shadow-2xl animate-slideInRight overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-c57-surface-variant shrink-0 bg-c57-surface-container-lowest">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-c57-primary-container flex items-center justify-center shadow-c57-card">
                  <Icon name="explore" size="sm" className="text-c57-on-primary" />
                </div>
                <div>
                  <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface font-semibold leading-none">Cakra 57</p>
                  <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-primary leading-none mt-0.5">Menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-c57-on-surface-variant hover:bg-c57-surface-container-high hover:text-c57-primary transition-colors"
              >
                <Icon name="close" size="lg" />
              </button>
            </div>

            {/* User Card */}
            {user && (
              <div className="shrink-0 mx-3 mt-3 rounded-c57-lg bg-c57-primary/5 border border-c57-primary/15 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-c57-primary-container text-c57-on-primary flex items-center justify-center font-label-lg text-label-lg shrink-0 shadow-c57-card">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-label-sm text-label-sm uppercase tracking-wider text-c57-on-surface leading-none font-semibold">{user.email?.split("@")[0]}</p>
                  <p className="font-label-sm text-label-sm uppercase tracking-wider text-c57-primary mt-0.5">{role || "Member"}</p>
                </div>
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                  className="p-2 rounded-full text-c57-on-surface-variant hover:text-c57-primary hover:bg-c57-primary/10 transition-all"
                >
                  <Icon name="logout" size="md" />
                </button>
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto">

              {/* Navigasi */}
              <div className="p-3 space-y-0.5">
                <p className="px-3 pt-2 pb-1.5 font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">Navigasi</p>
                {drawerMenu.map((m) =>
                  m.section ? (
                    <div key={m.path}>
                      <p className="px-3 py-1.5 flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-primary font-semibold">
                        <Icon name="directions_car" size="sm" />
                        {m.name}
                      </p>
                      <div className="space-y-0.5 pl-1">
                        {LAYANAN_ITEMS.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            role="menuitem"
                            onClick={() => setDrawerOpen(false)}
                            className={drawerLinkClass(sub.path)}
                          >
                            <div className={[
                              "rounded-c57-sm p-1.5 shadow-c57-card shrink-0",
                              activeLink(sub.path)
                                ? "bg-c57-primary text-c57-on-primary"
                                : "bg-c57-surface-container-low text-c57-primary",
                            ].join(" ")}>
                              <Icon name={sub.icon} size="lg" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-label-sm uppercase tracking-wider leading-none">{sub.name}</span>
                              <span className="text-xs text-c57-on-surface-variant mt-0.5 leading-snug normal-case tracking-normal">{sub.blurb}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="my-2 h-px bg-c57-surface-variant mx-3" />
                    </div>
                  ) : (
                    <Link
                      key={m.path}
                      to={m.path}
                      role="menuitem"
                      onClick={() => setDrawerOpen(false)}
                      className={drawerLinkClass(m.path)}
                    >
                      <div className="rounded-c57-sm bg-c57-surface-container-low p-1.5 text-c57-primary shadow-c57-card shrink-0">
                        <Icon name={m.icon} size="lg" />
                      </div>
                      <span className="truncate">{m.name}</span>
                    </Link>
                  )
                )}
              </div>

              {/* Akun (client only) */}
              {(role === "client" || !role) && accountItems.length > 0 && user && (
                <div className="px-3 pb-3">
                  <div className="h-px bg-c57-surface-variant mb-2" />
                  <p className="px-3 pb-1.5 font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">Akun</p>
                  <div className="space-y-0.5">
                    {accountItems.map((m) => (
                      <Link
                        key={m.path}
                        to={m.path}
                        role="menuitem"
                        onClick={() => setDrawerOpen(false)}
                        className={menuLinkClass(m.path)}
                      >
                        <div className="rounded-c57-sm bg-c57-surface-container-low p-1.5 text-c57-primary shadow-c57-card shrink-0">
                          <Icon name={m.icon} size="lg" />
                        </div>
                        <span className="truncate">{m.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>{/* /scrollable body */}

            {/* Footer: guest auth buttons */}
            {!user && (
              <div className="shrink-0 border-t border-c57-surface-variant p-4 bg-c57-surface-container-lowest">
                <div className="space-y-2.5">
                  <Link
                    to="/login"
                    role="menuitem"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-center gap-2.5 rounded-c57-lg bg-c57-primary-container px-4 py-3.5 font-label-md text-label-md uppercase tracking-wider text-c57-on-primary shadow-c57-card transition-all hover:bg-c57-primary active:scale-[0.98]"
                  >
                    <Icon name="login" size="md" /> Masuk
                  </Link>
                  <Link
                    to="/signup"
                    role="menuitem"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-center gap-2.5 rounded-c57-lg border-2 border-c57-surface-variant px-4 py-3.5 font-label-md text-label-md uppercase tracking-wider text-c57-on-surface bg-c57-surface-container-low transition-all hover:border-c57-primary/50 hover:text-c57-primary hover:bg-c57-primary/5 active:scale-[0.98]"
                  >
                    <Icon name="person_add" size="md" /> Daftar
                  </Link>
                </div>
              </div>
            )}

          </div>
        </>,
        document.body
      )}
    </>
  );
}
