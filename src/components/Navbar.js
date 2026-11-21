import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { auth, db } from "../services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { Icon } from "../components/ui";
import { EDITORIAL_EASE } from "../motion/editorial";
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
 * The destinations under "Layanan", defined once and rendered by both the
 * desktop dropdown and the mobile Layanan group. Previously the desktop
 * dropdown hardcoded these blocks inline, so adding Trip Planner meant editing
 * markup rather than a list — and the mobile side had no way to reach any of
 * them. `tone` is the icon-chip pair, kept beside the item so neither renderer
 * invents its own colour.
 */
const LAYANAN_ITEMS = [
  {
    name: "Trip Planner",
    path: "/trip-planner",
    icon: "route",
    tone: "bg-c57-tertiary-container text-c57-on-tertiary-container",
    blurb: "Rancang perjalanan sesuai kebutuhan",
  },
  {
    name: "Rental Mobil",
    path: "/home",
    icon: "directions_car",
    tone: "bg-c57-primary-container text-c57-on-primary",
    blurb: "Lepas kunci atau dengan driver",
  },
];

/**
 * Shared motion contract for the desktop dropdowns. The entrance mirrors the
 * old `dropdownIn` keyframe; the exit is deliberately faster (0.14s) and
 * retreats upward so the panel appears to fold back into its trigger. The
 * mobile rail panel intentionally stays a plain conditional — its close is
 * expected to remove the panel from the DOM synchronously.
 */
function dropdownMotion(reduceMotion) {
  return {
    initial: reduceMotion ? false : { opacity: 0, y: -8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.1 } }
      : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.14, ease: EDITORIAL_EASE } },
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  };
}

/**
 * Mobile clients get three grouped sections that fit one row at 320px. Each
 * section owns its own panel; the label stays short so the rail never needs
 * horizontal scrolling.
 */
const MOBILE_NAV_GROUPS = [
  {
    id: "jelajah",
    name: "Jelajah",
    blurb: "Temukan destinasi dan paket yang cocok.",
    items: [
      { name: "Paket Wisata", path: "/tour-packages", icon: "luggage", blurb: "Bandingkan pilihan open trip dan private trip" },
      { name: "Open Trip", path: "/open-trip", icon: "map", blurb: "Ikut jadwal trip yang sudah tersedia" },
      { name: "Discovery", path: "/discovery", icon: "explore", blurb: "Cari inspirasi destinasi sebelum memilih paket" },
    ],
  },
  {
    id: "layanan",
    name: "Layanan",
    blurb: "Pilih cara Anda memulai perjalanan.",
    items: LAYANAN_ITEMS,
  },
  {
    id: "tentang",
    name: "Tentang",
    blurb: "Kenali kami dan cerita pelanggan.",
    items: [
      { name: "Testimoni", path: "/testimoni", icon: "rate_review", blurb: "Cerita dan ulasan pelanggan" },
      { name: "Company", path: "/company-profile", icon: "group", blurb: "Kenali Cakra Lima Tujuh" },
    ],
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
  const reduceMotion = useReducedMotion();
  const [user, setUser]                     = useState(null);
  const [role, setRole]                     = useState(null);
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false); // desktop account dropdown
  const [layananDropdownOpen, setLayananDropdownOpen] = useState(false);
  const [mobileNavGroup, setMobileNavGroup] = useState(null);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false); // mobile account sheet (< xl)
  const [scrolled, setScrolled]             = useState(false);
  const [loadingNotif, setLoadingNotif]     = useState(false);

  const desktopProfileRef = useRef(null);
  const notifRef          = useRef(null);
  const layananRef        = useRef(null);
  const railRef           = useRef(null);
  const accountSheetRef   = useRef(null);
  const mobileNavPanelRef = useRef(null);
  const mobileNavTriggerRef = useRef(null);
  const navigate          = useNavigate();
  const location          = useLocation();
  const mobileNavOpen     = mobileNavGroup !== null;
  /* The landing page runs the hero under the header, so its chrome has to be
     transparent until the first scroll. Every other route keeps the solid
     paper bar from the first pixel. */
  const isLanding         = location.pathname === "/";

  // ── Scroll listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Click-outside listeners ───────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (desktopProfileRef.current && !desktopProfileRef.current.contains(e.target))
        setDesktopProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotificationOpen(false);
      if (layananRef.current && !layananRef.current.contains(e.target))
        setLayananDropdownOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── ESC key closes all dropdowns ─────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setDesktopProfileOpen(false);
        setNotificationOpen(false);
        setLayananDropdownOpen(false);
        setMobileNavGroup(null);
        setAccountSheetOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // ── Close dropdowns on route change ──────────────────────────────────────
  useEffect(() => {
    setDesktopProfileOpen(false);
    setNotificationOpen(false);
    setLayananDropdownOpen(false);
    setMobileNavGroup(null);
    setAccountSheetOpen(false);
  }, [location.pathname]);

  /* The account sheet is a full-width overlay, so it locks the page behind it
     the way `Modal` does. Restored to its prior value rather than blindly
     cleared — a nested surface may already be holding a lock. */
  useEffect(() => {
    if (!user) setAccountSheetOpen(false);
  }, [user]);

  useEffect(() => {
    if (!accountSheetOpen || !user) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [accountSheetOpen, user]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileNavOpen]);

  /* If the viewport grows into the desktop layout while the sheet is open, drop
     it — otherwise the page would stay scroll-locked behind an invisible panel. */
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const handleChange = () => {
      if (!desktop.matches) return;
      setAccountSheetOpen(false);
      setMobileNavGroup(null);
    };
    desktop.addEventListener("change", handleChange);
    return () => desktop.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (role !== "admin" && role !== "driver") return;
    setMobileNavGroup(null);
  }, [role]);

  /* Move focus into the sheet, trap Tab, and hand focus back to the avatar on
     close — the same contract as `Modal`, without pulling the page overlay in. */
  useEffect(() => {
    if (!accountSheetOpen || !user) return;
    const trigger = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const sheet = accountSheetRef.current;
      if (!sheet) return;
      (sheet.querySelector("button, a[href]") || sheet).focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [accountSheetOpen, user]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const frame = requestAnimationFrame(() => {
      mobileNavPanelRef.current?.querySelector("a[href]")?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      mobileNavTriggerRef.current?.focus();
    };
  }, [mobileNavOpen]);

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
    setAccountSheetOpen(false);
    setDesktopProfileOpen(false);
    await signOut(auth);
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

  /* Staff keep the scrolling rail — eleven admin destinations cannot fit one
     row. Clients get three grouped sections instead. */
  const staffMenu =
    role === "admin" ? ADMIN_MENU : role === "driver" ? DRIVER_MENU : null;
  const mobileNavGroupData =
    MOBILE_NAV_GROUPS.find((group) => group.id === mobileNavGroup) || null;
  const groupHasActiveRoute = (group) =>
    group.items.some((item) => activeLink(item.path));

  /* Account-scoped links, filtered to what the route guards in App.js actually
     allow. `/profil` and `/history-pesanan` are both `ProtectedRoute role="client"`
     and there is no admin or driver equivalent of either, so those roles get
     Logout only — previously admins reached a dead link here. Drivers
     additionally already carry "Profil" inside DRIVER_MENU. */
  const accountItems =
    role === "client" || !role
      ? ACCOUNT_ITEMS
      : [];

  /* Bring the current route into view in the horizontally-scrolling rail. Without
     this an admin landing on "Keuangan" would see the rail start at Dashboard
     and assume the page is not in the menu. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector('[aria-current="page"]');
    if (!active) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    active.scrollIntoView({ block: "nearest", inline: "center", behavior: smooth ? "smooth" : "auto" });
  }, [location.pathname, role]);

  /* The three role menus share one active/inactive treatment, so the class
     computation lives once rather than being repeated in four places. */
  /* `override` lets a caller supply the active state instead of deriving it from
     `path` — used by the "Layanan" toggle, which stays lit while any of its
     children is the current route, not only when `/home` is. */
  const navItemClass = (path, override) =>
    [
      "relative px-1 py-2 font-label-md text-label-md uppercase",
      "tracking-[0.16em] transition-all whitespace-nowrap flex items-center gap-1.5",
      "after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-c57-accent-line after:transition-all after:duration-300",
      (override === undefined ? activeLink(path) : override)
        ? "text-c57-on-surface font-semibold after:right-0"
        : "text-c57-on-surface-variant hover:text-c57-on-surface after:right-full hover:after:right-0",
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

  /* Pills in the staff mobile rail. The active route is a filled ink pill; the
     rest stay quiet so the rail reads as navigation, not a toolbar of actions. */
  const mobileRailItemClass = (path) =>
    [
      "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5",
      "font-label-sm text-label-sm uppercase tracking-[0.14em] transition-colors",
      activeLink(path)
        ? "border-c57-primary-container bg-c57-primary-container text-c57-on-primary"
        : "border-c57-on-surface/10 bg-c57-surface-container-lowest/60 text-c57-on-surface-variant hover:border-c57-on-surface/25 hover:text-c57-on-surface",
    ].join(" ");

  const trapAccountSheetFocus = (e) => {
    if (e.key !== "Tab" || !accountSheetRef.current) return;
    const items = Array.from(
      accountSheetRef.current.querySelectorAll("a[href], button:not([disabled])")
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {/* ════ MAIN NAV WRAPPER (scrollable top bar + nav bar) ════ */}
      <div
        className={`fixed top-0 left-0 right-0 z-[80] transition-all duration-500 ${
          !isLanding && scrolled ? "xl:-translate-y-10" : "translate-y-0"
        }`}
      >
        {/* ── TOP UTILITY BAR — desktop only; suppressed on the landing page ── */}
        {!isLanding && (
        <div className="hidden xl:flex w-full bg-c57-surface-container text-c57-on-surface-variant h-10 px-margin-mobile sm:px-margin-tablet lg:px-margin items-center justify-between border-b border-c57-outline-variant/50">
          <div className="flex items-center gap-space-md overflow-hidden whitespace-nowrap">
            <div className="flex items-center gap-space-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c57-available-text opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-c57-available-text" />
              </span>
              <span className="tracking-wider">Layanan 24 Jam</span>
            </div>
            <span className="hidden md:inline-block text-c57-outline">•</span>
            <span className="hidden md:inline-flex items-center gap-space-xs text-c57-on-surface-variant">
              <Icon name="attach_money" size="sm" />
              Tarif Transparan &amp; Kompetitif
            </span>
            <span className="hidden lg:inline-block text-c57-outline">•</span>
            <span className="hidden lg:inline text-c57-on-surface-variant">
              Surabaya / Sidoarjo · Hub Juanda
            </span>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <span className="text-c57-on-surface-variant hidden sm:inline">Hotline Resmi</span>
            <a
              href="tel:+6281257570057"
              className="text-c57-on-surface font-semibold hover:text-c57-accent-line transition-colors"
            >
              +62 812-5757-0057
            </a>
          </div>
        </div>
        )}

        {/* ── MAIN NAVIGATION BAR ── */}
        <nav
          className={`h-16 xl:h-20 flex items-center transition-all duration-500 px-margin-mobile sm:px-margin-tablet lg:px-margin xl:border-b ${
            isLanding && !scrolled
              ? "bg-transparent border-transparent"
              : "bg-c57-surface/90 backdrop-blur-xl border-c57-outline-variant/60"
          }`}
        >
          <div className="flex items-center justify-between w-full">

            {/* ── LOGO ── */}
            <Link to="/" className="flex min-w-0 items-center gap-space-sm group shrink-0">
              <div className="w-9 h-9 xl:w-11 xl:h-11 rounded-full bg-c57-primary-container flex items-center justify-center overflow-hidden ring-1 ring-c57-on-surface/10 transition-transform group-hover:scale-105 shrink-0">
                <img src={logo} alt="Cakra Lima Tujuh" className="w-full h-full object-contain" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="hidden min-[360px]:block whitespace-nowrap font-display text-[17px] xl:text-[20px] text-c57-on-surface tracking-[-0.01em] leading-none">
                  Cakra Lima Tujuh
                </span>
                <span className="hidden xl:block font-label-sm text-label-sm text-c57-on-surface-variant tracking-[0.24em] uppercase mt-1.5">
                  Tour &amp; Travel · Rental
                </span>
              </div>
            </Link>

            {/* ── DESKTOP CENTER NAV — all roles, xl+ only ── */}
            <div className="hidden xl:flex min-w-0 flex-1 justify-center px-4">
            <div className={`flex items-center gap-7 ${
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
                  <Link to="/tour-packages" className={navItemClass("/tour-packages")}>
                    Paket Wisata
                  </Link>
                  <Link to="/open-trip" className={navItemClass("/open-trip")}>
                    Open Trip
                  </Link>
                  <Link to="/discovery" className={navItemClass("/discovery")}>
                    Discovery
                  </Link>
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
                    <AnimatePresence>
                      {layananDropdownOpen && (
                        <motion.div {...dropdownMotion(reduceMotion)} className="absolute top-[calc(100%+12px)] left-0 w-80 bg-c57-surface-container-lowest border border-c57-surface-variant shadow-c57-overlay rounded-c57-lg p-4 z-[100]">
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <Link to="/testimoni" className={navItemClass("/testimoni")}>
                    Testimoni
                  </Link>
                  <Link to="/company-profile" className={navItemClass("/company-profile")}>
                    Company
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
                      setAccountSheetOpen(false);
                      setMobileNavGroup(null);
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

                    <AnimatePresence>
                      {notificationOpen && (
                        <motion.div {...dropdownMotion(reduceMotion)} className="absolute top-[calc(100%+12px)] right-0 w-[min(400px,calc(100vw-2rem))] max-xl:fixed max-xl:inset-x-4 max-xl:top-[7.5rem] max-xl:w-auto max-xl:max-h-[calc(100svh-8.5rem)] max-xl:overflow-y-auto bg-c57-surface-container-lowest border border-c57-surface-variant shadow-c57-overlay rounded-c57-lg p-6 z-[110]">
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
                        </motion.div>
                      )}
                    </AnimatePresence>
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

                    <AnimatePresence>
                      {desktopProfileOpen && (
                        <motion.div
                          {...dropdownMotion(reduceMotion)}
                          role="menu"
                          className="absolute top-[calc(100%+12px)] right-0 w-72 bg-c57-surface-container-lowest border border-c57-surface-variant shadow-c57-overlay rounded-c57-lg p-3 z-[90]"
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
                        </motion.div>
                      )}
                    </AnimatePresence>
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

              {/* ── MOBILE: account + auth (below xl) ── */}
              <div className="flex items-center gap-1.5 xl:hidden">
                {user ? (
                  <button
                    id="mobile-account-btn"
                    type="button"
                    aria-label="Buka menu akun"
                    aria-haspopup="dialog"
                    aria-controls="account-sheet"
                    aria-expanded={accountSheetOpen}
                    onClick={() => {
                      setAccountSheetOpen(true);
                      setNotificationOpen(false);
                      setDesktopProfileOpen(false);
                      setMobileNavGroup(null);
                    }}
                    className="flex min-h-[44px] items-center gap-1 rounded-full border border-c57-surface-variant bg-c57-surface-container-low p-1 pr-1.5 text-c57-on-surface-variant transition-all hover:border-c57-primary/30 hover:bg-c57-primary/10 hover:text-c57-primary"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-c57-primary-container font-label-md text-label-md text-c57-on-primary">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                    <Icon
                      name="expand_more"
                      size="xs"
                      className={`hidden min-[380px]:block transition-transform ${accountSheetOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : (
                  <div className="inline-flex h-10 items-center rounded-full border border-c57-on-surface/10 bg-c57-surface-bright/75 p-0.5 shadow-c57-card backdrop-blur-md">
                    <Link
                      to="/login"
                      id="login-btn-mobile"
                      className="inline-flex h-9 items-center rounded-full px-3 font-label-sm text-label-sm uppercase tracking-[0.12em] text-c57-on-surface transition-colors hover:bg-c57-on-surface/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary"
                    >
                      Masuk
                    </Link>
                    <Link
                      to="/signup"
                      id="signup-btn-mobile"
                      className="inline-flex h-9 items-center justify-center rounded-full bg-c57-primary-container px-3.5 font-label-sm text-label-sm uppercase tracking-[0.12em] text-c57-on-primary transition-all hover:bg-c57-primary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary"
                    >
                      Daftar
                    </Link>
                  </div>
                )}
              </div>


            </div>
          </div>
        </nav>

        {/* ── MOBILE PRIMARY NAV (< xl) — staff rail or three client groups ── */}
        <div
          className="xl:hidden relative overflow-hidden border-b border-c57-outline-variant/60 bg-c57-surface/90 backdrop-blur-xl"
        >
          {staffMenu ? (
            <>
              <nav
                ref={railRef}
                aria-label="Navigasi utama"
                className="flex items-center gap-2 overflow-x-auto pl-margin-mobile pr-10 py-2 sm:pl-margin-tablet lg:pl-margin [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {staffMenu.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={activeLink(item.path) ? "page" : undefined}
                    onClick={() => setMobileNavGroup(null)}
                    className={mobileRailItemClass(item.path)}
                  >
                    <Icon name={item.icon} size="xs" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-c57-surface to-transparent" aria-hidden="true" />
            </>
          ) : (
            <nav
              aria-label="Navigasi utama"
              className="px-margin-mobile py-1.5 sm:px-margin-tablet lg:px-margin"
            >
              <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-0.5 rounded-full bg-c57-surface-container-lowest/70 p-0.5 ring-1 ring-inset ring-c57-on-surface/10">
                {MOBILE_NAV_GROUPS.map((group) => {
                  const isActive = groupHasActiveRoute(group);
                  const isOpen = mobileNavGroup === group.id;
                  return (
                    <button
                      key={group.id}
                      id={`mobile-nav-btn-${group.id}`}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls="mobile-nav-menu"
                      aria-current={isActive ? "page" : undefined}
                      onClick={(event) => {
                        mobileNavTriggerRef.current = event.currentTarget;
                        setNotificationOpen(false);
                        setDesktopProfileOpen(false);
                        setMobileNavGroup((current) =>
                          current === group.id ? null : group.id
                        );
                      }}
                      className={`flex h-10 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full px-1.5 font-label-sm text-label-sm uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c57-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-c57-surface ${
                        isActive
                          ? "bg-c57-primary-container text-c57-on-primary"
                          : isOpen
                            ? "bg-c57-primary/10 text-c57-primary"
                            : "text-c57-on-surface-variant hover:bg-c57-primary/10 hover:text-c57-primary"
                      }`}
                    >
                      <span className="truncate">{group.name}</span>
                      <Icon
                        name="expand_more"
                        size="xs"
                        className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>

        {mobileNavGroupData && (
          <div className="absolute inset-x-0 top-full z-[90] px-margin-mobile pt-2 sm:px-margin-tablet lg:px-margin xl:hidden">
            <nav
              ref={mobileNavPanelRef}
              id="mobile-nav-menu"
              aria-label={mobileNavGroupData.name}
              className="mx-auto max-h-[calc(100svh-9.5rem)] w-full max-w-2xl overflow-y-auto rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-3 shadow-c57-overlay animate-dropdownIn motion-reduce:animate-none"
            >
              <div className="flex items-start justify-between gap-3 px-1.5 pb-2.5 pt-1">
                <div className="min-w-0">
                  <p className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-c57-on-surface-variant">
                    {mobileNavGroupData.name}
                  </p>
                  <p className="mt-1 font-body-sm text-body-sm leading-snug text-c57-outline">
                    {mobileNavGroupData.blurb}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Tutup menu ${mobileNavGroupData.name}`}
                  onClick={() => setMobileNavGroup(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-c57-on-surface-variant transition-colors hover:bg-c57-primary/10 hover:text-c57-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c57-primary/40"
                >
                  <Icon name="close" size="sm" />
                </button>
              </div>

              <div
                className={`grid gap-2 ${
                  mobileNavGroupData.items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                {mobileNavGroupData.items.map((item) => {
                  const isActive = activeLink(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileNavGroup(null)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-c57-md border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c57-primary focus-visible:ring-offset-2 focus-visible:ring-offset-c57-surface-container-lowest ${
                        isActive
                          ? "border-c57-primary/35 bg-c57-primary/5"
                          : "border-c57-outline-variant/60 bg-c57-surface-container-low hover:border-c57-primary/25 hover:bg-c57-primary/5"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-c57-sm ${
                          isActive
                            ? "bg-c57-primary-container text-c57-on-primary"
                            : "bg-c57-surface-container-lowest text-c57-primary shadow-c57-card"
                        }`}
                      >
                        <Icon name={item.icon} size="sm" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-label-md text-label-md uppercase tracking-wider text-c57-on-surface">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block font-body-sm text-body-sm leading-snug text-c57-on-surface-variant">
                          {item.blurb}
                        </span>
                      </span>
                      {isActive ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-c57-primary/10 text-c57-primary">
                          <Icon name="check" size="xs" />
                        </span>
                      ) : (
                        <Icon
                          name="chevron_right"
                          size="sm"
                          className="shrink-0 text-c57-outline-variant transition-all group-hover:translate-x-0.5 group-hover:text-c57-primary"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        )}
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-[75] bg-c57-scrim/30 backdrop-blur-[2px] animate-fadeIn xl:hidden"
          aria-hidden="true"
          onClick={() => setMobileNavGroup(null)}
        />
      )}

      {/* ════ MOBILE ACCOUNT SHEET — portal to escape the header transform ════ */}
      {createPortal(
        <>
          <AnimatePresence>
            {accountSheetOpen && user && (
              <motion.div
                key="account-sheet-backdrop"
                className="fixed inset-0 z-[115] bg-c57-on-surface/40 backdrop-blur-sm"
                aria-hidden="true"
                onClick={() => setAccountSheetOpen(false)}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: EDITORIAL_EASE }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {accountSheetOpen && user && (
              <motion.div
                key="account-sheet"
                ref={accountSheetRef}
                id="account-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Menu akun"
                tabIndex={-1}
                onKeyDown={trapAccountSheetFocus}
                className="fixed inset-x-0 bottom-0 z-[120] max-h-[85svh] overflow-y-auto rounded-t-[1.75rem] border-t border-c57-surface-variant bg-c57-surface-container-lowest shadow-c57-overlay pb-[calc(1rem+env(safe-area-inset-bottom))]"
                initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0, transition: { duration: 0.1 } }
                    : { opacity: 0, y: 20, transition: { duration: 0.18, ease: EDITORIAL_EASE } }
                }
                transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: EDITORIAL_EASE }}
              >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-c57-outline-variant" aria-hidden="true" />

            <div className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-c57-primary-container font-display text-xl text-c57-on-primary shadow-c57-card">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg leading-tight text-c57-on-surface">
                    {user.email?.split("@")[0]}
                  </p>
                  <p className="truncate font-body-sm text-body-sm text-c57-on-surface-variant">
                    {user.email}
                  </p>
                  <span className="mt-1.5 inline-flex rounded-full bg-c57-primary/10 px-2 py-0.5 font-label-sm text-label-sm uppercase tracking-wider text-c57-primary">
                    {role || "Member"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountSheetOpen(false)}
                aria-label="Tutup menu akun"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-c57-surface-container text-c57-on-surface-variant transition-colors hover:bg-c57-surface-container-high hover:text-c57-primary"
              >
                <Icon name="close" size="lg" />
              </button>
            </div>

            <div className="px-5 pt-5">
              {accountItems.length > 0 ? (
                <>
                  <p className="pb-2 font-label-sm text-label-sm uppercase tracking-widest text-c57-outline">Akun</p>
                  <div className="space-y-1">
                    {accountItems.map((m) => (
                      <Link
                        key={m.path}
                        to={m.path}
                        onClick={() => setAccountSheetOpen(false)}
                        className={menuLinkClass(m.path)}
                      >
                        <div className="rounded-c57-sm bg-c57-surface-container-low p-1.5 text-c57-primary shadow-c57-card shrink-0">
                          <Icon name={m.icon} size="lg" />
                        </div>
                        <span className="truncate">{m.name}</span>
                        <Icon name="chevron_right" size="sm" className="ml-auto text-c57-outline-variant" />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rounded-c57-md bg-c57-surface-container-low px-4 py-3 font-body-sm text-body-sm text-c57-on-surface-variant">
                  Semua menu {role === "driver" ? "driver" : "admin"} tersedia di bilah navigasi di atas.
                </p>
              )}

              <div className="my-3 h-px bg-c57-surface-variant" />
              <button
                type="button"
                onClick={() => { setAccountSheetOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-3 rounded-c57-md px-4 py-3.5 font-label-md text-label-md uppercase tracking-wider text-c57-primary transition-colors hover:bg-c57-primary/10"
              >
                <div className="rounded-c57-sm bg-c57-primary/10 p-1.5 text-c57-primary">
                  <Icon name="logout" size="lg" />
                </div>
                Logout
              </button>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
