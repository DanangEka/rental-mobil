import { collection, doc, updateDoc, addDoc, query, where, onSnapshot, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Car, Users, Search, RefreshCw, Star, CheckCircle, Zap, Briefcase, CreditCard, ChevronRight, Key, UserCheck, User, Calendar as CalendarIcon } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";
import { createUnitBooking, subscribeUnitBookings, getNextAvailableDate } from "../services/bookingService";
import UnitCalendarPicker from "../components/UnitCalendarPicker";

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
  const [rentalType, setRentalType] = useState({});
  const [userOrders, setUserOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPaymentMethod] = useState("");

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
      console.log("Adding notification for user:", auth.currentUser.uid, "message:", message);
      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        message,
        timestamp: Timestamp.now(),
        read: false,
      });
      console.log("Notification added successfully");
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
      console.log("Admin notification added successfully");
    } catch (error) {
      console.error("Failed to add admin notification:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log("User data fetched:", data);
        setUserData(data);
      } else {
        console.log("User document does not exist");
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
          status: doc.data().status || "tersedia",
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
  const [unitBookings, setUnitBookings] = useState({});

  useEffect(() => {
    if (mobil.length === 0) return;
    const unsubs = mobil.map((m) =>
      subscribeUnitBookings(m.id, (bookings) => {
        setUnitBookings((prev) => ({ ...prev, [m.id]: bookings }));
      })
    );
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [mobil.map((m) => m.id).join(",")]);

  // Helper render price breakdown
  const getMobilPriceInfo = (m) => {
    const isDriver = m.withDriver === true || m.layanan === "Dengan Driver" || serviceType === "driver";
    const rentalFee = m.rental_fee_per_day || m.harga || 0;
    const driverFee = m.driver_fee_per_day || (isDriver ? 250000 : 0);
    const totalPerDay = isDriver ? rentalFee + driverFee : rentalFee;
    return { isDriver, rentalFee, driverFee, totalPerDay };
  };

  // Helper availability info matching Mockup 2
  const getAvailabilityInfo = (m) => {
    const statusLower = m.status?.toLowerCase();
    if (["servis", "service", "maintenance"].includes(statusLower)) {
      return {
        badgeText: "Maintenance",
        badgeStyle: "bg-amber-100 text-amber-700 border-amber-200/60",
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
        badgeStyle: "bg-blue-100 text-blue-600 border-blue-200/60",
        descText: untilStr
          ? `Terpakai sampai ${untilStr} · tersedia mulai ${formattedId}`
          : `Tersedia mulai ${formattedId}`,
      };
    }

    return {
      badgeText: "Available",
      badgeStyle: "bg-blue-100 text-blue-600 border-blue-200/60",
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

      const matchesStatus = filterStatus === "semua" ||
        m.status?.toLowerCase() === filterStatus.toLowerCase() ||
        (filterStatus === "tersedia" && m.tersedia === true);

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
    const selectedRentalType = serviceType === "driver" ? "Driver" : "Lepas Kunci";
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

    const start = new Date(mulai);
    const end = new Date(selesai);
    const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (durasiHari <= 0) {
      toast.error("Format Tanggal Salah", "Tanggal selesai harus setelah tanggal mulai.");
      return;
    }

    let perkiraanHarga = durasiHari * m.harga;
    if (selectedRentalType === "Driver") {
      perkiraanHarga += 250000;
    }

    try {
      // Validasi overlap & simpan ke subcollection units/{unitId}/bookings
      const bookingDocId = await createUnitBooking(m.id, start, end, "online");

      const orderRef = await addDoc(collection(db, "pemesanan"), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
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

  return (
    <div className="min-h-screen bg-[#FAFAF6] pt-0 pb-20 text-[#1B1717]">
      {/* Hero Header - Luxury Dark Style */}
      <div className="relative bg-[#1B1717] overflow-hidden min-h-[420px] md:min-h-[500px] flex items-center pt-28 md:pt-32">
        <img
          src="https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=1920&auto=format&fit=crop&q=80"
          alt="Luxury car fleet"
          className="absolute inset-0 w-full h-full object-cover opacity-25 scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1B1717]/98 via-[#1B1717]/80 to-[#1B1717]/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B1717] via-transparent to-[#1B1717]/20" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom, rgba(129,1,0,0.1) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative z-10 w-full">
          <div className="max-w-3xl animate-fadeInUp">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#810100]/20 border border-[#810100]/30 text-[#ff9999] text-[10px] font-black uppercase tracking-[0.25em] mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-breathe" />
              <span>{serviceType === "driver" ? "Premium Chauffeur Service" : serviceType === "lepas" ? "Self Drive Liberty" : "Armada Cakra Lima Tujuh"}</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
              {serviceType === "driver" ? "Sewa Dengan Driver" : serviceType === "lepas" ? "Sewa Lepas Kunci" : "Pilih Armada Terbaik"}
              <span className="text-transparent bg-clip-text ml-1" style={{ backgroundImage: "linear-gradient(135deg, #C9A84C, #E8D48B, #C9A84C)" }}>.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/45 leading-relaxed max-w-2xl font-medium">
              {serviceType === "driver"
                ? "Nikmati kenyamanan berkelas dengan driver profesional yang handal, memastikan setiap perjalanan Anda aman dan menyenangkan."
                : serviceType === "lepas"
                ? "Kendali penuh di tangan Anda. Nikmati kebebasan mengeksplorasi setiap sudut kota dengan unit pilihan terbaik kami."
                : "Solusi mobilitas modern dengan armada pilihan yang mumpuni untuk mendukung setiap langkah perjalanan berharga Anda."}
            </p>

            <div className="mt-12 flex flex-wrap gap-6 border-t border-white/10 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/[0.04] rounded-2xl flex items-center justify-center text-[#C9A84C]/70 border border-white/[0.06]">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Unit Prima</p>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em]">Standar QC Tinggi</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/[0.04] rounded-2xl flex items-center justify-center text-[#C9A84C]/70 border border-white/[0.06]">
                  <Star size={20} />
                </div>
                <div>
                  <p className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Layanan Bintang</p>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em]">Customer Priority</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, #FAFAF6, transparent)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        {/* Search & Layout Controls */}
        <div className="bg-white rounded-[2rem] p-8 border border-[#EDEBDD]/30 shadow-[0_12px_48px_rgba(0,0,0,0.06)] mb-12 animate-fadeInUp delay-100">
          <div className="flex flex-col lg:flex-row gap-8 items-end">

            {/* Search Input */}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.2em] mb-3">Pencarian Armada</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Ketik nama mobil, merek, atau tahun..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#FAFAF6] border border-[#EDEBDD]/40 focus:border-[#810100]/30 focus:ring-4 focus:ring-[#810100]/[0.06] transition-all text-[#1B1717] rounded-2xl outline-none font-medium placeholder:text-[#3D3636]/25"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3636]/25 group-focus-within:text-[#810100] transition-colors">
                  <Search size={18} />
                </div>
              </div>
            </div>

            {/* Service Toggle */}
            <div className="w-full lg:w-auto">
              <label className="block text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.2em] mb-3">Tipe Layanan</label>
              <div className="flex bg-[#FAFAF6] p-1.5 rounded-2xl border border-[#EDEBDD]/30">
                {[
                  { label: "Semua", val: null },
                  { label: "Lepas Kunci", val: "lepas" },
                  { label: "Dengan Driver", val: "driver" }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => navigate(opt.val ? `/home?type=${opt.val}` : '/home')}
                    className={`flex-1 px-2 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 ${
                      serviceType === opt.val
                        ? 'bg-[#1B1717] text-[#C9A84C] shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                        : 'text-[#3D3636]/35 hover:text-[#1B1717]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Filter */}
            <div className="flex gap-4 w-full lg:w-auto">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.2em] mb-3">Urutkan</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-5 py-4 bg-[#FAFAF6] border border-[#EDEBDD]/40 text-sm font-bold text-[#3D3636] rounded-2xl outline-none cursor-pointer hover:border-[#810100]/20 transition-colors appearance-none"
                >
                  <option value="name">Abjad (A-Z)</option>
                  <option value="price-low">Termurah</option>
                  <option value="price-high">Tertinggi</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.2em] mb-3">Ketersediaan</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-5 py-4 bg-[#FAFAF6] border border-[#EDEBDD]/40 text-sm font-bold text-[#3D3636] rounded-2xl outline-none cursor-pointer hover:border-[#810100]/20 transition-colors appearance-none"
                >
                  <option value="semua">Semua</option>
                  <option value="tersedia">Tersedia</option>
                  <option value="disewa">Disewa</option>
                </select>
              </div>
              <div className="flex flex-col">
                <div className="h-[28px] lg:h-[30px]" />
                <button
                  onClick={handleRefresh}
                  className="p-4 bg-[#FAFAF6] hover:bg-white hover:border-[#C9A84C]/30 border border-[#EDEBDD]/40 text-[#3D3636]/25 hover:text-[#C9A84C] rounded-2xl transition-all duration-300 h-[54px] md:h-[58px] flex items-center justify-center"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-10 border-t border-[#EDEBDD]/30">
             {[
               { label: "Tersedia", count: filteredMobil.filter(m => m.tersedia === true || m.status === "tersedia").length, color: "bg-[#FAFAF6] text-emerald-600 border border-emerald-200/40", icon: <CheckCircle size={14} /> },
               { label: "Disewa", count: filteredMobil.filter(m => m.status === "disewa" || m.tersedia === false).length, color: "bg-[#FAFAF6] text-[#810100] border border-[#810100]/10", icon: <Users size={14} /> },
               { label: "Total Armada", count: filteredMobil.length, color: "bg-[#FAFAF6] text-[#1B1717]/60 border border-[#EDEBDD]/40", icon: <Car size={14} /> },
               { label: "Rating Tinggi", count: "4.9/5", color: "bg-[#FAFAF6] text-[#C9A84C] border border-[#C9A84C]/15", icon: <Star size={14} /> },
             ].map((stat, i) => (
               <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#3D3636]/30 uppercase tracking-[0.2em] leading-tight">{stat.label}</p>
                    <p className="text-xl font-black text-[#1B1717]">{stat.count}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Verification Alert */}
        {userData && userData.verificationStatus !== "verified" && (
          <div className={`mt-8 p-6 rounded-[1.5rem] border animate-fadeIn flex items-center gap-4 ${
            userData.verificationStatus === "unverified"
              ? "bg-[#810100]/[0.03] border-[#810100]/15 text-[#810100]"
              : "bg-amber-50/50 border-amber-100/60 text-amber-700"
          }`}>
             <div className="w-11 h-11 rounded-2xl bg-white border border-[#EDEBDD]/40 flex items-center justify-center shrink-0">
                <CheckCircle size={20} />
             </div>
             <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.15em] mb-1">Status Verifikasi Account</p>
                <p className="text-xs font-medium opacity-70">
                  {userData.verificationStatus === "unverified"
                    ? "Akun Anda belum diverifikasi. Silakan upload KTP di halaman profil untuk dapat melakukan penyewaan."
                    : "Dokumen verifikasi Anda sedang dalam peninjauan oleh admin. Mohon tunggu sejenak."}
                </p>
             </div>
             <button onClick={() => navigate('/company-profile')} className="px-5 py-2.5 bg-white border border-[#EDEBDD]/40 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:shadow-md transition-all duration-300">
               Update Profil
             </button>
          </div>
        )}

        {filteredMobil.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2rem] border border-[#EDEBDD]/30 border-dashed animate-fadeInUp">
            <Car size={56} className="mx-auto text-[#3D3636]/10 mb-6" />
            <h3 className="text-2xl font-black text-[#1B1717] mb-2">Armada Tidak Ditemukan</h3>
            <p className="text-[#3D3636]/35 max-w-sm mx-auto text-sm">Coba gunakan kata kunci pencarian lain atau ubah filter layanan Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mt-8 md:mt-12">
            {filteredMobil.map((m, i) => {
              const statusLower = m.status?.toLowerCase();
              const order = getUserOrderForCar(m.id);
              const orderStatus = order?.status?.toLowerCase();
              const info = getAvailabilityInfo(m);
              const isDriverLayanan = m.withDriver === true || m.layanan === "Dengan Driver" || serviceType === "driver";
              const startPicked = tanggalMulai[m.id];

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-[1.5rem] p-6 border border-[#EDEBDD]/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-[600ms] group flex flex-col h-full"
                  style={{ animation: `spotReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 80}ms both`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold text-[#3D3636]/35 uppercase tracking-[0.15em]">
                      {isDriverLayanan ? "Sewa mobil dengan driver" : "Sewa mobil lepas kunci"}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border flex items-center gap-1.5 shrink-0 ${info.badgeStyle}`}>
                      <CalendarIcon size={10} />
                      {info.badgeText}
                    </span>
                  </div>

                  {/* Image Box */}
                  <div className="relative aspect-[16/10] bg-[#FAFAF6] border border-[#EDEBDD]/20 rounded-[1.25rem] overflow-hidden mb-4 p-4 flex items-center justify-center">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-[800ms]"
                      style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 rounded-[1.25rem] border border-transparent group-hover:border-[#C9A84C]/10 transition-all duration-500 pointer-events-none" />
                  </div>

                  {/* Car Title & Availability */}
                  <div className="mb-3">
                    <h3 className="text-lg font-black text-[#1B1717] leading-snug tracking-tight group-hover:text-[#810100] transition-colors duration-300 mb-1">
                      {m.nama}
                    </h3>
                    <p className="text-[10px] text-[#3D3636]/40 font-medium leading-relaxed">
                      {info.descText}
                    </p>
                  </div>

                  {/* Amenities Row */}
                  <div className="flex items-center gap-4 text-[10px] font-bold text-[#3D3636]/40 mb-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Users size={11} className="text-[#C9A84C]/50" />
                      <span>{m.seats || 4} passengers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap size={11} className="text-[#C9A84C]/50" />
                      <span>{m.chargingPort !== false ? "USB charging" : "No charging"}</span>
                    </div>
                  </div>

                  {/* Divider & Calendar */}
                  <div className="border-t border-[#EDEBDD]/30 pt-4 mt-auto">
                    <p className="text-[10px] font-black text-[#3D3636]/35 uppercase tracking-[0.15em] mb-2">Pilih tanggal sewa</p>
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
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping mb-2" />
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Processing... Please Wait</p>
                              </div>
                            );
                          } else if (["disetujui", "menunggu pembayaran", "approved"].includes(orderStatus?.trim())) {
                            return (
                              <button
                                onClick={() => navigate('/history-pesanan')}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-md"
                              >
                                Upload Payment Proof
                              </button>
                            );
                          } else if (orderStatus === "pembayaran berhasil") {
                            return (
                              <div className="flex items-center justify-center gap-2 py-3 bg-blue-50/50 text-blue-600 rounded-2xl">
                                <CheckCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Order Confirmed</span>
                              </div>
                            );
                          }
                        }

                        if (["servis", "service", "maintenance"].includes(statusLower)) {
                          return (
                            <div className="text-center py-3 bg-amber-50/50 text-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em]">
                              Under Maintenance
                            </div>
                          );
                        }

                        const defaultText = isDriverLayanan ? "Rent With Driver →" : "Rent This Unit →";
                        const buttonText = startPicked
                          ? `Book for ${new Date(startPicked).toLocaleDateString("en-US", { month: "short", day: "numeric" })} →`
                          : defaultText;

                        return (
                          <div className="flex flex-col gap-2">
                            {!isAdmin && (
                              <button
                                onClick={() => openUserSewaModal(m)}
                                className="w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(129,1,0,0.2)] flex items-center justify-center gap-1.5"
                                style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", color: "#fff" }}
                              >
                                {buttonText}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => openSewaManualModal(m)}
                                className="w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-md flex items-center justify-center gap-1.5"
                                style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", color: "#fff" }}
                              >
                                Manual Order (Cashier)
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Payment Method Popups */}
      {showPaymentPopup && (
        <div className="fixed inset-0 bg-[#1B1717]/70 backdrop-blur-md flex items-center justify-center z-[100] px-4 animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm relative animate-popIn shadow-[0_24px_64px_rgba(0,0,0,0.15)] border border-[#EDEBDD]/30">
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#FAFAF6] text-[#3D3636]/30 hover:text-white hover:bg-[#810100] transition-all duration-300 font-bold"
            >
              ×
            </button>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#810100]/10 border border-[#810100]/20 text-[#810100] text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                Instruksi Pembayaran
              </div>
              <h3 className="text-xl font-black text-[#1B1717] mb-6">
                {selectedPaymentMethod}
              </h3>

              <div className="bg-[#FAFAF6] p-6 rounded-[1.25rem] border border-[#EDEBDD]/30 mb-8">
                 <img
                   src={selectedPaymentMethod === "Transfer Bank" ? "/src/assets/tfbank.png" : "/src/assets/qris.png"}
                   alt="Payment Method"
                   className="w-full max-w-[180px] h-auto object-contain mx-auto rounded-2xl"
                   onError={(e) => {
                     e.target.onerror = null;
                     e.target.src = "https://via.placeholder.com/200?text=Scan+QRIS+Di+Sini"
                   }}
                 />
              </div>

              <p className="text-sm text-[#3D3636]/40 font-medium leading-relaxed mb-8">
                {selectedPaymentMethod === "Transfer Bank"
                  ? "Silakan transfer tepat sesuai nominal ke rekening yang tertera untuk konfirmasi otomatis."
                  : "Silakan pindai kode QRIS di atas menggunakan aplikasi mobile banking atau e-wallet Anda."
                }
              </p>

              <button
                onClick={() => setShowPaymentPopup(false)}
                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)" }}
              >
                Saya Sudah Membayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Sewa Modal */}
      {showUserModal && selectedUserMobil && (
        <div className="fixed inset-0 bg-[#1B1717]/75 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-xl max-h-[90vh] flex flex-col relative animate-popIn shadow-[0_24px_64px_rgba(0,0,0,0.2)] border border-[#EDEBDD]/30 overflow-hidden">

            {/* Fixed Header */}
            <div className="p-6 sm:px-8 sm:pt-8 sm:pb-5 border-b border-[#EDEBDD]/30 flex-shrink-0 relative bg-white z-10">
              <button
                onClick={() => setShowUserModal(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 w-10 h-10 flex items-center justify-center rounded-full bg-[#FAFAF6] text-[#3D3636]/30 hover:text-white hover:bg-[#810100] transition-all duration-300 font-bold text-lg"
                title="Tutup Modal"
              >
                ✕
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#810100]/10 border border-[#810100]/20 text-[#810100] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                Pemesanan Armada
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#1B1717] tracking-tight pr-10">
                Konfirmasi Sewa
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-[#3D3636]/40 mt-1">
                Lengkapi detail perjalanan Anda untuk unit <span className="text-[#810100] font-black">{selectedUserMobil.nama}</span>.
              </p>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {/* Kalender */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#C9A84C] font-black uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <CalendarIcon size={14} /> Kalender Ketersediaan Unit
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
                <div>
                  <label className="text-[10px] text-[#3D3636]/35 font-black block mb-2 uppercase tracking-[0.2em] ml-1">Mulai Sewa</label>
                  <input
                    type="datetime-local"
                    value={tanggalMulai[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "mulai", e.target.value)}
                    className="w-full bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#1B1717] text-sm rounded-2xl p-4 focus:border-[#810100]/30 focus:ring-4 focus:ring-[#810100]/[0.06] transition-all outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-[#3D3636]/35 font-black uppercase tracking-[0.2em] ml-1">Selesai Sewa</label>
                  <input
                    type="datetime-local"
                    value={tanggalSelesai[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "selesai", e.target.value)}
                    className="w-full bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#1B1717] text-sm rounded-2xl p-4 focus:border-[#810100]/30 focus:ring-4 focus:ring-[#810100]/[0.06] transition-all outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-[#3D3636]/35 font-black uppercase tracking-[0.2em] ml-1">Lokasi Penyerahan</label>
                <div className="relative">
                  <select
                    value={lokasiPenyerahan[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "lokasi", e.target.value)}
                    className="w-full bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#1B1717] text-sm rounded-2xl p-4 focus:border-[#810100]/30 transition-all outline-none cursor-pointer appearance-none font-bold"
                  >
                    <option value="">Pilih Lokasi...</option>
                    <option value="Rumah">Diantar ke Rumah / Hotel</option>
                    {serviceType !== "driver" && !((selectedUserMobil.withDriver === true || selectedUserMobil.layanan === "Dengan Driver")) && (
                      <option value="Kantor">Ambil di Garasi</option>
                    )}
                    <option value="Titik Temu">Titik Temu Lain</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#3D3636]/30">
                    <ChevronRight size={18} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Form Alamat untuk Diantar ke Rumah / Hotel */}
              {lokasiPenyerahan[selectedUserMobil.id] === "Rumah" && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] text-[#810100] font-black uppercase tracking-[0.2em] ml-1">📍 Alamat Pengiriman</label>
                  <p className="text-[10px] text-[#3D3636]/30 ml-1">Driver akan mengantarkan mobil ke alamat berikut</p>
                  <textarea
                    rows={3}
                    value={deliveryAddress[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "deliveryAddress", e.target.value)}
                    placeholder="Contoh: Jl. Raya Darmo No. 21, Hotel Sheraton, Lt. 1 Lobby — Surabaya"
                    className="w-full bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#1B1717] text-sm rounded-2xl p-4 focus:border-[#810100]/30 outline-none font-bold resize-none"
                  />
                </div>
              )}

              {/* Form Alamat untuk Titik Temu */}
              {lokasiPenyerahan[selectedUserMobil.id] === "Titik Temu" && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] text-[#810100] font-black uppercase tracking-[0.2em] ml-1">📍 Titik Temu</label>
                  <p className="text-[10px] text-[#3D3636]/30 ml-1">Masukkan alamat atau nama tempat titik temu dengan driver</p>
                  <textarea
                    rows={3}
                    value={deliveryAddress[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "deliveryAddress", e.target.value)}
                    placeholder="Contoh: Bandara Juanda Terminal 1, Area Kedatangan — Sidoarjo"
                    className="w-full bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#1B1717] text-sm rounded-2xl p-4 focus:border-[#810100]/30 outline-none font-bold resize-none"
                  />
                </div>
              )}



              {tanggalMulai[selectedUserMobil.id] && tanggalSelesai[selectedUserMobil.id] && (
                <div className="rounded-[1.5rem] p-8 text-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] relative overflow-hidden group" style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)" }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative z-10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Estimasi Total</p>
                      <p className="text-3xl font-black tracking-tighter">
                        Rp {(() => {
                          const durasi = Math.ceil((new Date(tanggalSelesai[selectedUserMobil.id]) - new Date(tanggalMulai[selectedUserMobil.id])) / (1000 * 60 * 60 * 24));
                          if (durasi <= 0) return "0";
                          let total = durasi * selectedUserMobil.harga;
                          if ((rentalType[selectedUserMobil.id] || "Lepas Kunci") === "Driver") total += 250000;
                          return total.toLocaleString();
                        })()}
                      </p>
                      <p className="text-[10px] font-bold text-white/35 mt-1">
                        {(rentalType[selectedUserMobil.id] || "Lepas Kunci") === "Driver" ? "+ Biaya Layanan Driver" : "Harga Netto"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="w-12 h-12 bg-white/[0.06] rounded-2xl flex items-center justify-center text-[#C9A84C]/70">
                        <CreditCard size={22} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleSewa(selectedUserMobil)}
              className="w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] text-white transition-all duration-300 flex items-center justify-center gap-3 group"
              style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
            >
              <Car size={20} className="group-hover:-translate-x-1 transition-transform" />
              Proses Pesanan Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Sewa Manual Modal (Cashier) */}
      {showManualModal && manualMobil && (
        <div className="fixed inset-0 bg-[#1B1717]/75 backdrop-blur-md flex items-center justify-center z-[110] p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-popIn shadow-[0_24px_64px_rgba(0,0,0,0.2)] border border-[#EDEBDD]/30 overflow-hidden">

            {/* Fixed Modal Header */}
            <div className="px-6 pt-6 pb-5 sm:px-10 sm:pt-8 sm:pb-6 border-b border-[#EDEBDD]/30 flex-shrink-0 relative bg-white z-10">
              <button
                onClick={() => setShowManualModal(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 w-10 h-10 flex items-center justify-center rounded-full bg-[#FAFAF6] text-[#3D3636]/30 hover:text-white hover:bg-[#810100] transition-all duration-300 font-bold text-lg"
                title="Tutup Modal"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#810100]/10 text-[#810100] text-[10px] font-black uppercase tracking-[0.2em] border border-[#810100]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#810100] animate-breathe" />
                  Kasir Admin Panel
                </span>
                <span className="text-[10px] font-bold text-[#3D3636]/25 uppercase tracking-[0.15em]">
                  Mode Transaksi Offline
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#1B1717] tracking-tight flex items-center gap-3 pr-12">
                <Car size={22} className="text-[#810100] flex-shrink-0" />
                Sewa Manual — {manualMobil.nama}
              </h3>
              <p className="text-xs font-semibold text-[#3D3636]/35 mt-0.5">
                Input data penyewa secara langsung dan atur jadwal pemesanan unit.
              </p>
            </div>

            {/* Scrollable Form Body */}
            <div className="px-6 py-6 sm:px-10 sm:py-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

                {/* Left Column: Customer Information Card */}
                <div className="bg-[#FAFAF6] border border-[#EDEBDD]/30 rounded-[1.5rem] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#EDEBDD]/30">
                    <User size={16} className="text-[#C9A84C]" />
                    <h4 className="text-xs font-black text-[#1B1717] uppercase tracking-[0.2em]">
                      Informasi Pelanggan
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {/* Nama Lengkap */}
                    <div>
                      <label className="text-[10px] text-[#3D3636]/35 font-bold block mb-1.5 uppercase tracking-[0.15em]">
                        Nama Lengkap Customer
                      </label>
                      <input
                        type="text"
                        value={manualClient.namaLengkap}
                        onChange={(e) => setManualClient({ ...manualClient, namaLengkap: e.target.value })}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#810100]/30 focus:ring-2 focus:ring-[#810100]/[0.06] outline-none font-bold transition-all shadow-sm"
                        placeholder="Contoh: Budi Santoso"
                      />
                    </div>

                    {/* NIK */}
                    <div>
                      <label className="text-[10px] text-[#3D3636]/35 font-bold block mb-1.5 uppercase tracking-[0.15em]">
                        NIK Penyewa (KTP)
                      </label>
                      <input
                        type="text"
                        value={manualClient.nik}
                        onChange={(e) => setManualClient({ ...manualClient, nik: e.target.value })}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#810100]/30 focus:ring-2 focus:ring-[#810100]/[0.06] outline-none font-bold transition-all shadow-sm"
                        placeholder="Masukkan 16 digit NIK KTP..."
                      />
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="text-[10px] text-[#3D3636]/35 font-bold block mb-1.5 uppercase tracking-[0.15em]">
                        Nomor Telepon / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={manualClient.nomorTelepon}
                        onChange={(e) => setManualClient({ ...manualClient, nomorTelepon: e.target.value })}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#810100]/30 focus:ring-2 focus:ring-[#810100]/[0.06] outline-none font-bold transition-all shadow-sm"
                        placeholder="08123456789"
                      />
                    </div>

                    {/* Alamat */}
                    <div>
                      <label className="text-[10px] text-[#3D3636]/35 font-bold block mb-1.5 uppercase tracking-[0.15em]">
                        Alamat Lengkap Domisili
                      </label>
                      <textarea
                        value={manualClient.alamat}
                        onChange={(e) => setManualClient({ ...manualClient, alamat: e.target.value })}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#810100]/30 focus:ring-2 focus:ring-[#810100]/[0.06] outline-none h-24 resize-none font-bold transition-all shadow-sm"
                        placeholder="Input alamat lengkap domisili penyewa..."
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Booking Configuration Card */}
                <div className="bg-[#FAFAF6] border border-[#EDEBDD]/30 rounded-[1.5rem] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#EDEBDD]/30">
                    <CalendarIcon size={16} className="text-[#C9A84C]" />
                    <h4 className="text-xs font-black text-[#1B1717] uppercase tracking-[0.2em]">
                      Konfigurasi Sewa Unit
                    </h4>
                  </div>

                  {/* Calendar */}
                  <div className="bg-white p-3 rounded-2xl border border-[#EDEBDD]/30 shadow-sm">
                    <label className="text-[10px] text-[#C9A84C] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 mb-2 px-1">
                      <CalendarIcon size={12} /> Kalender Ketersediaan Armada
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
                    <div>
                      <label className="text-[10px] text-[#3D3636]/35 font-bold block mb-1 uppercase tracking-[0.15em]">Tgl Mulai</label>
                      <input
                        type="datetime-local"
                        value={tanggalMulai[manualMobil.id] || ""}
                        onChange={(e) => handleTanggalChange(manualMobil.id, "mulai", e.target.value)}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs rounded-xl p-3 focus:border-[#810100]/30 outline-none font-bold shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#3D3636]/35 font-bold block mb-1 uppercase tracking-[0.15em]">Tgl Selesai</label>
                      <input
                        type="datetime-local"
                        value={tanggalSelesai[manualMobil.id] || ""}
                        onChange={(e) => handleTanggalChange(manualMobil.id, "selesai", e.target.value)}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs rounded-xl p-3 focus:border-[#810100]/30 outline-none font-bold shadow-sm"
                      />
                    </div>
                  </div>

                  {/* DP Amount */}
                  <div>
                    <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                      <label className="text-[10px] text-[#3D3636]/35 font-bold uppercase tracking-[0.15em]">
                        Nominal DP (Min 50%)
                      </label>
                      {manualMobil && tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id] && (
                        <button
                          type="button"
                          onClick={() => {
                            const dur = Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)));
                            const minDp = Math.ceil(dur * manualMobil.harga * 0.5);
                            setManualClient({ ...manualClient, dpAmount: minDp });
                          }}
                          className="text-[9px] font-black text-[#C9A84C] hover:underline uppercase tracking-tight"
                        >
                          + Set DP Minimal 50%
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#3D3636]/30 font-black text-xs">Rp</div>
                      <input
                        type="number"
                        value={manualClient.dpAmount}
                        onChange={(e) => setManualClient({ ...manualClient, dpAmount: e.target.value })}
                        className="w-full bg-white border border-[#EDEBDD]/40 text-[#1B1717] text-xs sm:text-sm rounded-xl py-3 pl-10 pr-3 focus:border-[#810100]/30 outline-none font-black shadow-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3" style={{ background: "linear-gradient(135deg, #1B1717, #2A2525)" }}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Estimasi Durasi</span>
                      <span className="font-black text-[#C9A84C]">
                        {tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id] ?
                          Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24))) + " Hari"
                          : "-"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Grand Total</span>
                      <span className="text-base sm:text-lg font-black text-[#EDEBDD]">
                        Rp {(() => {
                          const durasi = Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)));
                          let total = durasi * manualMobil.harga;
                          if ((rentalType[manualMobil.id] || "Lepas Kunci") === "Driver") total += 250000;
                          return (tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id]) ? total.toLocaleString() : "0";
                        })()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-white/10 text-xs gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Metode Pembayaran</span>
                      <select
                        value={manualClient.paymentMethod}
                        onChange={(e) => setManualClient({ ...manualClient, paymentMethod: e.target.value })}
                        className="w-full sm:w-auto bg-white/[0.06] text-white text-xs font-bold rounded-lg px-2.5 py-1.5 border border-white/10 outline-none cursor-pointer"
                      >
                        <option value="Cash" className="bg-[#1B1717]">TUNAI / CASH</option>
                        <option value="Transfer Bank" className="bg-[#1B1717]">TRANSFER BANK</option>
                      </select>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Fixed Bottom Submit Footer */}
            <div className="p-4 sm:px-10 sm:py-5 border-t border-[#EDEBDD]/30 bg-[#FAFAF6]/60 flex-shrink-0">
              <button
                onClick={handleSubmitSewaManual}
                className="w-full py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-white transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
              >
                <CheckCircle size={18} />
                Simpan &amp; Terbitkan Pesanan Kasir
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
