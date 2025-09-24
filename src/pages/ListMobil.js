import { collection, doc, updateDoc, addDoc, query, where, onSnapshot, getDoc, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../services/firebase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Car, MapPin, Calendar, Users, Fuel, Settings, Search, Filter, RefreshCw, Star } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";

export default function ListMobil() {
  const navigate = useNavigate();
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
      alert("Silakan login terlebih dahulu.");
      return;
    }

    // Check verification status
    if (userData?.verificationStatus !== "verified") {
      alert("Akun Anda belum diverifikasi. Silakan upload KTP di halaman profil untuk verifikasi terlebih dahulu.");
      return;
    }

    const existingOrder = getUserOrderForCar(m.id);
    if (
      existingOrder &&
      ["diproses", "disetujui", "approved", "menunggu pembayaran"].includes(
        existingOrder.status?.toLowerCase()
      )
    ) {
      alert("Anda sudah memiliki pemesanan aktif untuk mobil ini.");
      return;
    }

    const mulai = tanggalMulai[m.id];
    const selesai = tanggalSelesai[m.id];

    if (!mulai || !selesai) {
      alert("Pilih tanggal mulai dan selesai terlebih dahulu.");
      return;
    }

    const start = new Date(mulai);
    const end = new Date(selesai);
    const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (durasiHari <= 0) {
      alert("Tanggal selesai harus setelah tanggal mulai.");
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
    } catch (err) {
      console.error("Gagal menyewa:", err);
      alert("Terjadi kesalahan saat menyewa. Error: " + err.message);
    }
  };

  const handlePaymentSubmit = async (order) => {
    if (!paymentMethod[order.id] && !order.paymentMethod) {
      alert("Silakan pilih metode pembayaran.");
      return;
    }
    if (!paymentProof[order.id]) {
      alert("Silakan unggah bukti pembayaran.");
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
    } catch (err) {
      console.error("Gagal mengirim bukti pembayaran:", err);
      alert("Terjadi kesalahan saat mengirim bukti pembayaran. Error: " + err.message);
    }
  };

  const handleCashPayment = async (order) => {
    const selectedPaymentMethod = paymentMethod[order.id] || order.paymentMethod;

    if (!selectedPaymentMethod) {
      alert("Silakan pilih metode pembayaran.");
      return;
    }

    if (selectedPaymentMethod !== "Cash") {
      alert("Metode pembayaran harus Cash untuk menggunakan fitur ini.");
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
    } catch (err) {
      console.error("Gagal mengajukan pembayaran cash:", err);
      alert("Terjadi kesalahan saat mengajukan pembayaran cash. Error: " + err.message);
    }
  };



  return (
    <div
      className={`min-h-screen bg-black ${mobil.length > 0 ? "pb-20" : ""}`}
    >
      <div className="bg-red-900 text-white px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Sewa Mobil Terbaik
          </h1>
          <p className="text-base md:text-lg lg:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            Pilih mobil impian Anda dengan harga terjangkau dan layanan profesional
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-12 lg:px-8">
        {/* Search and Filter Section */}
        <div className="mb-8 bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-semibold text-white mb-2 sm:mb-0">Cari & Filter Mobil</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Memperbarui...' : 'Perbarui'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Cari Mobil</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, merek, tahun..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="name">Nama (A-Z)</option>
                <option value="price-low">Harga Terendah</option>
                <option value="price-high">Harga Tertinggi</option>
                <option value="year-new">Tahun Terbaru</option>
                <option value="year-old">Tahun Terlama</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="semua">Semua Status</option>
                <option value="tersedia">Tersedia</option>
                <option value="disewa">Disewa</option>
                <option value="servis">Servis</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-900 p-4 rounded-xl border border-green-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-green-300">Tersedia</h3>
                  <p className="text-2xl font-bold text-green-400">
                    {filteredMobil.filter(m => m.tersedia === true || m.status === "tersedia").length}
                  </p>
                </div>
                <div className="p-2 bg-green-800 rounded-lg">
                  <Car className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-red-900 p-4 rounded-xl border border-red-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-red-300">Disewa</h3>
                  <p className="text-2xl font-bold text-red-400">
                    {filteredMobil.filter(m => m.status === "disewa" || m.tersedia === false).length}
                  </p>
                </div>
                <div className="p-2 bg-red-800 rounded-lg">
                  <Users className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-yellow-900 p-4 rounded-xl border border-yellow-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-yellow-300">Servis</h3>
                  <p className="text-2xl font-bold text-yellow-400">
                    {filteredMobil.filter(m => m.status === "servis").length}
                  </p>
                </div>
                <div className="p-2 bg-yellow-800 rounded-lg">
                  <Settings className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="bg-blue-900 p-4 rounded-xl border border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-blue-300">Total</h3>
                  <p className="text-2xl font-bold text-blue-400">{filteredMobil.length}</p>
                </div>
                <div className="p-2 bg-blue-800 rounded-lg">
                  <Car className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {filteredMobil.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="text-gray-300 text-xl md:text-2xl font-medium">
              Tidak ada mobil tersedia saat ini
            </div>
            <p className="text-gray-400 mt-2">Silakan kembali lagi nanti</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-8 md:gap-10 lg:gap-12">
            {filteredMobil.map((m) => {
              const statusLower = m.status?.toLowerCase();
              const order = getUserOrderForCar(m.id);
              const orderStatus = order?.status?.toLowerCase();

              return (
                <div
                  key={m.id}
                  className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 border border-gray-800 hover:border-red-600"
                >
                  <div className="relative aspect-video bg-gray-800">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                        ["servis", "service", "maintenance"].includes(statusLower)
                          ? "bg-yellow-500 text-yellow-900"
                          : ["disewa", "rented", "booked"].includes(statusLower)
                          ? "bg-red-600 text-white"
                          : "bg-green-600 text-white"
                      }`}
                    >
                      {["servis", "service", "maintenance"].includes(statusLower)
                        ? "Servis"
                        : ["disewa", "rented", "booked"].includes(statusLower)
                        ? "Disewa"
                        : "Tersedia"}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{m.nama}</h3>
                    <p className="text-red-400 font-bold text-lg mb-4">
                      Rp {m.harga.toLocaleString()}{" "}
                      <span className="text-gray-400 text-sm font-normal">/ hari</span>
                    </p>

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
    <div className="space-y-4">
      <div className="text-center bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-green-400 text-base font-semibold">
          Pesanan Disetujui
        </div>
        <div className="text-gray-300 text-sm mt-1">
          Silakan lakukan pembayaran DP untuk melanjutkan
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-300 font-medium block mb-2">
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
          className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
        >
          <option value="">Pilih Metode</option>
          <option value="Transfer Bank">Transfer Bank</option>
          <option value="E-Wallet">E-Wallet</option>
          <option value="Cash">Cash</option>
        </select>
      </div>
      {/* Hide upload field for cash payments */}
      {((paymentMethod[order.id] || order.paymentMethod) !== "Cash") && (
        <div>
          <label className="text-sm text-gray-300 font-medium block mb-2">
            Bukti Pembayaran
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setPaymentProof((prev) => ({
                ...prev,
                [order.id]: e.target.files[0],
              }))
            }
            className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-600 file:text-white hover:file:bg-red-700 transition-colors"
          />
        </div>
      )}
      <button
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
        onClick={() => {
          if ((paymentMethod[order.id] || order.paymentMethod) === "Cash") {
            handleCashPayment(order);
          } else {
            handlePaymentSubmit(order);
          }
        }}
      >
        {(paymentMethod[order.id] || order.paymentMethod) === "Cash" ? "Ajukan Sewa" : "Kirim Bukti Pembayaran"}
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
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Tanggal Mulai
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={tanggalMulai[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "mulai", e.target.value)
                                    }
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Tanggal Selesai
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={tanggalSelesai[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "selesai", e.target.value)
                                    }
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Lokasi Penyerahan Unit
                                  </label>
                                  <select
                                    value={lokasiPenyerahan[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "lokasi", e.target.value)
                                    }
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                  >
                                    <option value="">Pilih Lokasi Penyerahan</option>
                                    <option value="Rumah">Rumah</option>
                                    <option value="Kantor">Kantor</option>
                                    <option value="Titik Temu">Titik Temu</option>
                                  </select>
                                </div>
                                {lokasiPenyerahan[m.id] === "Titik Temu" && (
                                  <div>
                                    <label className="text-sm text-red-400 font-medium block mb-2">
                                      Alamat Titik Temu
                                    </label>
                                    <input
                                      type="text"
                                      value={titikTemuAddress[m.id] || ""}
                                      onChange={(e) =>
                                        handleTanggalChange(m.id, "titikTemu", e.target.value)
                                      }
                                      placeholder="Masukkan alamat titik temu"
                                      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Tipe Sewa
                                  </label>
                                  <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRentalType((prev) => ({
                                          ...prev,
                                          [m.id]: "Lepas Kunci",
                                        }))
                                      }
                                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                        rentalType[m.id] === "Lepas Kunci" || !rentalType[m.id]
                                          ? "bg-red-600 text-white shadow-md"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
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
                                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                        rentalType[m.id] === "Driver"
                                          ? "bg-red-600 text-white shadow-md"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                      }`}
                                    >
                                      Driver
                                    </button>
                                  </div>
                                </div>
                            </div>

                            {tanggalMulai[m.id] && tanggalSelesai[m.id] && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-2 font-medium">Estimasi Biaya</p>
                                <p className="text-green-600 font-bold text-lg">
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
                                {(rentalType[m.id] || "Lepas Kunci") === "Driver" && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Termasuk biaya driver: Rp 250.000
                                  </p>
                                )}
                              </div>
                            )}

                            <button
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                              onClick={() => handleSewa(m)}
                            >
                              Sewa Sekarang
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 relative">
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              {selectedPaymentMethod === "Transfer Bank" ? "Transfer Bank" : "E-Wallet"}
            </h3>
            <div className="text-center">
              <img
                src={selectedPaymentMethod === "Transfer Bank" ? "/src/assets/tfbank.png" : "/src/assets/qris.png"}
                alt={selectedPaymentMethod === "Transfer Bank" ? "Transfer Bank" : "QRIS"}
                className="w-full max-w-xs mx-auto rounded-lg shadow-md"
              />
              <p className="text-gray-600 mt-4 text-sm">
                {selectedPaymentMethod === "Transfer Bank"
                  ? "Silakan transfer ke rekening yang tertera di gambar"
                  : "Scan QRIS untuk melakukan pembayaran"
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
