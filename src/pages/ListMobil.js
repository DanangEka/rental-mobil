import { collection, doc, updateDoc, addDoc, query, where, onSnapshot, getDoc, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../services/firebase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Car, MapPin, Calendar, Users, Fuel, Settings, Search, Filter, RefreshCw, Star, Image as ImageIcon, Upload, CheckCircle } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";

export default function ListMobil() {
  const navigate = useNavigate();
  const toast = useToast();
  const [mobil, setMobil] = useState([]);
  const [filteredMobil, setFilteredMobil] = useState([]);
  const [tanggalMulai, setTanggalMulai] = useState({});
  const [tanggalSelesai, setTanggalSelesai] = useState({});
  const [lokasiPenyerahan, setLokasiPenyerahan] = useState({});
  const [titikTemuAddress, setTitikTemuAddress] = useState({});
  const [rentalType, setRentalType] = useState({});
  const [paymentMethod, setPaymentMethod] = useState({});
  const [paymentProof, setPaymentProof] = useState({});
  const [userOrders, setUserOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

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

    setLoading(false);

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

      return matchesSearch && matchesStatus;
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
  }, [mobil, searchTerm, filterStatus, sortBy]);

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
    } catch (err) {
      console.error("Gagal menyewa:", err);
      toast.error("Terjadi kesalahan saat menyewa. Error: " + err.message);
    }
  };

  const handlePaymentSubmit = async (order) => {
    if (!paymentMethod[order.id] && !order.paymentMethod) {
      toast.warning("Silakan pilih metode pembayaran.");
      return;
    }
    if (!paymentProof[order.id]) {
      toast.warning("Silakan unggah bukti pembayaran.");
      return;
    }

    try {
      // 1. Upload gambar ke Cloudinary
      const formData = new FormData();
      formData.append("file", paymentProof[order.id]);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const paymentProofURL = cloudinaryRes.data.secure_url;

      // 2. Update data pemesanan di Firestore langsung
      const orderDocRef = doc(db, "pemesanan", order.id);
      await updateDoc(orderDocRef, {
        paymentMethod: paymentMethod[order.id] || order.paymentMethod,
        paymentProof: paymentProofURL,
        paymentStatus: "submitted",
        waktuUpload: new Date().toISOString(),
      });

      // 3. Update state lokal agar UI berubah
      await addNotification("Bukti Pembayaran Telah Terkirim");
      await addAdminNotification(`Pembayaran diterima dari ${order.email}: ${order.namaMobil}`);
      setUserOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, paymentStatus: "submitted", paymentProof: paymentProofURL }
            : o
        )
      );

      // 4. Generate DP Invoice
      try {
        const updatedOrder = {
          ...order,
          paymentMethod: paymentMethod[order.id] || order.paymentMethod,
          paymentProof: paymentProofURL,
          paymentStatus: "submitted"
        };
        InvoiceGenerator.generateDPInvoice(updatedOrder, userData);
        await addNotification("Invoice DP telah dibuat dan didownload");
      } catch (invoiceError) {
        console.error("Error generating DP invoice:", invoiceError);
        // Don't show error to user as payment was successful
      }
      toast.success("Pembayaran Berhasil Dikirim", "Menunggu konfirmasi pembayaran oleh Admin.");
    } catch (err) {
      console.error("Gagal mengirim bukti pembayaran:", err);
      toast.error("Terjadi kesalahan saat mengirim bukti pembayaran. Error: " + err.message);
    }
  };

  const handleCashPayment = async (order) => {
    const selectedPaymentMethod = paymentMethod[order.id] || order.paymentMethod;

    if (!selectedPaymentMethod) {
      toast.warning("Silakan pilih metode pembayaran.");
      return;
    }

    if (selectedPaymentMethod !== "Cash") {
      toast.warning("Metode pembayaran harus Cash untuk menggunakan fitur ini.");
      return;
    }

    try {
      // Update data pemesanan untuk cash payment tanpa upload bukti
      const orderDocRef = doc(db, "pemesanan", order.id);
      await updateDoc(orderDocRef, {
        paymentMethod: selectedPaymentMethod,
        paymentStatus: "pending_approval", // Status baru untuk menunggu approval admin
        waktuUpload: new Date().toISOString(),
      });

      // Update state lokal agar UI berubah
      await addNotification("Permintaan sewa dengan pembayaran cash telah diajukan");
      await addAdminNotification(`Permintaan sewa cash dari ${order.email}: ${order.namaMobil} - Menunggu Approval`);
      setUserOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, paymentStatus: "pending_approval" }
            : o
        )
      );

      // Generate DP Invoice for cash payment request
      try {
        const updatedOrder = {
          ...order,
          paymentMethod: selectedPaymentMethod,
          paymentStatus: "pending_approval"
        };
        InvoiceGenerator.generateDPInvoice(updatedOrder, userData);
        await addNotification("Invoice DP untuk pembayaran cash telah dibuat");
      } catch (invoiceError) {
        console.error("Error generating DP invoice for cash payment:", invoiceError);
        // Don't show error to user as payment request was successful
      }
      toast.success("Permintaan Sewa Diajukan", "Menunggu persetujuan admin untuk sewa dengan Cash.");
    } catch (err) {
      console.error("Gagal mengajukan pembayaran cash:", err);
      toast.error("Terjadi kesalahan saat mengajukan pembayaran cash. Error: " + err.message);
    }
  };



  return (
    <div className={`min-h-screen bg-black pt-[72px] relative overflow-hidden ${mobil.length > 0 ? "pb-20" : ""}`}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/20 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/20 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full px-4 py-8 md:py-16 text-center animate-fadeInUp">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 group inline-block relative cursor-default">
          <span className="relative z-10">Sewa Mobil Terbaik</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-brand-600/50 -z-10 group-hover:bg-brand-500 transition-colors duration-300"></span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mt-2">
          Pilih armada impian Anda dengan harga terjangkau dan layanan profesional tanpa kompromi.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8 md:px-6 md:pb-12 lg:px-8 relative z-10">
        {/* Search and Filter Section */}
        <div className="mb-10 glass-card bg-gray-900/60 rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-2xl relative overflow-hidden animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-800 pb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <div className="p-2 bg-brand-500/20 rounded-xl text-brand-400">
                  <Filter size={20} />
               </div>
               Cari & Filter Armada
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-4 sm:mt-0 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 border border-gray-700 text-white px-5 py-2.5 rounded-xl transition-colors font-semibold"
            >
              <RefreshCw size={18} className={`text-brand-400 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Memperbarui...' : 'Perbarui Data'}
            </button>
          </div>

          {/* Verification Status Alert */}
          {userData && userData.verificationStatus !== "verified" && (
            <div className={`mb-4 p-4 rounded-lg border ${
              userData.verificationStatus === "unverified"
                ? "bg-red-900 border-red-700 text-red-100"
                : "bg-yellow-900 border-yellow-700 text-yellow-100"
            }`}>
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {userData.verificationStatus === "unverified" ? "❌" : "⏳"}
                </div>
                <div>
                  <h3 className="font-semibold">
                    {userData.verificationStatus === "unverified"
                      ? "Akun Belum Diverifikasi"
                      : "Verifikasi Sedang Diproses"}
                  </h3>
                  <p className="text-sm opacity-90">
                    {userData.verificationStatus === "unverified"
                      ? "Upload KTP di halaman profil untuk dapat melakukan pemesanan mobil."
                      : "KTP Anda sedang dalam proses verifikasi admin. Silakan tunggu konfirmasi."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Pencarian Bebas</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Ketik nama, merek, atau tahun armada..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-black/40 border border-gray-700 hover:border-gray-600 focus:border-brand-500 transition-colors text-white rounded-xl outline-none"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand-400 text-gray-500 transition-colors">
                  <Search size={18} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-gray-700 hover:border-gray-600 focus:border-brand-500 transition-colors text-white rounded-xl outline-none cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                <option value="name">Abjad (A-Z)</option>
                <option value="price-low">Harga Termurah</option>
                <option value="price-high">Harga Tertinggi</option>
                <option value="year-new">Tahun Terbaru</option>
                <option value="year-old">Tahun Terlama</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Ketersediaan</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-gray-700 hover:border-gray-600 focus:border-brand-500 transition-colors text-white rounded-xl outline-none cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                <option value="semua">Semua Status</option>
                <option value="tersedia">Tersedia Saja</option>
                <option value="disewa">Sedang Disewa</option>
                <option value="servis">Dalam Perawatan</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-800">
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 p-5 rounded-2xl border border-green-800/50 flex items-center justify-between group hover:border-green-500/50 transition-colors">
              <div>
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-1">Tersedia</h3>
                <p className="text-3xl font-black text-white group-hover:text-green-300 transition-colors">
                  {filteredMobil.filter(m => m.tersedia === true || m.status === "tersedia").length}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 p-5 rounded-2xl border border-red-800/50 flex items-center justify-between group hover:border-red-500/50 transition-colors">
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">Disewa</h3>
                <p className="text-3xl font-black text-white group-hover:text-red-300 transition-colors">
                  {filteredMobil.filter(m => m.status === "disewa" || m.tersedia === false).length}
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <Users className="h-6 w-6 text-red-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 p-5 rounded-2xl border border-yellow-800/50 flex items-center justify-between group hover:border-yellow-500/50 transition-colors">
              <div>
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-1">Servis</h3>
                <p className="text-3xl font-black text-white group-hover:text-yellow-300 transition-colors">
                  {filteredMobil.filter(m => m.status === "servis").length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Settings className="h-6 w-6 text-yellow-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 p-5 rounded-2xl border border-blue-800/50 flex items-center justify-between group hover:border-blue-500/50 transition-colors">
              <div>
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1">Total</h3>
                <p className="text-3xl font-black text-white group-hover:text-blue-300 transition-colors">{filteredMobil.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Car className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {filteredMobil.length === 0 ? (
          <div className="text-center py-16 md:py-24 glass-card bg-gray-900/60 rounded-3xl mt-8 animate-fadeInUp">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Car className="w-10 h-10 text-gray-500" />
            </div>
            <div className="text-white text-2xl font-bold mb-2">
              Tidak ada armada yang cocok
            </div>
            <p className="text-gray-400">Silakan ubah filter pencarian Anda atau kembali lagi nanti</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-8 mt-12">
            {filteredMobil.map((m) => {
              const statusLower = m.status?.toLowerCase();
              const order = getUserOrderForCar(m.id);
              const orderStatus = order?.status?.toLowerCase();

              return (
                <div
                  key={m.id}
                  className="glass-card bg-gray-900/60 rounded-3xl overflow-hidden group hover:border-brand-500/50 transition-all duration-300 flex flex-col h-full animate-fadeInUp"
                >
                  <div className="relative aspect-video bg-black/50 overflow-hidden">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-90 transition-all duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    <div
                      className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border ${
                        ["servis", "service", "maintenance"].includes(statusLower)
                          ? "bg-yellow-500/80 border-yellow-400 text-white"
                          : ["disewa", "rented", "booked"].includes(statusLower)
                          ? "bg-red-600/80 border-red-500 text-white"
                          : "bg-green-500/80 border-green-400 text-white"
                      }`}
                    >
                      {["servis", "service", "maintenance"].includes(statusLower)
                        ? "Servis"
                        : ["disewa", "rented", "booked"].includes(statusLower)
                        ? "Disewa"
                        : "Tersedia"}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 flex flex-col flex-grow">
                    <div className="flex-grow">
                      <h3 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-brand-400 transition-colors">{m.nama}</h3>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-brand-400 font-bold text-2xl">Rp {m.harga.toLocaleString()}</span>
                        <span className="text-gray-500 text-sm font-medium">/ hari</span>
                      </div>
                    </div>

                    {/* Kondisi tampilan */}
                    {(() => {
                      // =============================
                      // Prioritas pertama: order user
                      // =============================
                      if (order && !isAdmin) {
                        if (orderStatus === "diproses") {
                          return (
                            <div className="text-center py-6">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-900 rounded-full mb-3">
                                <div className="w-6 h-6 bg-yellow-500 rounded-full animate-pulse"></div>
                              </div>
                              <div className="text-yellow-400 text-base font-semibold">
                                Mobil sedang diproses
                              </div>
                              <div className="text-gray-400 text-sm mt-1">
                                Mohon tunggu sebentar
                              </div>
                            </div>
                          );
                        } else if (
  ["disetujui", "menunggu pembayaran", "approved"].includes(orderStatus?.trim())
) {
  if (order.paymentStatus === "submitted") {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-900 rounded-full mb-3">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-green-400 text-base font-semibold">
          Bukti Pembayaran Berhasil Diupload
        </div>
        <div className="text-gray-400 text-sm mt-1">
          Menunggu konfirmasi admin
        </div>
      </div>
    );
  } else if (order.paymentStatus === "pending_approval") {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-900 rounded-full mb-3">
          <div className="w-6 h-6 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>
        <div className="text-yellow-400 text-base font-semibold">
          Permintaan Sewa Cash Menunggu Approval
        </div>
        <div className="text-gray-400 text-sm mt-1">
          Admin akan meninjau permintaan Anda
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 pt-4 border-t border-gray-800">
      <div className="text-center bg-green-900/20 rounded-xl p-4 border border-green-800/50">
        <div className="text-green-400 text-base font-bold flex items-center justify-center gap-2">
          <CheckCircle size={18} /> Pesanan Disetujui
        </div>
        <div className="text-gray-400 text-sm mt-1">
          Silakan upload bukti DP
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider block mb-2">
          Metode Pembayaran
        </label>
        <select
          value={paymentMethod[order.id] || order.paymentMethod || ""}
          onChange={(e) => {
            const selectedMethod = e.target.value;
            setPaymentMethod((prev) => ({
              ...prev,
              [order.id]: selectedMethod,
            }));

            // Show popup for Transfer Bank or E-Wallet
            if (selectedMethod === "Transfer Bank" || selectedMethod === "E-Wallet") {
              setSelectedPaymentMethod(selectedMethod);
              setShowPaymentPopup(true);
            }
          }}
          className="w-full bg-black/50 border border-gray-700 text-white text-sm rounded-xl p-3.5 focus:border-brand-500 transition-colors outline-none cursor-pointer appearance-none"
        >
          <option value="">Pilih Metode</option>
          <option value="Transfer Bank">Transfer Bank</option>
          <option value="E-Wallet">E-Wallet</option>
          <option value="Cash">Cash (Di Tempat)</option>
        </select>
      </div>
      {/* Hide upload field for cash payments */}
      {((paymentMethod[order.id] || order.paymentMethod) !== "Cash") && (
        <div>
          <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider block mb-2">
            Bukti Pembayaran DP
          </label>
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setPaymentProof((prev) => ({
                  ...prev,
                  [order.id]: e.target.files[0],
                }))
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full bg-black/50 border border-gray-700 group-hover:border-brand-500 text-gray-300 text-sm rounded-xl p-3.5 flex items-center gap-3 transition-colors">
              <div className="bg-gray-800 p-2 rounded-lg text-brand-400">
                 <Upload size={16} />
              </div>
              <span className="truncate flex-1 font-medium">
                {paymentProof[order.id] ? paymentProof[order.id].name : "Pilih file gambar..."}
              </span>
            </div>
          </div>
        </div>
      )}
      <button
        className="w-full pt-2"
        onClick={() => {
          if ((paymentMethod[order.id] || order.paymentMethod) === "Cash") {
            handleCashPayment(order);
          } else {
            handlePaymentSubmit(order);
          }
        }}
      >
        <div className="w-full py-3.5 px-4 rounded-xl font-bold text-center transition-all bg-brand-600 hover:bg-brand-500 text-white shadow-brand-sm">
           {(paymentMethod[order.id] || order.paymentMethod) === "Cash" ? "Ajukan Sewa Cash" : "Kirim Bukti Pembayaran"}
        </div>
      </button>
    </div>
  );
                        } else if (orderStatus === "pembayaran berhasil") {
                          return (
                            <div className="text-center py-6">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-900 rounded-full mb-3">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div className="text-green-400 text-base font-semibold">
                                Pembayaran Telah Dikonfirmasi
                              </div>
                              <div className="text-gray-400 text-sm mt-1">Mobil siap diambil</div>
                            </div>
                          );
                        } else if (orderStatus === "approve sewa") {
                          return (
                            <div className="text-center py-6">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-900 rounded-full mb-3">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div className="text-green-400 text-base font-semibold">
                                Sewa Cash Telah Disetujui
                              </div>
                              <div className="text-gray-400 text-sm mt-1">Mobil siap untuk diambil</div>
                            </div>
                          );
                        }
                      }

                      // =============================
                      // Kalau user tidak punya order
                      // =============================
                      if (
                        ["tersedia", "available", "ready", "normal"].includes(
                          statusLower
                        ) ||
                        m.tersedia === true
                      ) {
                        return (
                          <div className="space-y-5 pt-4 border-t border-gray-800">
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                                    Mulai Sewa
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={tanggalMulai[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "mulai", e.target.value)
                                    }
                                    style={{ colorScheme: "dark" }}
                                    className="w-full bg-black/50 border border-gray-700 text-white text-sm rounded-xl p-3 focus:border-brand-500 transition-colors outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                                    Selesai Sewa
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={tanggalSelesai[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "selesai", e.target.value)
                                    }
                                    style={{ colorScheme: "dark" }}
                                    className="w-full bg-black/50 border border-gray-700 text-white text-sm rounded-xl p-3 focus:border-brand-500 transition-colors outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                                    Lokasi Penyerahan
                                  </label>
                                  <select
                                    value={lokasiPenyerahan[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "lokasi", e.target.value)
                                    }
                                    className="w-full bg-black/50 border border-gray-700 text-white text-sm rounded-xl p-3 focus:border-brand-500 transition-colors outline-none cursor-pointer appearance-none text-center"
                                  >
                                    <option value="">-- Pilih --</option>
                                    <option value="Rumah">Diantar ke Rumah / Hotel</option>
                                    <option value="Kantor">Ambil di Garasi</option>
                                    <option value="Titik Temu">Titik Temu Lain</option>
                                  </select>
                                </div>
                                {lokasiPenyerahan[m.id] === "Titik Temu" && (
                                  <div>
                                    <label className="text-xs text-brand-400 font-bold uppercase tracking-wider block mb-2">
                                      Detail Titik Temu
                                    </label>
                                    <input
                                      type="text"
                                      value={titikTemuAddress[m.id] || ""}
                                      onChange={(e) =>
                                        handleTanggalChange(m.id, "titikTemu", e.target.value)
                                      }
                                      placeholder="Contoh: Bandara Juanda T1"
                                      className="w-full bg-brand-900/30 border border-brand-500/50 text-white text-sm rounded-xl p-3 focus:border-brand-500 transition-colors outline-none placeholder-gray-500 focus:bg-black/50"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                                    Opsi Layanan
                                  </label>
                                  <div className="flex bg-black/50 border border-gray-800 rounded-xl p-1.5 w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRentalType((prev) => ({
                                          ...prev,
                                          [m.id]: "Lepas Kunci",
                                        }))
                                      }
                                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                                        rentalType[m.id] === "Lepas Kunci" || !rentalType[m.id]
                                          ? "bg-brand-600 text-white shadow-lg"
                                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                                      }`}
                                    >
                                      Lepas Kunci
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRentalType((prev) => ({
                                          ...prev,
                                          [m.id]: "Driver",
                                        }))
                                      }
                                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                                        rentalType[m.id] === "Driver"
                                          ? "bg-brand-600 text-white shadow-lg"
                                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                                      }`}
                                    >
                                      Driver (250k)
                                    </button>
                                  </div>
                                </div>
                            </div>

                            {tanggalMulai[m.id] && tanggalSelesai[m.id] ? (
                              <div className="bg-brand-900/20 border border-brand-500/30 rounded-xl p-4 mt-2">
                                <p className="text-xs tracking-wider text-brand-400 mb-1 font-bold uppercase">Estimasi Total</p>
                                <p className="text-white font-black text-xl mb-1">
                                  Rp{" "}
                                  {(() => {
                                    const durasi = Math.ceil(
                                      (new Date(tanggalSelesai[m.id]) -
                                        new Date(tanggalMulai[m.id])) /
                                        (1000 * 60 * 60 * 24)
                                    );
                                    if (durasi <= 0) return "0";
                                    let total = durasi * m.harga;
                                    if ((rentalType[m.id] || "Lepas Kunci") === "Driver") {
                                      total += 250000;
                                    }
                                    return total.toLocaleString();
                                  })()}
                                </p>
                                {(rentalType[m.id] || "Lepas Kunci") === "Driver" ? (
                                  <p className="text-xs text-gray-400 font-medium">
                                    Termasuk jasa supir Rp 250rb
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-500">&nbsp;</p>
                                )}
                              </div>
                            ) : (
                               <div className="h-[84px] flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800 border-dashed mt-2">
                                  <p className="text-sm text-gray-600 font-medium">Isi tanggal untuk estimasi harga</p>
                               </div>
                            )}

                            <button
                              className="w-full btn-brand py-3.5 mt-2 rounded-xl text-center flex items-center justify-center gap-2"
                              onClick={() => handleSewa(m)}
                            >
                              <Car size={18} /> Ajukan Sewa
                            </button>
                          </div>
                        );
                      }

                      if (statusLower === "disewa") {
                        return (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-900 rounded-full mb-3">
                              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div className="text-red-400 text-base font-semibold">
                              Mobil sedang disewa
                            </div>
                            <div className="text-gray-400 text-sm mt-1">Cek kembali nanti</div>
                          </div>
                        );
                      }

                      if (statusLower === "servis") {
                        return (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-900 rounded-full mb-3">
                              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="text-yellow-400 text-base font-semibold">
                              Sedang dalam perawatan
                            </div>
                            <div className="text-gray-400 text-sm mt-1">
                              Akan tersedia segera
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Payment Method Popups */}
      {showPaymentPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
          <div className="glass-card bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-sm relative animate-popIn shadow-2xl">
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-brand-600 transition-colors"
            >
              ×
            </button>
            <h3 className="text-xl font-bold text-white mb-6 text-center border-b border-gray-800 pb-4">
              Instruksi {selectedPaymentMethod === "Transfer Bank" ? "Transfer Bank" : "E-Wallet"}
            </h3>
            <div className="text-center">
              <div className="bg-white p-2 rounded-2xl inline-block shadow-lg mb-6">
                 <img
                   src={selectedPaymentMethod === "Transfer Bank" ? "/src/assets/tfbank.png" : "/src/assets/qris.png"}
                   alt={selectedPaymentMethod === "Transfer Bank" ? "Transfer Bank" : "QRIS"}
                   className="w-full max-w-[200px] h-auto object-contain mx-auto rounded-xl"
                   onError={(e) => {
                     e.target.onerror = null; 
                     e.target.src = "https://via.placeholder.com/200?text=Gambar+Tidak+Tersedia"
                   }}
                 />
              </div>
              <p className="text-gray-300 font-medium">
                {selectedPaymentMethod === "Transfer Bank"
                  ? "Silakan lakukan transfer sesuai nominal ke rekening yang tertera di layar."
                  : "Silakan scan kode QRIS ini menggunakan aplikasi E-Wallet Anda."
                }
              </p>
              <button 
                onClick={() => setShowPaymentPopup(false)}
                className="w-full mt-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors"
              >
                Saya Sudah Membayar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
