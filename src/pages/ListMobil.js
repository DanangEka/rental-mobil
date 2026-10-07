import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, updateDoc, addDoc, query, where, onSnapshot, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";
import { createUnitBooking, subscribeUnitBookings, getNextAvailableDate } from "../services/bookingService";
import UnitCalendarPicker from "../components/UnitCalendarPicker";
import { Button, Card, EmptyState, Icon, Input, Modal, Pill, Select, StatCard, Textarea } from "../components/ui";

const MAINTENANCE_STATUSES = ["servis", "service", "maintenance"];

/**
 * `mobil.status` is overloaded across the existing data. It carries the
 * *service* state ("normal" / "servis" — see MAINTENANCE_STATUSES) but this
 * page also used to write the *availability* state into it ("tersedia" /
 * "disewa"). `tersedia` is the real availability field: CarManagement and
 * ManajemenPesanan both read and write it, and ManajemenPesanan
 * (`setMobilTersedia`) stopped clobbering `status` for exactly this reason.
 *
 * So `status` is only consulted for service state, and availability comes from
 * `tersedia` with the legacy `status` values as a fallback for records written
 * before `tersedia` existed.
 */
const isAvailable = (m) => {
  if (typeof m.tersedia === "boolean") return m.tersedia;

  const s = m.status?.toLowerCase();
  if (s === "tersedia") return true;
  if (s === "disewa") return false;
  if (MAINTENANCE_STATUSES.includes(s)) return false;

  // No availability field and no service state: treated as bookable, which is
  // what the old `status: doc.data().status || "tersedia"` default did.
  return true;
};

const isRented = (m) => {
  if (typeof m.tersedia === "boolean") return !m.tersedia;
  return m.status?.toLowerCase() === "disewa";
};

export default function ListMobil() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const searchParams = new URLSearchParams(location.search);
  const serviceType = searchParams.get("type"); // "lepas" | "driver" | null (all)
  const [mobil, setMobil] = useState([]);
  const [filteredMobil, setFilteredMobil] = useState([]);
  const [tanggalMulai, setTanggalMulai] = useState({});
  const [tanggalSelesai, setTanggalSelesai] = useState({});
  const [lokasiPenyerahan, setLokasiPenyerahan] = useState({});
  const [titikTemuAddress, setTitikTemuAddress] = useState({});
  const [deliveryAddress, setDeliveryAddress] = useState({});
  const [userOrders, setUserOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [unitBookings, setUnitBookings] = useState({});

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMobil, setManualMobil] = useState(null);
  const [manualClient, setManualClient] = useState({
    namaLengkap: "",
    nomorTelepon: "",
    email: "",
    alamat: "",
    nik: "",
    dpAmount: "",
    paymentMethod: "Cash"
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserMobil, setSelectedUserMobil] = useState(null);

  const addNotification = async (message) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        message,
        timestamp: Timestamp.now(),
        read: false,
      });
    } catch (error) {
      console.error("Failed to add notification:", error);
    }
  };

  const addAdminNotification = async (message) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        message,
        timestamp: Timestamp.now(),
        read: false,
      });
    } catch (error) {
      console.error("Failed to add admin notification:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error("Gagal fetch user data:", error);
    }
  };

  useEffect(() => {
    // Realtime listener mobil — public, always load
    const unsubscribeMobil = onSnapshot(
      collection(db, "mobil"),
      (snapshot) => {
        const mobilData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMobil(mobilData);
      },
      (error) => {
        console.warn("Firestore mobil listener warning:", error);
      }
    );

    // Cek admin role (only if logged in)
    if (auth.currentUser) {
      auth.currentUser.getIdTokenResult().then((idTokenResult) => {
        setIsAdmin(idTokenResult.claims.admin === true);
      });

      // Fetch user data
      fetchUserData();
    }

    return () => {
      unsubscribeMobil();
    };
  }, []);

  // Realtime listener subcollection bookings per mobil
  //
  // The subscription is keyed on the *set of ids*, not on `mobil` itself: a
  // snapshot that only changes a price must not tear down and rebuild every
  // booking listener. `mobilIdKey` is the id list joined, and `mobilIds` is
  // memoised on that key so the effect below re-runs on exactly the same
  // conditions as the previous inline `mobil.map(...).join(",")` dependency —
  // while giving the lint rule a statically checkable dependency.
  const mobilIdKey = mobil.map((m) => m.id).join(",");
  const mobilIds = useMemo(() => mobilIdKey.split(","), [mobilIdKey]);

  useEffect(() => {
    if (mobilIds.length === 1 && mobilIds[0] === "") return;
    const unsubs = mobilIds.map((id) =>
      subscribeUnitBookings(id, (bookings) => {
        setUnitBookings((prev) => ({ ...prev, [id]: bookings }));
      })
    );
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [mobilIds]);

  // Helper render price breakdown
  const getMobilPriceInfo = (m) => {
    const isDriver = m.withDriver === true || m.layanan === "Dengan Driver" || serviceType === "driver";
    const rentalFee = m.rental_fee_per_day || m.harga || 0;
    const driverFee = m.driver_fee_per_day || (isDriver ? 250000 : 0);
    const totalPerDay = isDriver ? rentalFee + driverFee : rentalFee;
    return { isDriver, rentalFee, driverFee, totalPerDay };
  };

  // Single source of truth for the estimate — drives the modal summary AND
  // the written order, so what the client sees is exactly what is charged.
  const getEstimate = (m, mulai, selesai) => {
    if (!m || !mulai || !selesai) return null;
    const start = new Date(mulai);
    const end = new Date(selesai);
    const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (durasiHari <= 0) return null;
    const rentalType = serviceType === "driver" ? "Driver" : "Lepas Kunci";
    const perkiraanHarga = durasiHari * (m.harga || 0) + (rentalType === "Driver" ? 250000 : 0);
    return { durasiHari, rentalType, perkiraanHarga };
  };

  // Helper availability info matching Mockup 2
  const getAvailabilityInfo = (m) => {
    const statusLower = m.status?.toLowerCase();
    if (MAINTENANCE_STATUSES.includes(statusLower)) {
      return {
        badgeText: "Maintenance",
        badgeVariant: "danger",
        descText: "Unit sedang dalam perawatan (maintenance)",
      };
    }

    const bookings = unitBookings[m.id] || [];
    const nextDate = getNextAvailableDate(bookings);

    if (nextDate) {
      const formattedEn = nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const formattedId = nextDate.toLocaleDateString("id-ID", { day: "numeric", month: "long" });

      const activeBookings = bookings
        .filter((b) => b.end && b.end > new Date())
        .sort((a, b) => b.end - a.end);

      let untilStr = "";
      if (activeBookings.length > 0) {
        untilStr = activeBookings[0].end.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
      }

      return {
        badgeText: `Available ${formattedEn}`,
        badgeVariant: "available",
        descText: untilStr
          ? `Terpakai sampai ${untilStr} · tersedia mulai ${formattedId}`
          : `Tersedia mulai ${formattedId}`,
      };
    }

    return {
      badgeText: "Available",
      badgeVariant: "available",
      descText: "Tersedia untuk disewa sekarang",
    };
  };

  // Realtime listener pemesanan user or all orders if admin
  useEffect(() => {
    if (!auth.currentUser) return;

    let unsubscribeOrders;
    if (isAdmin) {
      unsubscribeOrders = onSnapshot(collection(db, "pemesanan"), (snapshot) => {
        setUserOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      const ordersQuery = query(
        collection(db, "pemesanan"),
        where("uid", "==", auth.currentUser.uid)
      );
      unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        setUserOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [isAdmin]);

  // Enhanced filtering and sorting
  useEffect(() => {
    let filtered = mobil.filter(m => {
      const matchesSearch = searchTerm === "" ||
        m.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.merek?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tahun?.toString().includes(searchTerm);

      const matchesStatus =
        filterStatus === "semua" ||
        (filterStatus === "disewa" ? isRented(m) : isAvailable(m));

      // Service type filter
      const isDriverService = m.withDriver === true || m.layanan === "Dengan Driver";
      const matchesServiceType =
        !serviceType ||
        (serviceType === "driver" ? isDriverService : !isDriverService);

      return matchesSearch && matchesStatus && matchesServiceType;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.nama.localeCompare(b.nama);
        case "price-low":
          return a.harga - b.harga;
        case "price-high":
          return b.harga - a.harga;
        case "year-new":
          return b.tahun - a.tahun;
        case "year-old":
          return a.tahun - b.tahun;
        default:
          return 0;
      }
    });

    setFilteredMobil(filtered);
  }, [mobil, searchTerm, filterStatus, sortBy, serviceType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // The onSnapshot will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleTanggalChange = (id, type, value) => {
    if (type === "mulai") {
      setTanggalMulai((prev) => ({ ...prev, [id]: value }));
    } else if (type === "selesai") {
      setTanggalSelesai((prev) => ({ ...prev, [id]: value }));
    } else if (type === "lokasi") {
      setLokasiPenyerahan((prev) => ({ ...prev, [id]: value }));
      // Reset delivery address when location changes
      if (value !== "Rumah" && value !== "Titik Temu") {
        setDeliveryAddress((prev) => ({ ...prev, [id]: "" }));
      }
    } else if (type === "titikTemu") {
      setTitikTemuAddress((prev) => ({ ...prev, [id]: value }));
    } else if (type === "deliveryAddress") {
      setDeliveryAddress((prev) => ({ ...prev, [id]: value }));
    }
  };

  const getUserOrderForCar = (mobilId) => {
    // Return the order with status 'disetujui' or 'menunggu pembayaran' or 'diproses' for the car
    return userOrders.find((order) =>
      order.mobilId === mobilId &&
      (order.status === "disetujui" || order.status === "menunggu pembayaran" || order.status === "diproses")
    );
  };

  const handleSewa = async (m) => {
    if (!auth.currentUser) {
      toast.warning("Silakan login terlebih dahulu.");
      return;
    }

    // Check verification status
    if (userData?.verificationStatus !== "verified") {
      toast.error("Akun Anda belum diverifikasi.", "Silakan upload KTP di halaman profil untuk verifikasi terlebih dahulu.");
      return;
    }

    const existingOrder = getUserOrderForCar(m.id);
    if (
      existingOrder &&
      ["diproses", "disetujui", "approved", "menunggu pembayaran"].includes(
        existingOrder.status?.toLowerCase()
      )
    ) {
      toast.warning("Anda sudah memiliki pemesanan aktif untuk mobil ini.");
      return;
    }

    const mulai = tanggalMulai[m.id];
    const selesai = tanggalSelesai[m.id];
    const lokasi = lokasiPenyerahan[m.id] || "";

    if (!mulai || !selesai) {
      toast.warning("Pilih tanggal mulai dan selesai terlebih dahulu.");
      return;
    }

    // Validasi lokasi penyerahan
    if (!lokasi) {
      toast.warning("Pilih lokasi penyerahan terlebih dahulu.");
      return;
    }

    // Validasi alamat untuk Rumah atau Titik Temu (berlaku untuk semua jenis sewa)
    if (lokasi === "Rumah" || lokasi === "Titik Temu") {
      if (!deliveryAddress[m.id]?.trim()) {
        toast.warning("Isi alamat pengiriman terlebih dahulu.");
        return;
      }
    }

    const estimate = getEstimate(m, mulai, selesai);
    if (!estimate) {
      toast.error("Format Tanggal Salah", "Tanggal selesai harus setelah tanggal mulai.");
      return;
    }

    const { durasiHari, perkiraanHarga, rentalType: selectedRentalType } = estimate;

    try {
      // Validasi overlap & simpan ke subcollection units/{unitId}/bookings
      const start = new Date(mulai);
      const end = new Date(selesai);
      const bookingDocId = await createUnitBooking(m.id, start, end, "online");

      await addDoc(collection(db, "pemesanan"), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        // Selalu ditulis, null berarti "belum ada driver". firestore.rules
        // membaca field ini langsung, jadi absennya akan menggagalkan query.
        driverId: null,
        mobilId: m.id,
        bookingId: bookingDocId,
        namaMobil: m.nama,
        platNomor: m.platNomor || "",
        tanggal: new Date().toISOString(),
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        durasiHari,
        hargaPerhari: m.harga,
        perkiraanHarga,
        rentalType: selectedRentalType,
        status: "diproses",
        paymentStatus: "pending",
        namaClient: userData?.nama || userData?.NamaLengkap || auth.currentUser.displayName || "",
        telepon: userData?.nomorTelepon || userData?.NomorTelepon || auth.currentUser.phoneNumber || "",
        dpAmount: perkiraanHarga * 0.5,
        lokasiPenyerahan: lokasi,
        titikTemuAddress: titikTemuAddress[m.id] || "",
        deliveryAddress: deliveryAddress[m.id] || "",
      });

      await addNotification("Pemesanan berhasil! Silakan tunggu konfirmasi.");
      await addAdminNotification(`Pesanan baru dari ${auth.currentUser.email}: ${m.nama}`);

      toast.success("Pemesanan Berhasil!", "Silakan tunggu konfirmasi selanjutnya.");
      setShowUserModal(false);
      setSelectedUserMobil(null);
    } catch (err) {
      console.error("Gagal menyewa:", err);
      toast.error(err.message || "Terjadi kesalahan saat menyewa.");
    }
  };

  const openSewaManualModal = (m) => {
    setManualMobil(m);
    setShowManualModal(true);
  };

  const openUserSewaModal = (m) => {
    // Require login for booking action
    if (!auth.currentUser) {
      navigate("/login", { state: { returnTo: `/home${location.search}` } });
      return;
    }
    setSelectedUserMobil(m);
    setShowUserModal(true);
  };

  const handleSubmitSewaManual = async () => {
    if (!manualClient.namaLengkap || !manualClient.nomorTelepon) {
      toast.warning("Nama dan Nomor Telepon wajib diisi");
      return;
    }

    try {
      const m = manualMobil;
      const mulai = tanggalMulai[m.id];
      const selesai = tanggalSelesai[m.id];

      if (!mulai || !selesai) {
        toast.warning("Pilih tanggal mulai dan selesai terlebih dahulu.");
        return;
      }

      const start = new Date(mulai);
      const end = new Date(selesai);
      const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (durasiHari <= 0) {
        toast.error("Format Tanggal Salah", "Tanggal selesai harus setelah tanggal mulai.");
        return;
      }

      const totalHarga = durasiHari * m.harga;
      const selectedRentalType = "Lepas Kunci"; // Fixed to Lepas Kunci as mode selection is removed
      const perkiraanHarga = totalHarga;

      if (manualClient.dpAmount && parseFloat(manualClient.dpAmount) < (perkiraanHarga * 0.5)) {
        toast.warning(`Nominal DP minimal 50% (Rp ${(perkiraanHarga * 0.5).toLocaleString()})`);
        return;
      }

      // Validasi overlap & simpan ke subcollection units/{unitId}/bookings
      const bookingDocId = await createUnitBooking(m.id, start, end, "manual_offline");

      const finalEmail = manualClient.email || `guest_${Date.now()}@rent.local`;

      const userRef = await addDoc(collection(db, "users"), {
        nama: manualClient.namaLengkap,
        email: finalEmail,
        nomorTelepon: manualClient.nomorTelepon,
        alamat: manualClient.alamat || "",
        nik: manualClient.nik || "-",
        role: "client",
        verificationStatus: "verified",
        createdAt: Timestamp.now(),
        isGuest: true
      });

      const orderData = {
        uid: userRef.id,
        email: finalEmail,
        driverId: null,
        mobilId: m.id,
        bookingId: bookingDocId,
        namaMobil: m.nama,
        platNomor: m.platNomor || "",
        tanggal: new Date().toISOString(),
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        durasiHari,
        hargaPerhari: m.harga,
        perkiraanHarga,
        rentalType: selectedRentalType,
        status: "tugas aktif",
        paymentStatus: manualClient.paymentMethod === "Cash" ? "paid_cash" : "paid_transfer",
        paymentMethod: manualClient.paymentMethod,
        namaClient: manualClient.namaLengkap,
        telepon: manualClient.nomorTelepon,
        nik: manualClient.nik || "-",
        dpAmount: manualClient.dpAmount ? parseFloat(manualClient.dpAmount) : perkiraanHarga,
        lokasiPenyerahan: lokasiPenyerahan[m.id] || "Di Tempat",
        titikTemuAddress: titikTemuAddress[m.id] || "",
        isManualSewa: true
      };

      const orderRef = await addDoc(collection(db, "pemesanan"), orderData);

      // Auto trigger print invoice
      InvoiceGenerator.generateDPInvoice({ ...orderData, id: orderRef.id }, { nama: manualClient.namaLengkap, email: finalEmail, nomorTelepon: manualClient.nomorTelepon });

      await updateDoc(doc(db, "mobil", m.id), {
        status: "disewa",
        tersedia: false,
      });

      toast.success("Sewa Manual Berhasil", `Penyewaan ${m.nama} telah diaktifkan`);
      setShowManualModal(false);
      setManualMobil(null);
      setManualClient({ namaLengkap: "", nomorTelepon: "", email: "", alamat: "", paymentMethod: "Cash", nik: "", dpAmount: "" });

    } catch (err) {
      console.error(err);
      toast.error("Gagal Sewa Manual", err.message || "Terjadi kesalahan.");
    }
  };

  const serviceOptions = [
    { label: "Semua", val: null },
    { label: "Lepas Kunci", val: "lepas" },
    { label: "Dengan Driver", val: "driver" },
  ];

  const trustBadges = [
    {
      icon: "verified",
      title: "Unit Prima",
      caption: "Standar QC Tinggi & Higienis",
      chip: "bg-c57-primary-container text-c57-on-primary",
    },
    {
      icon: "star",
      title: "Layanan Bintang",
      caption: "Customer Priority & Chauffeur",
      chip: "bg-c57-tertiary-container text-c57-on-tertiary-container",
    },
    {
      icon: "security",
      title: "Asuransi Lengkap",
      caption: "Proteksi Perjalanan Total",
      chip: "bg-white/10 text-c57-on-scrim",
    },
  ];

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-16 text-c57-on-surface">
      {/* ===== Hero ===== */}
      <div className="relative bg-c57-scrim overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=1920&auto=format&fit=crop&q=80"
          alt="Luxury car fleet"
          className="absolute inset-0 w-full h-full object-cover opacity-25 scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-c57-scrim/95 via-c57-scrim/75 to-c57-scrim/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim via-transparent to-c57-scrim/30" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom, rgba(129,1,0,0.1) 0%, transparent 70%)" }} />

        <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter py-16 md:py-20 relative z-10 w-full">
          <div className="max-w-3xl">
            <Pill
              variant="onScrim"
              icon="directions_car"
              size="md"
              className="mb-6"
            >
              {serviceType === "driver" ? "Premium Chauffeur Service" : serviceType === "lepas" ? "Self Drive Liberty" : "Armada Cakra Lima Tujuh"}
            </Pill>

            <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-c57-surface-bright tracking-tight">
              {serviceType === "driver" ? "Sewa Dengan Driver" : serviceType === "lepas" ? "Sewa Lepas Kunci" : "Rental Mobil Surabaya"}
            </h1>

            <p className="mt-4 text-body-lg text-c57-on-scrim/60 leading-relaxed max-w-2xl">
              {serviceType === "driver"
                ? "Nikmati kenyamanan berkelas dengan driver profesional yang handal, memastikan setiap perjalanan Anda aman dan menyenangkan."
                : serviceType === "lepas"
                ? "Kendali penuh di tangan Anda. Nikmati kebebasan mengeksplorasi setiap sudut kota dengan unit pilihan terbaik kami."
                : "Rental mobil Lidah Wetan dan sekitar — armada pilihan lepas kunci atau dengan driver, siap menemani setiap perjalanan berharga Anda."}
            </p>

            <div className="mt-10 flex flex-wrap gap-4 sm:gap-6 border-t border-white/10 pt-8">
              {trustBadges.map((badge) => (
                <div key={badge.title} className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center ${badge.chip}`}>
                    <Icon name={badge.icon} size="lg" />
                  </span>
                  <div>
                    <p className="font-label-sm text-label-sm text-c57-on-scrim font-bold uppercase tracking-wider">{badge.title}</p>
                    <p className="font-label-sm text-label-sm text-c57-on-scrim/50">{badge.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-c57-surface-container-low to-transparent" />
      </div>

      {/* ===== Filter & Fleet Control Panel ===== */}
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <Card variant="flat" className="p-6 sm:p-8 -mt-16 relative z-20 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Keyword Search */}
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">
                Pencarian Armada
              </label>
              <Input
                icon="search"
                placeholder="Ketik nama mobil, merek, atau tahun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                 aria-label="Pencarian armada"
              />
            </div>

            {/* Service Mode Switcher Tabs */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">
                Tipe Layanan
              </label>
              <div className="flex items-center p-1 bg-c57-surface-container rounded-full">
                {serviceOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => navigate(opt.val ? `/home?type=${opt.val}` : "/home")}
                    className={`flex-1 py-2 rounded-full font-label-sm text-label-sm font-semibold transition-all ${
                      serviceType === opt.val
                        ? "bg-c57-scrim text-c57-on-scrim"
                        : "text-c57-on-surface-variant hover:text-c57-on-surface"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div className="lg:col-span-2 flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">
                Urutkan
              </label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Urutkan armada"
              >
                <option value="name">Abjad (A-Z)</option>
                <option value="price-low">Harga Terendah</option>
                <option value="price-high">Harga Tertinggi</option>
              </Select>
            </div>

            {/* Ketersediaan */}
            <div className="lg:col-span-2 flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">
                Ketersediaan
              </label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Ketersediaan armada"
              >
                <option value="semua">Semua Status</option>
                <option value="tersedia">Hanya Tersedia</option>
                <option value="disewa">Disewa</option>
              </Select>
            </div>

            {/* Refresh */}
            <div className="lg:col-span-1 flex justify-end">
              <Button
                variant="secondary"
                icon="refresh"
                size="md"
                className={refreshing ? "animate-spin pointer-events-none" : ""}
                onClick={handleRefresh}
                aria-label="Muat ulang armada"
              />
            </div>
          </div>

          {/* Quick Metrics Counter Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-c57-surface-variant">
            <StatCard
              label="Tersedia"
              value={filteredMobil.filter(isAvailable).length}
              unit="Unit siap"
              icon="task_alt"
            />
            <StatCard
              label="Disewa"
              value={filteredMobil.filter(isRented).length}
              unit="Dalam tugas"
              icon="key"
            />
            <StatCard
              label="Total Armada"
              value={filteredMobil.length}
              unit="Kelas premium"
              icon="directions_car"
            />
            <StatCard
              label="Rating Tinggi"
              value="4.9/5"
              unit="dari 120+ review"
              icon="star"
            />
          </div>
        </Card>

        {/* Verification Alert */}
        {userData && userData.verificationStatus !== "verified" && (
          <Card
            radius="lg"
            className={`mt-6 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fadeIn ${
              userData.verificationStatus === "unverified"
                ? "bg-c57-error-container/10 border-c57-error-container/30"
                : "bg-c57-secondary-container/30 border-c57-tertiary-container"
            }`}
          >
            <span className="w-11 h-11 rounded-full bg-c57-surface-container-lowest flex items-center justify-center shrink-0">
              <Icon name={userData.verificationStatus === "unverified" ? "person" : "verified"} className="text-c57-primary" />
            </span>
            <div className="flex-1">
              <p className="font-label-md text-label-md font-bold uppercase tracking-wider text-c57-on-surface mb-1">Status Verifikasi Account</p>
              <p className="text-body-sm text-c57-on-surface-variant">
                {userData.verificationStatus === "unverified"
                  ? "Akun Anda belum diverifikasi. Silakan upload KTP di halaman profil untuk dapat melakukan penyewaan."
                  : "Dokumen verifikasi Anda sedang dalam peninjauan oleh admin. Mohon tunggu sejenak."}
              </p>
            </div>
            <Button
              variant="secondary"
              icon="person"
              iconPosition="right"
              onClick={() => navigate("/profil")}
            >
              Update Profil
            </Button>
          </Card>
        )}

        {filteredMobil.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="directions_car"
              title="Armada Tidak Ditemukan"
              description="Coba gunakan kata kunci pencarian lain atau ubah filter layanan Anda."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8 md:mt-12">
            {filteredMobil.map((m, i) => {
              const statusLower = m.status?.toLowerCase();
              const order = getUserOrderForCar(m.id);
              const orderStatus = order?.status?.toLowerCase();
              const info = getAvailabilityInfo(m);
              const isDriverLayanan = m.withDriver === true || m.layanan === "Dengan Driver" || serviceType === "driver";
              const price = getMobilPriceInfo(m);
              const startPicked = tanggalMulai[m.id];

              return (
                <Card
                  key={m.id}
                  variant="flat"
                  interactive
                  className="p-5 flex flex-col h-full group"
                >
                  {/* Header Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Pill variant="neutral">
                      {isDriverLayanan ? "Sewa dengan driver" : "Sewa lepas kunci"}
                    </Pill>
                    <Pill variant={info.badgeVariant} icon="calendar_month">
                      {info.badgeText}
                    </Pill>
                  </div>

                  {/* Image Box */}
                  <div className="relative w-full aspect-[4/3] bg-c57-surface-container rounded-c57-lg overflow-hidden mb-4 flex items-center justify-center">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute bottom-3 left-3 bg-c57-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-c57-md">
                      <span className="font-label-md text-label-md text-c57-primary font-bold">Rp {price.totalPerDay.toLocaleString()}</span>
                      <span className="font-label-sm text-label-sm text-c57-on-surface-variant">/hari</span>
                    </div>
                  </div>

                  {/* Title & Availability */}
                  <div className="mb-3">
                    <h3 className="font-headline-sm text-headline-sm text-c57-on-surface font-semibold leading-snug group-hover:text-c57-primary transition-colors duration-300 mb-1">
                      {m.nama}
                    </h3>
                    <p className="text-body-sm text-c57-on-surface-variant leading-relaxed">
                      {info.descText}
                    </p>
                  </div>

                  {/* Amenities Row */}
                  <div className="flex items-center gap-4 text-body-sm text-c57-on-surface-variant mb-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Icon name="group" size="sm" className="text-c57-primary" />
                      <span>{m.seats || 4} passengers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon name="usb" size="sm" className="text-c57-primary" />
                      <span>{m.chargingPort !== false ? "USB Charging" : "No Charging"}</span>
                    </div>
                  </div>

                  {/* Divider & Calendar */}
                  <div className="border-t border-c57-surface-variant pt-4 mt-auto">
                    <p className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest mb-2">
                      Pilih tanggal sewa
                    </p>
                    <UnitCalendarPicker
                      compact={true}
                      bookings={unitBookings[m.id] || []}
                      startDate={tanggalMulai[m.id] || ""}
                      endDate={tanggalSelesai[m.id] || ""}
                      onChange={({ start, end }) => {
                        handleTanggalChange(m.id, "mulai", start ? `${start}T08:00` : "");
                        handleTanggalChange(m.id, "selesai", end ? `${end}T08:00` : "");
                      }}
                    />

                    {/* Booking Action Button */}
                    <div className="mt-4">
                      {(() => {
                        if (order && !isAdmin) {
                          if (orderStatus === "diproses") {
                            return (
                              <div className="flex flex-col items-center py-2 text-center">
                                <div className="w-1.5 h-1.5 bg-c57-accent-line rounded-full animate-ping mb-2" />
                                <p className="font-label-sm text-label-sm text-c57-tertiary font-bold uppercase tracking-widest">Processing... Please Wait</p>
                              </div>
                            );
                          } else if (["disetujui", "menunggu pembayaran", "approved"].includes(orderStatus?.trim())) {
                            return (
                              <Button
                                icon="credit_card"
                                size="lg"
                                className="w-full"
                                onClick={() => navigate("/history-pesanan")}
                              >
                                Upload Payment Proof
                              </Button>
                            );
                          } else if (orderStatus === "pembayaran berhasil") {
                            return (
                              <div className="flex items-center justify-center gap-2 py-3 bg-c57-available-bg/60 text-c57-available-text rounded-c57-lg">
                                <Icon name="check_circle" size="sm" />
                                <span className="font-label-sm text-label-sm font-bold uppercase tracking-widest">Order Confirmed</span>
                              </div>
                            );
                          }
                        }

                        if (MAINTENANCE_STATUSES.includes(statusLower)) {
                          return (
                            <div className="text-center py-3 bg-c57-surface-container text-c57-on-surface-variant rounded-c57-lg font-label-sm text-label-sm font-bold uppercase tracking-widest">
                              Under Maintenance
                            </div>
                          );
                        }

                        const defaultText = isDriverLayanan ? "Rent With Driver" : "Rent This Unit";
                        const buttonText = startPicked
                          ? `Book ${new Date(startPicked).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : defaultText;

                        if (isAdmin) {
                          return (
                            <Button
                              icon="person"
                              iconPosition="right"
                              size="lg"
                              className="w-full"
                              onClick={() => openSewaManualModal(m)}
                            >
                              Manual Order (Cashier)
                            </Button>
                          );
                        }

                        return (
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={() => openUserSewaModal(m)}
                          >
                            {buttonText}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== User Sewa Modal ===== */}
      <Modal
        open={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUserMobil(null);
        }}
        title="Konfirmasi Sewa"
        subtitle={selectedUserMobil ? `Lengkapi detail perjalanan Anda untuk unit ${selectedUserMobil.nama}.` : undefined}
        size="lg"
        footer={
          selectedUserMobil && (
            <Button
              size="lg"
              icon="check_circle"
              iconPosition="right"
              className="w-full"
              onClick={() => handleSewa(selectedUserMobil)}
            >
              Proses Pesanan Sekarang
            </Button>
          )
        }
      >
        {selectedUserMobil && (
          <div className="space-y-6">
            {/* Kalender */}
            <div className="space-y-2">
              <label className="font-label-sm text-label-sm text-c57-primary font-bold uppercase tracking-widest flex items-center gap-2">
                <Icon name="calendar_month" size="sm" /> Kalender Ketersediaan Unit
              </label>
              <UnitCalendarPicker
                bookings={unitBookings[selectedUserMobil.id] || []}
                startDate={tanggalMulai[selectedUserMobil.id] || ""}
                endDate={tanggalSelesai[selectedUserMobil.id] || ""}
                onChange={({ start, end }) => {
                  handleTanggalChange(selectedUserMobil.id, "mulai", start ? `${start}T08:00` : "");
                  handleTanggalChange(selectedUserMobil.id, "selesai", end ? `${end}T08:00` : "");
                }}
              />
            </div>

            {/* Tanggal Sewa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Mulai Sewa</label>
                <Input
                  type="datetime-local"
                  value={tanggalMulai[selectedUserMobil.id] || ""}
                  onChange={(e) => handleTanggalChange(selectedUserMobil.id, "mulai", e.target.value)}
                  aria-label="Mulai sewa"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Selesai Sewa</label>
                <Input
                  type="datetime-local"
                  value={tanggalSelesai[selectedUserMobil.id] || ""}
                  onChange={(e) => handleTanggalChange(selectedUserMobil.id, "selesai", e.target.value)}
                  aria-label="Selesai sewa"
                />
              </div>
            </div>

            {/* Lokasi Penyerahan */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Lokasi Penyerahan</label>
              <Select
                value={lokasiPenyerahan[selectedUserMobil.id] || ""}
                onChange={(e) => handleTanggalChange(selectedUserMobil.id, "lokasi", e.target.value)}
                aria-label="Lokasi penyerahan"
              >
                <option value="">Pilih Lokasi...</option>
                <option value="Rumah">Diantar ke Rumah / Hotel</option>
                {serviceType !== "driver" && !(selectedUserMobil.withDriver === true || selectedUserMobil.layanan === "Dengan Driver") && (
                  <option value="Kantor">Ambil di Garasi</option>
                )}
                <option value="Titik Temu">Titik Temu Lain</option>
              </Select>
            </div>

            {/* Form Alamat untuk Diantar ke Rumah / Hotel */}
            {lokasiPenyerahan[selectedUserMobil.id] === "Rumah" && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-primary font-bold uppercase tracking-widest">Alamat Pengiriman</label>
                <p className="text-body-sm text-c57-on-surface-variant">Driver akan mengantarkan mobil ke alamat berikut</p>
                <Textarea
                  rows={3}
                  value={deliveryAddress[selectedUserMobil.id] || ""}
                  onChange={(e) => handleTanggalChange(selectedUserMobil.id, "deliveryAddress", e.target.value)}
                  placeholder="Contoh: Jl. Raya Darmo No. 21, Hotel Sheraton, Lt. 1 Lobby — Surabaya"
                  aria-label="Alamat pengiriman"
                />
              </div>
            )}

            {/* Form Alamat untuk Titik Temu */}
            {lokasiPenyerahan[selectedUserMobil.id] === "Titik Temu" && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-primary font-bold uppercase tracking-widest">Titik Temu</label>
                <p className="text-body-sm text-c57-on-surface-variant">Masukkan alamat atau nama tempat titik temu dengan driver</p>
                <Textarea
                  rows={3}
                  value={deliveryAddress[selectedUserMobil.id] || ""}
                  onChange={(e) => handleTanggalChange(selectedUserMobil.id, "deliveryAddress", e.target.value)}
                  placeholder="Contoh: Bandara Juanda Terminal 1, Area Kedatangan — Sidoarjo"
                  aria-label="Titik temu"
                />
              </div>
            )}

            {/* Estimasi Total */}
            {(() => {
              const estimate = getEstimate(
                selectedUserMobil,
                tanggalMulai[selectedUserMobil.id] || "",
                tanggalSelesai[selectedUserMobil.id] || ""
              );
              if (!estimate) return null;
              return (
                <Card variant="scrim" radius="2xl" className="p-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-label-sm text-label-sm text-c57-on-scrim/40 font-bold uppercase tracking-widest mb-1">Estimasi Total</p>
                      <p className="font-display text-headline-md text-c57-surface-bright tracking-tight">
                        Rp {estimate.perkiraanHarga.toLocaleString()}
                      </p>
                      <p className="text-body-sm text-c57-on-scrim/40 mt-1">
                        {estimate.rentalType === "Driver" ? "+ Biaya Layanan Driver" : "Harga Netto"}
                      </p>
                    </div>
                    <span className="w-12 h-12 bg-white/10 rounded-c57-lg flex items-center justify-center text-c57-on-scrim">
                      <Icon name="credit_card" size="2xl" />
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-body-sm">
                    <span className="text-c57-on-scrim/50">Durasi {estimate.durasiHari} hari</span>
                    <span className="text-c57-on-scrim/50">Rp {(estimate.perkiraanHarga / estimate.durasiHari).toLocaleString()}/hari</span>
                  </div>
                </Card>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* ===== Sewa Manual Modal (Cashier) ===== */}
      <Modal
        open={showManualModal}
        onClose={() => {
          setShowManualModal(false);
          setManualMobil(null);
        }}
        title={manualMobil ? `Sewa Manual — ${manualMobil.nama}` : undefined}
        subtitle="Input data penyewa secara langsung dan atur jadwal pemesanan unit."
        size="xl"
        footer={
          <Button
            size="lg"
            icon="check_circle"
            iconPosition="right"
            className="w-full"
            onClick={handleSubmitSewaManual}
          >
            Simpan &amp; Terbitkan Pesanan Kasir
          </Button>
        }
      >
        {manualMobil && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Customer Information */}
            <Card variant="inset" radius="lg" className="p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-c57-surface-variant">
                <Icon name="person" className="text-c57-primary" />
                <h4 className="font-label-md text-label-md text-c57-on-surface font-bold uppercase tracking-widest">
                  Informasi Pelanggan
                </h4>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Nama Lengkap Customer</label>
                <Input
                  value={manualClient.namaLengkap}
                  onChange={(e) => setManualClient({ ...manualClient, namaLengkap: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  aria-label="Nama lengkap customer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">NIK Penyewa (KTP)</label>
                <Input
                  value={manualClient.nik}
                  onChange={(e) => setManualClient({ ...manualClient, nik: e.target.value })}
                  placeholder="Masukkan 16 digit NIK KTP..."
                  aria-label="NIK penyewa"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Nomor Telepon / WhatsApp</label>
                <Input
                  value={manualClient.nomorTelepon}
                  onChange={(e) => setManualClient({ ...manualClient, nomorTelepon: e.target.value })}
                  placeholder="08123456789"
                  aria-label="Nomor telepon"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Alamat Lengkap Domisili</label>
                <Textarea
                  rows={3}
                  value={manualClient.alamat}
                  onChange={(e) => setManualClient({ ...manualClient, alamat: e.target.value })}
                  placeholder="Input alamat lengkap domisili penyewa..."
                  aria-label="Alamat lengkap domisili"
                />
              </div>
            </Card>

            {/* Right Column: Booking Configuration */}
            <Card variant="inset" radius="lg" className="p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-c57-surface-variant">
                <Icon name="calendar_month" className="text-c57-primary" />
                <h4 className="font-label-md text-label-md text-c57-on-surface font-bold uppercase tracking-widest">
                  Konfigurasi Sewa Unit
                </h4>
              </div>

              {/* Calendar */}
              <div className="bg-c57-surface-container-lowest p-3 rounded-c57-lg shadow-c57-card">
                <label className="font-label-sm text-label-sm text-c57-primary font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2 px-1">
                  <Icon name="calendar_month" size="sm" /> Kalender Ketersediaan Armada
                </label>
                <UnitCalendarPicker
                  bookings={unitBookings[manualMobil.id] || []}
                  startDate={tanggalMulai[manualMobil.id] || ""}
                  endDate={tanggalSelesai[manualMobil.id] || ""}
                  onChange={({ start, end }) => {
                    handleTanggalChange(manualMobil.id, "mulai", start ? `${start}T08:00` : "");
                    handleTanggalChange(manualMobil.id, "selesai", end ? `${end}T08:00` : "");
                  }}
                />
              </div>

              {/* Datetime Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Tgl Mulai</label>
                  <Input
                    type="datetime-local"
                    value={tanggalMulai[manualMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(manualMobil.id, "mulai", e.target.value)}
                    aria-label="Tanggal mulai sewa"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">Tgl Selesai</label>
                  <Input
                    type="datetime-local"
                    value={tanggalSelesai[manualMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(manualMobil.id, "selesai", e.target.value)}
                    aria-label="Tanggal selesai sewa"
                  />
                </div>
              </div>

              {/* DP Amount */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center gap-2">
                  <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">
                    Nominal DP (Min 50%)
                  </label>
                  {tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        const dur = Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)));
                        const minDp = Math.ceil(dur * manualMobil.harga * 0.5);
                        setManualClient({ ...manualClient, dpAmount: minDp });
                      }}
                      className="font-label-sm text-label-sm text-c57-primary font-bold uppercase tracking-tight hover:underline"
                    >
                      + Set DP Minimal 50%
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  value={manualClient.dpAmount}
                  onChange={(e) => setManualClient({ ...manualClient, dpAmount: e.target.value })}
                  placeholder="0"
                  aria-label="Nominal DP"
                />
              </div>

              {/* Metode Pembayaran */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-c57-on-surface-variant font-bold uppercase tracking-widest">
                  Metode Pembayaran
                </label>
                <Select
                  value={manualClient.paymentMethod}
                  onChange={(e) => setManualClient({ ...manualClient, paymentMethod: e.target.value })}
                  aria-label="Metode pembayaran"
                >
                  <option value="Cash">TUNAI / CASH</option>
                  <option value="Transfer Bank">TRANSFER BANK</option>
                </Select>
              </div>

              {/* Summary Card */}
              <Card variant="scrim" radius="2xl" className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-label-sm text-c57-on-scrim/50 font-bold uppercase tracking-widest">Estimasi Durasi</span>
                  <span className="font-label-md text-label-md text-c57-accent-line font-bold">
                    {tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id]
                      ? (
                          Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)))
                        ) + " Hari"
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="font-label-sm text-label-sm text-c57-on-scrim/50 font-bold uppercase tracking-widest">Grand Total</span>
                  <span className="font-display text-headline-sm text-c57-surface-bright font-semibold">
                    Rp {(() => {
                      const durasi = Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)));
                      let total = durasi * manualMobil.harga;
                      return (tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id]) ? total.toLocaleString() : "0";
                    })()}
                  </span>
                </div>
              </Card>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}