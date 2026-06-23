import { collection, doc, updateDoc, addDoc, query, where, onSnapshot, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Car, Users, Search, RefreshCw, Star, CheckCircle, Zap, Briefcase, CreditCard, ChevronRight, Key, UserCheck } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";

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
      setMobil(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || "tersedia",
        }))
      );
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
    } else if (type === "titikTemu") {
      setTitikTemuAddress((prev) => ({ ...prev, [id]: value }));
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

    let perkiraanHarga = durasiHari * m.harga;
    const selectedRentalType = rentalType[m.id] || "Lepas Kunci";
    if (selectedRentalType === "Driver") {
      perkiraanHarga += 250000;
    }

    try {
      await addDoc(collection(db, "pemesanan"), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        mobilId: m.id,
        namaMobil: m.nama,
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
        lokasiPenyerahan: lokasiPenyerahan[m.id] || "",
        titikTemuAddress: titikTemuAddress[m.id] || "",
      });

      await updateDoc(doc(db, "mobil", m.id), {
        status: "disewa",
        tersedia: false,
      });

      await addNotification("Pemesanan berhasil! Silakan tunggu konfirmasi.");
      await addAdminNotification(`Pesanan baru dari ${auth.currentUser.email}: ${m.nama}`);
      
      toast.success("Pemesanan Berhasil!", "Silakan tunggu konfirmasi selanjutnya.");
      setShowUserModal(false);
      setSelectedUserMobil(null);
    } catch (err) {
      console.error("Gagal menyewa:", err);
      toast.error("Terjadi kesalahan saat menyewa. Error: " + err.message);
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
        namaMobil: m.nama,
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

      await addDoc(collection(db, "pemesanan"), orderData);

      // Auto trigger print invoice
      InvoiceGenerator.generateDPInvoice(orderData, { nama: manualClient.namaLengkap, email: finalEmail, nomorTelepon: manualClient.nomorTelepon });

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
      toast.error("Gagal Sewa Manual", err.message);
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

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col h-full animate-fadeInUp"
                  style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-6 right-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${
                        ["servis", "service", "maintenance"].includes(statusLower)
                          ? "bg-amber-500/90 text-white border-amber-400"
                          : ["disewa", "rented", "booked"].includes(statusLower)
                          ? "bg-[#990000]/90 text-white border-red-800"
                          : "bg-emerald-500/90 text-white border-emerald-400"
                      }`}>
                        {["servis", "service", "maintenance"].includes(statusLower)
                          ? "Maintenance"
                          : ["disewa", "rented", "booked"].includes(statusLower)
                          ? "Booked"
                          : "Available"}
                      </span>
                    </div>


                  </div>

                  <div className="p-8 flex flex-col flex-grow">
                    <div className="mb-6 flex-grow">
                      <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-[#990000] transition-colors">{m.nama}</h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-slate-500">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                              <Users size={16} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest">{m.seats || 4} Passengers</span>
                          </div>
                          
                          {/* Service Badges */}
                          <div className="flex gap-2">
                             <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${ (m.withDriver === true || m.layanan === "Dengan Driver") ? 'bg-red-50 border-red-100 text-[#990000]' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-50'} transition-all`} title="Dengan Driver">
                               <UserCheck size={12} />
                               <span className="text-[9px] font-black uppercase tracking-tighter">Driver</span>
                             </div>
                             <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${ (m.withDriver !== true && m.layanan !== "Dengan Driver") ? 'bg-red-50 border-red-100 text-[#990000]' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-50'} transition-all`} title="Lepas Kunci">
                               <Key size={12} />
                               <span className="text-[9px] font-black uppercase tracking-tighter">Lepas</span>
                             </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Zap size={16} />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest">{m.chargingPort !== false ? 'Usb Charging' : 'No Charging'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Briefcase size={16} />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest">{m.luggage !== false ? 'Standard Luggage' : 'Small Trunk'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Logic UI */}
                    <div className="pt-6 border-t border-slate-100 mt-auto">
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
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                              >
                                Upload Payment Proof
                              </button>
                            );
                          } else if (orderStatus === "pembayaran berhasil") {
                            return (
                              <div className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <CheckCircle size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">Order Confirmed</span>
                              </div>
                            );
                          }
                        }

                        if (["tersedia", "available", "ready", "normal"].includes(statusLower) || m.tersedia === true) {
                          return (
                            <div className="flex flex-col gap-3">
                              {!isAdmin && (
                                <button
                                  onClick={() => openUserSewaModal(m)}
                                  className="w-full py-4 bg-[#990000] hover:bg-[#7a0000] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10 flex items-center justify-center gap-2"
                                >
                                  {serviceType === "driver" ? "Hire With Driver" : "Rent This Unit"}
                                  <ChevronRight size={14} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => openSewaManualModal(m)}
                                  className="w-full py-4 bg-slate-900 hover:bg-[#990000] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                                >
                                  Manual Order (Cashier)
                                </button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="text-center py-3 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currently Unavailable</p>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] px-4 overflow-y-auto py-10">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-xl relative animate-popIn shadow-2xl border border-slate-200 my-auto">
            <button
              onClick={() => setShowUserModal(false)}
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-[#990000] hover:bg-red-50 transition-all font-bold text-xl"
            >
              ×
            </button>
            
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#990000] text-[10px] font-black uppercase tracking-widest mb-4">
                Pemesanan Armada
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                Konfirmasi Sewa
              </h3>
              <p className="text-slate-500 font-medium mt-2">
                Lengkapi detail perjalanan Anda untuk unit <span className="text-[#990000] font-black">{selectedUserMobil.nama}</span>.
              </p>
            </div>

            <div className="space-y-8 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Mulai Sewa</label>
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
                    <option value="Kantor">Ambil di Garasi</option>
                    <option value="Titik Temu">Titik Temu Lain</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight size={18} className="rotate-90" />
                  </div>
                </div>
              </div>

              {lokasiPenyerahan[selectedUserMobil.id] === "Titik Temu" && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] text-[#990000] font-black uppercase tracking-widest ml-1">Detail Titik Temu</label>
                  <input
                    type="text"
                    value={titikTemuAddress[selectedUserMobil.id] || ""}
                    onChange={(e) => handleTanggalChange(selectedUserMobil.id, "titikTemu", e.target.value)}
                    placeholder="Contoh: Bandara Juanda Terminal 1"
                    className="w-full bg-red-50/30 border border-red-200 text-slate-900 text-sm rounded-2xl p-4 focus:border-[#990000] outline-none font-bold"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Opsi Layanan</label>
                <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRentalType((prev) => ({ ...prev, [selectedUserMobil.id]: "Lepas Kunci" }))}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      rentalType[selectedUserMobil.id] === "Lepas Kunci" || !rentalType[selectedUserMobil.id]
                        ? "bg-white text-[#990000] shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >Lepas Kunci</button>
                  <button
                    type="button"
                    onClick={() => setRentalType((prev) => ({ ...prev, [selectedUserMobil.id]: "Driver" }))}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      rentalType[selectedUserMobil.id] === "Driver"
                        ? "bg-white text-[#990000] shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >Dengan Driver</button>
                </div>
              </div>

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] px-4 overflow-y-auto py-10">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-4xl relative animate-popIn shadow-2xl border border-slate-200 my-auto">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-[#990000] hover:bg-red-50 transition-all font-bold"
            >
              ×
            </button>
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#990000] text-[10px] font-black uppercase tracking-widest mb-4">
                Admin Control Panel
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                Sewa Manual (Offline)
              </h3>
              <p className="text-slate-500 font-medium mt-2">
                Input data penyewa secara langsung untuk unit <span className="font-black text-slate-900">{manualMobil.nama}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">Informasi Pelanggan</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-black block mb-2 uppercase tracking-widest">Nama Lengkap</label>
                    <input
                      type="text"
                      value={manualClient.namaLengkap}
                      onChange={(e) => setManualClient({ ...manualClient, namaLengkap: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-4 focus:border-[#990000] outline-none font-bold"
                      placeholder="Input nama customer..."
                    />
                  </div>
                   <div>
                    <label className="text-[10px] text-slate-400 font-black block mb-2 uppercase tracking-widest">NIK Penyewa</label>
                    <input
                      type="text"
                      value={manualClient.nik}
                      onChange={(e) => setManualClient({ ...manualClient, nik: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-4 focus:border-[#990000] outline-none font-bold"
                      placeholder="Masukkan NIK sesuai KTP..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-black block mb-2 uppercase tracking-widest">Kontak (WA)</label>
                    <input
                      type="text"
                      value={manualClient.nomorTelepon}
                      onChange={(e) => setManualClient({ ...manualClient, nomorTelepon: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-4 focus:border-[#990000] outline-none font-bold"
                      placeholder="0812..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-black block mb-2 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea
                      value={manualClient.alamat}
                      onChange={(e) => setManualClient({ ...manualClient, alamat: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-4 focus:border-[#990000] outline-none h-24 resize-none font-bold"
                      placeholder="Input alamat domisili..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">Konfigurasi Sewa</h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mulai</label>
                       <input
                         type="datetime-local"
                         value={tanggalMulai[manualMobil.id] || ""}
                         onChange={(e) => handleTanggalChange(manualMobil.id, "mulai", e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:border-[#990000] outline-none font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Selesai</label>
                       <input
                         type="datetime-local"
                         value={tanggalSelesai[manualMobil.id] || ""}
                         onChange={(e) => handleTanggalChange(manualMobil.id, "selesai", e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:border-[#990000] outline-none font-bold"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nominal DP (Min 50%)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-black text-xs">Rp</div>
                      <input
                        type="number"
                        value={manualClient.dpAmount}
                        onChange={(e) => setManualClient({ ...manualClient, dpAmount: e.target.value })}
                        className="w-full bg-white border-2 border-slate-100 text-slate-900 text-sm rounded-xl py-4 pl-12 pr-4 focus:border-[#990000] outline-none font-black shadow-inner"
                        placeholder="0"
                      />
                    </div>
                    {manualMobil && tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id] && (
                      <p className="text-[9px] font-bold text-slate-400 mt-1">
                        Saran DP: Rp {(Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)) * manualMobil.harga * 0.5).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800">
                    <div className="flex justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Durasi</span>
                      <span className="text-sm font-black">
                        {tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id] ? 
                          Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24))) + " Hari" 
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between mb-4 pb-4 border-b border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Grand Total</span>
                      <span className="text-xl font-black text-red-400">
                        Rp {(() => {
                          const durasi = Math.max(1, Math.ceil((new Date(tanggalSelesai[manualMobil.id]) - new Date(tanggalMulai[manualMobil.id])) / (1000 * 60 * 60 * 24)));
                          let total = durasi * manualMobil.harga;
                          if ((rentalType[manualMobil.id] || "Lepas Kunci") === "Driver") total += 250000;
                          return (tanggalMulai[manualMobil.id] && tanggalSelesai[manualMobil.id]) ? total.toLocaleString() : "0";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Metode</span>
                      <select
                        value={manualClient.paymentMethod}
                        onChange={(e) => setManualClient({ ...manualClient, paymentMethod: e.target.value })}
                        className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
                      >
                        <option value="Cash" className="bg-slate-900">TUNAI / CASH</option>
                        <option value="Transfer Bank" className="bg-slate-900">TRANSFER</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSubmitSewaManual}
              className="w-full py-5 rounded-2xl bg-[#990000] hover:bg-[#7a0000] text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-red-900/20"
            >
              Submit Transaksi Kasir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
