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

  // Ambil data mobil
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    // Realtime listener mobil
    const unsubscribeMobil = onSnapshot(collection(db, "mobil"), (snapshot) => {
      const mobilData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || "tersedia",
      }));
      setMobil(mobilData);
    });

    // Cek admin role
    auth.currentUser.getIdTokenResult().then((idTokenResult) => {
      setIsAdmin(idTokenResult.claims.admin === true);
    });

    // Fetch user data
    fetchUserData();

    return () => {
      unsubscribeMobil();
    };
  }, [navigate]);

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
  }, [mobil]);

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
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800">
      {/* Hero Header - Red Dynamic Style */}
      <div className="relative bg-[#990000] overflow-hidden min-h-[400px] flex items-center">
        {/* Decorative elements similar to Landing Page */}
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-white/5 rounded-full blur-[100px] -mr-20 -mt-20 z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-black/10 rounded-full blur-[80px] -ml-10 -mb-10 z-0 pointer-events-none"></div>
        
        {/* Car silhouette decoration */}
        <div className="absolute right-[-5%] bottom-[-10%] z-0 opacity-10 pointer-events-none transform -rotate-12">
          <Car size={600} strokeWidth={0.5} className="text-white" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10 w-full">
          <div className="max-w-3xl animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-[10px] font-black uppercase tracking-widest mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
              <span>{serviceType === "driver" ? "Premium Chauffeur Service" : serviceType === "lepas" ? "Self Drive Liberty" : "Armada Cakra Lima Tujuh"}</span>
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[0.85]">
              {serviceType === "driver" ? "Sewa Dengan Driver" : serviceType === "lepas" ? "Sewa Lepas Kunci" : "Pilih Armada Terbaik"}
              <span className="text-red-300">.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl font-medium">
              {serviceType === "driver" 
                ? "Nikmati kenyamanan berkelas dengan driver profesional yang handal, memastikan setiap perjalanan Anda aman dan menyenangkan." 
                : serviceType === "lepas" 
                ? "Kendali penuh di tangan Anda. Nikmati kebebasan mengeksplorasi setiap sudut kota dengan unit pilihan terbaik kami."
                : "Solusi mobilitas modern dengan armada pilihan yang mumpuni untuk mendukung setiap langkah perjalanan berharga Anda."}
            </p>

            <div className="mt-12 flex flex-wrap gap-6 border-t border-white/10 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/10">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-white font-black text-xs uppercase tracking-widest">Unit Prima</p>
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">Standar QC Tinggi</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/10">
                  <Star size={24} />
                </div>
                <div>
                  <p className="text-white font-black text-xs uppercase tracking-widest">Layanan Bintang</p>
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">Customer Priority</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        {/* Search & Layout Controls - White Card Style */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-12 animate-fadeInUp delay-100">
          <div className="flex flex-col lg:flex-row gap-8 items-end">
            
            {/* Search Input */}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pencarian Armada</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Ketik nama mobil, merek, atau tahun..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 focus:border-[#990000] focus:ring-4 focus:ring-red-100 transition-all text-slate-900 rounded-2xl outline-none font-medium"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#990000] transition-colors">
                  <Search size={20} />
                </div>
              </div>
            </div>

            {/* Service Toggle Switch (OPTIMIZED) */}
            <div className="w-full lg:w-auto">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tipe Layanan</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                {[
                  { label: "Semua", val: null },
                  { label: "Lepas Kunci", val: "lepas" },
                  { label: "Dengan Driver", val: "driver" }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => navigate(opt.val ? `/home?type=${opt.val}` : '/home')}
                    className={`flex-1 px-2 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all ${
                      serviceType === opt.val 
                        ? 'bg-[#990000] text-white shadow-lg shadow-red-900/20' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Filter Options */}
            <div className="flex gap-4 w-full lg:w-auto">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Urutkan</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-2xl outline-none cursor-pointer hover:border-[#990000] transition-colors appearance-none"
                >
                  <option value="name">Abjad (A-Z)</option>
                  <option value="price-low">Termurah</option>
                  <option value="price-high">Tertinggi</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ketersediaan</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-2xl outline-none cursor-pointer hover:border-[#990000] transition-colors appearance-none"
                >
                  <option value="semua">Semua</option>
                  <option value="tersedia">Tersedia</option>
                  <option value="disewa">Disewa</option>
                </select>
              </div>
              <div className="flex flex-col">
                <div className="h-[28px] lg:h-[30px]" /> {/* Spacer to align with labels */}
                <button
                  onClick={handleRefresh}
                  className="p-4 bg-slate-50 hover:bg-white hover:border-[#990000] border border-slate-200 text-slate-400 hover:text-[#990000] rounded-2xl transition-all h-[54px] md:h-[58px] flex items-center justify-center"
                >
                  <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-10 border-t border-slate-100">
             {[
               { label: "Tersedia", count: filteredMobil.filter(m => m.tersedia === true || m.status === "tersedia").length, color: "bg-emerald-50 text-emerald-600", icon: <CheckCircle size={14} /> },
               { label: "Disewa", count: filteredMobil.filter(m => m.status === "disewa" || m.tersedia === false).length, color: "bg-red-50 text-red-600", icon: <Users size={14} /> },
               { label: "Total Armada", count: filteredMobil.length, color: "bg-blue-50 text-blue-600", icon: <Car size={14} /> },
               { label: "Rating Tinggi", count: "4.9/5", color: "bg-amber-50 text-amber-600", icon: <Star size={14} /> },
             ].map((stat, i) => (
               <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{stat.label}</p>
                    <p className="text-xl font-black text-slate-900">{stat.count}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Verification Alert */}
        {userData && userData.verificationStatus !== "verified" && (
          <div className={`mt-8 p-6 rounded-[2rem] border animate-fadeIn flex items-center gap-4 ${
            userData.verificationStatus === "unverified"
              ? "bg-red-50 border-red-100 text-[#990000]"
              : "bg-amber-50 border-amber-100 text-amber-700"
          }`}>
             <div className="w-12 h-12 rounded-2xl bg-white/50 flex items-center justify-center shrink-0">
                <CheckCircle size={24} />
             </div>
             <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-widest mb-1">Status Verifikasi Account</p>
                <p className="text-xs font-medium opacity-80">
                  {userData.verificationStatus === "unverified" 
                    ? "Akun Anda belum diverifikasi. Silakan upload KTP di halaman profil untuk dapat melakukan penyewaan."
                    : "Dokumen verifikasi Anda sedang dalam peninjauan oleh admin. Mohon tunggu sejenak."}
                </p>
             </div>
             <button onClick={() => navigate('/company-profile')} className="px-6 py-2.5 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
               Update Profil
             </button>
          </div>
        )}

        {filteredMobil.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-fadeInUp">
            <Car size={64} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">Armada Tidak Ditemukan</h3>
            <p className="text-slate-400 max-w-sm mx-auto">Coba gunakan kata kunci pencarian lain atau ubah filter layanan Anda.</p>
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
                  className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col h-full animate-fadeInUp"
                  style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                >
                  {/* Top Bar matching Mockup 2 */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-500">
                      {isDriverLayanan ? "Sewa mobil dengan driver" : "Sewa mobil lepas kunci"}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shrink-0 ${info.badgeStyle}`}>
                      <CalendarIcon size={13} />
                      {info.badgeText}
                    </span>
                  </div>

                  {/* Image Box */}
                  <div className="relative aspect-[16/10] bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden mb-4 p-4 flex items-center justify-center">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Car Title (NO PRICE DISPLAY) & Availability Subtext */}
                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug tracking-tight group-hover:text-[#990000] transition-colors mb-1">
                      {m.nama}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {info.descText}
                    </p>
                  </div>

                  {/* Amenities Row matching Mockup 2 */}
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 mb-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span>{m.seats || 4} passengers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-slate-400" />
                      <span>{m.chargingPort !== false ? "USB charging" : "No charging"}</span>
                    </div>
                  </div>

                  {/* Divider & Inline Mini Calendar */}
                  <div className="border-t border-slate-100 pt-4 mt-auto">
                    <p className="text-xs font-bold text-slate-800 mb-2">Pilih tanggal sewa</p>
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
                                <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Processing... Please Wait</p>
                              </div>
                            );
                          } else if (["disetujui", "menunggu pembayaran", "approved"].includes(orderStatus?.trim())) {
                            return (
                              <button 
                                onClick={() => navigate('/history-pesanan')}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md"
                              >
                                Upload Payment Proof
                              </button>
                            );
                          } else if (orderStatus === "pembayaran berhasil") {
                            return (
                              <div className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl">
                                <CheckCircle size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Order Confirmed</span>
                              </div>
                            );
                          }
                        }

                        if (["servis", "service", "maintenance"].includes(statusLower)) {
                          return (
                            <div className="text-center py-3 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold">
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
                                className="w-full py-3.5 bg-slate-900 hover:bg-[#990000] text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                              >
                                {buttonText}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => openSewaManualModal(m)}
                                className="w-full py-3.5 bg-slate-900 hover:bg-[#990000] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative animate-popIn shadow-2xl border border-slate-200">
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-[#990000] hover:bg-red-50 transition-all font-bold"
            >
              ×
            </button>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#990000] text-[10px] font-black uppercase tracking-widest mb-6">
                Instruksi Pembayaran
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-6">
                {selectedPaymentMethod}
              </h3>
              
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                 <img
                   src={selectedPaymentMethod === "Transfer Bank" ? "/src/assets/tfbank.png" : "/src/assets/qris.png"}
                   alt="Payment Method"
                   className="w-full max-w-[180px] h-auto object-contain mx-auto rounded-2xl shadow-sm"
                   onError={(e) => {
                     e.target.onerror = null; 
                     e.target.src = "https://via.placeholder.com/200?text=Scan+QRIS+Di+Sini"
                   }}
                 />
              </div>
              
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                {selectedPaymentMethod === "Transfer Bank"
                  ? "Silakan transfer tepat sesuai nominal ke rekening yang tertera untuk konfirmasi otomatis."
                  : "Silakan pindai kode QRIS di atas menggunakan aplikasi mobile banking atau e-wallet Anda."
                }
              </p>
              
              <button 
                onClick={() => setShowPaymentPopup(false)}
                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest transition-all"
              >
                Saya Sudah Membayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Sewa Modal */}
      {showUserModal && selectedUserMobil && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col relative animate-popIn shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Fixed Header */}
            <div className="p-6 sm:px-8 sm:pt-8 sm:pb-5 border-b border-slate-100 flex-shrink-0 relative bg-white z-10">
              <button
                onClick={() => setShowUserModal(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-white hover:bg-[#990000] transition-all font-bold text-lg shadow-sm"
                title="Tutup Modal"
              >
                ✕
              </button>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#990000] text-[10px] font-black uppercase tracking-widest mb-3">
                Pemesanan Armada
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pr-10">
                Konfirmasi Sewa
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                Lengkapi detail perjalanan Anda untuk unit <span className="text-[#990000] font-black">{selectedUserMobil.nama}</span>.
              </p>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {/* Kalender Ketersediaan Unit */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#990000] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
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
                  <label className="text-[10px] text-slate-400 font-black block mb-2 uppercase tracking-widest ml-1">Mulai Sewa</label>
                  <input
                    type="datetime-local"
                    value={tanggalMulai[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "mulai", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl p-4 focus:border-[#990000] focus:ring-4 focus:ring-red-100 transition-all outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Selesai Sewa</label>
                  <input
                    type="datetime-local"
                    value={tanggalSelesai[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "selesai", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl p-4 focus:border-[#990000] focus:ring-4 focus:ring-red-100 transition-all outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Lokasi Penyerahan</label>
                <div className="relative">
                  <select
                    value={lokasiPenyerahan[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "lokasi", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl p-4 focus:border-[#990000] transition-all outline-none cursor-pointer appearance-none font-bold"
                  >
                    <option value="">Pilih Lokasi...</option>
                    <option value="Rumah">Diantar ke Rumah / Hotel</option>
                    {/* Hanya tampilkan Ambil di Garasi jika BUKAN mode Driver */}
                    {serviceType !== "driver" && !((selectedUserMobil.withDriver === true || selectedUserMobil.layanan === "Dengan Driver")) && (
                      <option value="Kantor">Ambil di Garasi</option>
                    )}
                    <option value="Titik Temu">Titik Temu Lain</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight size={18} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Form Alamat untuk Diantar ke Rumah / Hotel */}
              {lokasiPenyerahan[selectedUserMobil.id] === "Rumah" && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] text-[#990000] font-black uppercase tracking-widest ml-1">📍 Alamat Pengiriman</label>
                  <p className="text-[10px] text-slate-400 ml-1">Driver akan mengantarkan mobil ke alamat berikut</p>
                  <textarea
                    rows={3}
                    value={deliveryAddress[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "deliveryAddress", e.target.value)}
                    placeholder="Contoh: Jl. Raya Darmo No. 21, Hotel Sheraton, Lt. 1 Lobby — Surabaya"
                    className="w-full bg-red-50/30 border border-red-200 text-slate-900 text-sm rounded-2xl p-4 focus:border-[#990000] outline-none font-bold resize-none"
                  />
                </div>
              )}

              {/* Form Alamat untuk Titik Temu */}
              {lokasiPenyerahan[selectedUserMobil.id] === "Titik Temu" && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] text-[#990000] font-black uppercase tracking-widest ml-1">📍 Titik Temu</label>
                  <p className="text-[10px] text-slate-400 ml-1">Masukkan alamat atau nama tempat titik temu dengan driver</p>
                  <textarea
                    rows={3}
                    value={deliveryAddress[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "deliveryAddress", e.target.value)}
                    placeholder="Contoh: Bandara Juanda Terminal 1, Area Kedatangan — Sidoarjo"
                    className="w-full bg-red-50/30 border border-red-200 text-slate-900 text-sm rounded-2xl p-4 focus:border-[#990000] outline-none font-bold resize-none"
                  />
                </div>
              )}



              {tanggalMulai[selectedUserMobil.id] && tanggalSelesai[selectedUserMobil.id] && (
                <div className="bg-[#990000] rounded-[2rem] p-8 text-white shadow-xl shadow-red-900/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative z-10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Estimasi Total</p>
                      <p className="text-3xl font-black tracking-tighter">
                        Rp {(() => {
                          const durasi = Math.ceil((new Date(tanggalSelesai[selectedUserMobil.id]) - new Date(tanggalMulai[selectedUserMobil.id])) / (1000 * 60 * 60 * 24));
                          if (durasi <= 0) return "0";
                          let total = durasi * selectedUserMobil.harga;
                          if ((rentalType[selectedUserMobil.id] || "Lepas Kunci") === "Driver") total += 250000;
                          return total.toLocaleString();
                        })()}
                      </p>
                      <p className="text-[10px] font-bold opacity-60 mt-1">
                        {(rentalType[selectedUserMobil.id] || "Lepas Kunci") === "Driver" ? "+ Biaya Layanan Driver" : "Harga Netto"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <CreditCard size={24} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => handleSewa(selectedUserMobil)}
              className="w-full py-5 rounded-[1.5rem] bg-slate-900 hover:bg-[#990000] text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 group"
            >
              <Car size={20} className="group-hover:-translate-x-1 transition-transform" /> 
              Proses Pesanan Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Sewa Manual Modal (Cashier) */}
      {showManualModal && manualMobil && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[110] p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-popIn shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Fixed Modal Header */}
            <div className="px-6 pt-6 pb-5 sm:px-10 sm:pt-8 sm:pb-6 border-b border-slate-100 flex-shrink-0 relative bg-white z-10">
              <button
                onClick={() => setShowManualModal(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-white hover:bg-[#990000] transition-all font-bold text-lg shadow-sm"
                title="Tutup Modal"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#990000]/10 text-[#990000] text-[10px] font-black uppercase tracking-widest border border-[#990000]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#990000] animate-pulse" />
                  Kasir Admin Panel
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Mode Transaksi Offline
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 pr-12">
                <Car size={24} className="text-[#990000] flex-shrink-0" />
                Sewa Manual — {manualMobil.nama}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Input data penyewa secara langsung dan atur jadwal pemesanan unit.
              </p>
            </div>

            {/* Scrollable Form Body */}
            <div className="px-6 py-6 sm:px-10 sm:py-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                
                {/* Left Column: Customer Information Card */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                    <User size={18} className="text-[#990000]" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Informasi Pelanggan
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {/* Nama Lengkap */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">
                        Nama Lengkap Customer
                      </label>
                      <input
                        type="text"
                        value={manualClient.namaLengkap}
                        onChange={(e) => setManualClient({ ...manualClient, namaLengkap: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/10 outline-none font-bold transition-all shadow-sm"
                        placeholder="Contoh: Budi Santoso"
                      />
                    </div>

                    {/* NIK */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">
                        NIK Penyewa (KTP)
                      </label>
                      <input
                        type="text"
                        value={manualClient.nik}
                        onChange={(e) => setManualClient({ ...manualClient, nik: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/10 outline-none font-bold transition-all shadow-sm"
                        placeholder="Masukkan 16 digit NIK KTP..."
                      />
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">
                        Nomor Telepon / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={manualClient.nomorTelepon}
                        onChange={(e) => setManualClient({ ...manualClient, nomorTelepon: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/10 outline-none font-bold transition-all shadow-sm"
                        placeholder="08123456789"
                      />
                    </div>

                    {/* Alamat */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">
                        Alamat Lengkap Domisili
                      </label>
                      <textarea
                        value={manualClient.alamat}
                        onChange={(e) => setManualClient({ ...manualClient, alamat: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl p-3.5 focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/10 outline-none h-24 resize-none font-bold transition-all shadow-sm"
                        placeholder="Input alamat lengkap domisili penyewa..."
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Booking Configuration Card */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                    <CalendarIcon size={18} className="text-[#990000]" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Konfigurasi Sewa Unit
                    </h4>
                  </div>

                  {/* Calendar */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                    <label className="text-[10px] text-[#990000] font-black uppercase tracking-wider flex items-center gap-1.5 mb-2 px-1">
                      <CalendarIcon size={13} /> Kalender Ketersediaan Armada
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">Tgl Mulai</label>
                      <input
                        type="datetime-local"
                        value={tanggalMulai[manualMobil.id] || ""}
                        onChange={(e) => handleTanggalChange(manualMobil.id, "mulai", e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:border-[#990000] outline-none font-bold shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">Tgl Selesai</label>
                      <input
                        type="datetime-local"
                        value={tanggalSelesai[manualMobil.id] || ""}
                        onChange={(e) => handleTanggalChange(manualMobil.id, "selesai", e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:border-[#990000] outline-none font-bold shadow-sm"
                      />
                    </div>
                  </div>

                  {/* DP Amount */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
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
                          className="text-[9px] font-black text-[#990000] hover:underline uppercase tracking-tight"
                        >
                          + Set DP Minimal 50%
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 font-black text-xs">Rp</div>
                      <input
                        type="number"
                        value={manualClient.dpAmount}
                        onChange={(e) => setManualClient({ ...manualClient, dpAmount: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl py-3 pl-10 pr-3 focus:border-[#990000] outline-none font-black shadow-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-[#0f172a] rounded-2xl p-5 text-white shadow-md border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estimasi Durasi</span>
                      <span className="font-black text-amber-400">
                        {tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id] ? 
                          Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24))) + " Hari" 
                          : "-"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grand Total</span>
                      <span className="text-lg font-black text-red-400">
                        Rp {(() => {
                          const durasi = Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)));
                          let total = durasi * manualMobil.harga;
                          if ((rentalType[manualMobil.id] || "Lepas Kunci") === "Driver") total += 250000;
                          return (tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id]) ? total.toLocaleString() : "0";
                        })()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Metode Pembayaran</span>
                      <select
                        value={manualClient.paymentMethod}
                        onChange={(e) => setManualClient({ ...manualClient, paymentMethod: e.target.value })}
                        className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-700 outline-none cursor-pointer"
                      >
                        <option value="Cash" className="bg-slate-900">TUNAI / CASH</option>
                        <option value="Transfer Bank" className="bg-slate-900">TRANSFER BANK</option>
                      </select>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Fixed Bottom Submit Footer */}
            <div className="p-4 sm:px-10 sm:py-5 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
              <button 
                onClick={handleSubmitSewaManual}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-[#990000] hover:bg-[#7a0000] text-white font-black text-xs sm:text-sm uppercase tracking-widest transition-all active:scale-[0.99] shadow-lg shadow-[#990000]/20 flex items-center justify-center gap-2"
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
