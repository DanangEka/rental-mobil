import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import axios from "axios";
import jsPDF from "jspdf";
import { Search, Filter, RefreshCw, Download, Eye, CheckCircle, XCircle, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { Edit } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";

export default function ManajemenPesanan() {
  const [pemesanan, setPemesanan] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterRentalType, setFilterRentalType] = useState("semua");
  const [searchPemesanan, setSearchPemesanan] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [showEditRequests, setShowEditRequests] = useState(true);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch users:", error);
    }
  };

  const checkAdmin = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Anda belum login.");
      setLoading(false);
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims.admin === true) {
        setIsAdmin(true);
        fetchUsers();
      } else {
        alert("Akun ini bukan admin.");
      }
    } catch (error) {
      console.error("Error verifikasi admin:", error.message);
      alert("Gagal memverifikasi hak akses.");
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, "pemesanan"), (snapshot) => {
      const pemesananData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      pemesananData.sort((a, b) => {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
        return dateB - dateA;
      });
      setPemesanan(pemesananData);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleStatus = async (id, status, mobilId) => {
    const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
    const pemesananData = pemesananDoc.data();
    const userId = pemesananData.uid;

    await updateDoc(doc(db, "pemesanan", id), { status });
    if (status === "disetujui") {
      const dpAmount = Math.ceil(pemesananData.perkiraanHarga * 0.5);
      await updateDoc(doc(db, "pemesanan", id), {
        status: "menunggu pembayaran",
        dpAmount: dpAmount,
        paymentStatus: "pending"
      });
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: false, status: "disewa" });
      // Send notification
      await addDoc(collection(db, "notifications"), {
        userId,
        message: `Pemesanan mobil ${pemesananData.namaMobil} telah disetujui. Silakan lakukan pembayaran DP sebesar Rp ${dpAmount.toLocaleString()}.`,
        read: false,
        timestamp: serverTimestamp()
      });
    } else if (status === "ditolak") {
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });
      // Send notification
      await addDoc(collection(db, "notifications"), {
        userId,
        message: `Pemesanan mobil ${pemesananData.namaMobil} telah ditolak.`,
        read: false,
        timestamp: serverTimestamp()
      });
    } else if (status === "selesai") {
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });
      // Send notification
      await addDoc(collection(db, "notifications"), {
        userId,
        message: `Pemesanan mobil ${pemesananData.namaMobil} telah selesai. Terima kasih telah menggunakan layanan kami.`,
        read: false,
        timestamp: serverTimestamp()
      });
    }
  };

  const handleMarkAsLunas = async (id, mobilId) => {
    const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
    const pemesananData = pemesananDoc.data();
    const userId = pemesananData.uid;

    // Mark order as fully paid (Lunas)
    await updateDoc(doc(db, "pemesanan", id), {
      status: "lunas",
      paymentStatus: "fully_paid",
      lunasAt: new Date().toISOString()
    });

    // Make car available again
    await updateDoc(doc(db, "mobil", mobilId), {
      tersedia: true,
      status: "normal"
    });

    // Send notification to user
    await addDoc(collection(db, "notifications"), {
      userId,
      message: `Pemesanan mobil ${pemesananData.namaMobil} telah lunas (pembayaran penuh). Terima kasih telah menggunakan layanan kami.`,
      read: false,
      timestamp: serverTimestamp()
    });

    // Send notification to admin
    await addDoc(collection(db, "notifications"), {
      userId: "admin",
      message: `Order ${pemesananData.namaMobil} telah lunas - ${pemesananData.email}`,
      read: false,
      timestamp: serverTimestamp()
    });
  };

  const handleBalancePaymentApproval = async (id, status) => {
    const orderDoc = await getDoc(doc(db, "pemesanan", id));
    const order = { id, ...orderDoc.data() };

    if (status === "approved") {
      // Approve the balance payment
      await updateDoc(doc(db, "pemesanan", id), {
        status: "lunas",
        paymentStatus: "fully_paid",
        balancePaymentRequest: {
          ...order.balancePaymentRequest,
          status: "approved",
          approvedAt: new Date().toISOString()
        },
        lunasAt: new Date().toISOString()
      });

      // Make car available again
      await updateDoc(doc(db, "mobil", order.mobilId), {
        tersedia: true,
        status: "normal"
      });

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Pembayaran pelunasan untuk mobil ${order.namaMobil} telah dikonfirmasi. Order telah lunas. Terima kasih telah menggunakan layanan kami.`,
        read: false,
        timestamp: serverTimestamp()
      });

      // Send notification to admin
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        message: `Balance payment approved: ${order.namaMobil} - ${order.email} - ${order.balancePaymentRequest.paymentMethod}`,
        read: false,
        timestamp: serverTimestamp()
      });
    } else {
      // Reject the balance payment
      await updateDoc(doc(db, "pemesanan", id), {
        balancePaymentRequest: {
          ...order.balancePaymentRequest,
          status: "rejected",
          rejectedAt: new Date().toISOString()
        }
      });

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Pembayaran pelunasan untuk mobil ${order.namaMobil} telah ditolak. Silakan hubungi admin untuk informasi lebih lanjut.`,
        read: false,
        timestamp: serverTimestamp()
      });

      // Send notification to admin
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        message: `Balance payment rejected: ${order.namaMobil} - ${order.email} - ${order.balancePaymentRequest.paymentMethod}`,
        read: false,
        timestamp: serverTimestamp()
      });
    }
  };

  const handlePaymentApproval = async (id, status) => {
    const orderDoc = await getDoc(doc(db, "pemesanan", id));
    const order = { id, ...orderDoc.data() };

    await updateDoc(doc(db, "pemesanan", id), {
      status: status,
      paymentStatus: "completed"
    });

    // Send notification
    await addDoc(collection(db, "notifications"), {
      userId: order.uid,
      message: `Pembayaran untuk pemesanan mobil ${order.namaMobil} telah dikonfirmasi. Pemesanan Anda siap untuk digunakan.`,
      read: false,
      timestamp: serverTimestamp()
    });

    try {
      await axios.post('/api/payment-success', order);
    } catch (err) {
      console.error('Error calling payment success API:', err);
    }
  };

  const handleCashRentalApproval = async (id, status) => {
    const orderDoc = await getDoc(doc(db, "pemesanan", id));
    const order = { id, ...orderDoc.data() };

    if (status === "approved") {
      // Approve the cash rental
      await updateDoc(doc(db, "pemesanan", id), {
        status: "approve sewa",
        paymentStatus: "cash_approved",
        approvedAt: new Date().toISOString()
      });

      // Update car status to rented
      await updateDoc(doc(db, "mobil", order.mobilId), {
        tersedia: false,
        status: "disewa"
      });

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Permintaan sewa cash untuk mobil ${order.namaMobil} telah disetujui. Mobil siap untuk diambil.`,
        read: false,
        timestamp: serverTimestamp()
      });

      // Send notification to admin about driver assignment
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        message: `Sewa cash disetujui: ${order.namaMobil} - ${order.email}. Siap untuk ditugaskan ke driver.`,
        read: false,
        timestamp: serverTimestamp()
      });
    } else {
      // Reject the cash rental
      await updateDoc(doc(db, "pemesanan", id), {
        status: "ditolak",
        paymentStatus: "cash_rejected",
        rejectedAt: new Date().toISOString()
      });

      // Update car status back to available
      await updateDoc(doc(db, "mobil", order.mobilId), {
        tersedia: true,
        status: "tersedia"
      });

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Permintaan sewa cash untuk mobil ${order.namaMobil} telah ditolak.`,
        read: false,
        timestamp: serverTimestamp()
      });
    }
  };

  const handleEditRequestApproval = async (id, status) => {
    const orderDoc = await getDoc(doc(db, "pemesanan", id));
    const order = { id, ...orderDoc.data() };

    if (status === "approved") {
      // Apply the edit request
      await updateDoc(doc(db, "pemesanan", id), {
        tanggalMulai: order.editRequest.tanggalMulai,
        tanggalSelesai: order.editRequest.tanggalSelesai,
        durasiHari: order.editRequest.durasiHari,
        perkiraanHarga: order.editRequest.perkiraanHarga,
        editRequest: {
          ...order.editRequest,
          status: "approved",
          approvedAt: new Date().toISOString()
        }
      });

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Permintaan edit tanggal untuk pemesanan mobil ${order.namaMobil} telah disetujui. Tanggal sewa telah diubah.`,
        read: false,
        timestamp: serverTimestamp()
      });
    } else {
      // Reject the edit request
      await updateDoc(doc(db, "pemesanan", id), {
        editRequest: {
          ...order.editRequest,
          status: "rejected",
          rejectedAt: new Date().toISOString()
        }
      });

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Permintaan edit tanggal untuk pemesanan mobil ${order.namaMobil} telah ditolak.`,
        read: false,
        timestamp: serverTimestamp()
      });
    }
  };

  const generateInvoicePDF = (order, user, type = "full") => {
    if (type === "dp") {
      InvoiceGenerator.generateDPInvoice(order, user);
    } else {
      InvoiceGenerator.generateFullInvoice(order, user);
    }
  };

  // Enhanced filtering and sorting
  const filteredPemesanan = pemesanan
    .filter(p => {
      const user = users.find(u => u.id === p.uid);
      const matchesStatus = filterStatus === "semua" || p.status === filterStatus;
      const matchesRentalType = filterRentalType === "semua" || p.rentalType === filterRentalType;
      const matchesSearch = searchPemesanan === "" ||
        p.namaMobil?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        user?.nama?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        user?.nomorTelepon?.includes(searchPemesanan) ||
        p.status?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.rentalType?.toLowerCase().includes(searchPemesanan.toLowerCase());
      return matchesStatus && matchesRentalType && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
          const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
          return dateB - dateA;
        case "oldest":
          const dateA2 = a.tanggal ? new Date(a.tanggal) : new Date(0);
          const dateB2 = b.tanggal ? new Date(b.tanggal) : new Date(0);
          return dateA2 - dateB2;
        case "price-high":
          return (b.perkiraanHarga || 0) - (a.perkiraanHarga || 0);
        case "price-low":
          return (a.perkiraanHarga || 0) - (b.perkiraanHarga || 0);
        default:
          return 0;
      }
    });

  const handleRefresh = async () => {
    setRefreshing(true);
    // The onSnapshot will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-lg text-gray-600">Memuat data pesanan...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 font-semibold text-lg">Akses Ditolak</p>
            <p className="text-gray-600">Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
      <section className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manajemen Pesanan</h1>
              <p className="text-gray-600 text-sm sm:text-base">Kelola pemesanan dan status pembayaran</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-4 sm:mt-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Memperbarui...' : 'Perbarui'}
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <div className="bg-blue-50 p-4 sm:p-6 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-blue-900">Total Pesanan</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{filteredPemesanan.length}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 sm:p-6 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-green-900">Disetujui</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">
                    {filteredPemesanan.filter(p => p.status === "disetujui" || p.status === "pembayaran berhasil").length}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 sm:p-6 rounded-xl border border-yellow-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-yellow-900">Diproses</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                    {filteredPemesanan.filter(p => p.status === "diproses").length}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-4 sm:p-6 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-red-900">Ditolak</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600">
                    {filteredPemesanan.filter(p => p.status === "ditolak").length}
                  </p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 p-4 sm:p-6 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-emerald-900">Lunas</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                    {filteredPemesanan.filter(p => p.status === "lunas").length}
                  </p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Filter & Pencarian</h3>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="price-high">Harga Tertinggi</option>
                <option value="price-low">Harga Terendah</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="semua">Semua Status</option>
                <option value="diproses">Diproses</option>
                <option value="disetujui">Disetujui</option>
                <option value="menunggu pembayaran">Menunggu Pembayaran</option>
                <option value="pembayaran berhasil">Pembayaran Berhasil</option>
                <option value="selesai">Selesai</option>
                <option value="lunas">Lunas</option>
                <option value="ditolak">Ditolak</option>
                <option value="balance_pending">Menunggu Pelunasan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Tipe Sewa</label>
              <select
                value={filterRentalType}
                onChange={(e) => setFilterRentalType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="semua">Semua Tipe</option>
                <option value="Lepas Kunci">Lepas Kunci</option>
                <option value="Driver">Driver</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari Pesanan</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari berdasarkan mobil, email, status..."
                  value={searchPemesanan}
                  onChange={(e) => setSearchPemesanan(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List Pesanan */}
        <div className="space-y-4 sm:space-y-6">
          {filteredPemesanan.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">
                {pemesanan.length === 0 ? "Belum ada pemesanan" : "Tidak ada pemesanan yang sesuai filter"}
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {pemesanan.length === 0 ? "Pemesanan akan muncul di sini" : "Coba ubah filter atau pencarian"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan {filteredPemesanan.length} dari {pemesanan.length} pemesanan
                </p>
              </div>
              {filteredPemesanan.map((p) => {
              const user = users.find(u => u.id === p.uid);
              return (
                <div key={p.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Mobil</span>
                      <p className="text-lg font-semibold text-gray-900">{p.namaMobil}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Nama Client</span>
                      <p className="text-gray-900">{user?.nama || p.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Tanggal Pesan</span>
                      <p className="text-gray-900">
                        Dari {p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleString() : 'N/A'}<br />
                        Sampai {p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Nomor Telepon</span>
                      <p className="text-gray-900">{user?.nomorTelepon || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Tipe Sewa</span>
                      <p className="text-gray-900">{p.rentalType || "Lepas Kunci"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Tanggal Pemesanan</span>
                      <p className="text-gray-900">{new Date(p.tanggal).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Biaya</span>
                      <p className="text-xl font-bold text-green-600">Rp {p.perkiraanHarga?.toLocaleString()}</p>
                    </div>
                    {p.dpAmount && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">DP 50%</span>
                        <p className="text-lg font-semibold text-blue-600">Rp {p.dpAmount.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status</span>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        p.status === 'diproses' ? 'bg-yellow-100 text-yellow-800' :
                        p.status === 'disetujui' ? 'bg-green-100 text-green-800' :
                        p.status === 'approve sewa' ? 'bg-purple-100 text-purple-800' :
                        p.status === 'menunggu pembayaran' ? 'bg-orange-100 text-orange-800' :
                        p.status === 'pembayaran berhasil' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'selesai' ? 'bg-purple-100 text-purple-800' :
                        p.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'ditolak' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {p.paymentMethod && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500">Metode Pembayaran</span>
                      <p className="text-gray-900">{p.paymentMethod}</p>
                    </div>
                  )}

                  {/* Edit Request */}
                  {p.editRequest && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Permintaan Edit Tanggal</span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          p.editRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          p.editRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {p.editRequest.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Tanggal Baru:</span>
                          <p className="text-gray-900">
                            {new Date(p.editRequest.tanggalMulai).toLocaleDateString()} - {new Date(p.editRequest.tanggalSelesai).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Harga Baru:</span>
                          <p className="text-gray-900">Rp {p.editRequest.perkiraanHarga?.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Diminta pada: {new Date(p.editRequest.requestedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Bukti Pembayaran */}
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-500">Bukti Pembayaran</span>
                    {p.paymentProof ? (
                      <div className="mt-2">
                        <a
                          href={p.paymentProof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline block mb-2"
                        >
                          Lihat Bukti (klik untuk membuka di tab baru)
                        </a>
                        <img
                          src={p.paymentProof}
                          alt="Bukti Pembayaran"
                          className="w-48 rounded-lg shadow-md border"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Belum ada bukti pembayaran</p>
                    )}
                  </div>

                  {/* Balance Payment Request */}
                  {p.balancePaymentRequest && (
                    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Permintaan Pembayaran Pelunasan</span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          p.balancePaymentRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          p.balancePaymentRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {p.balancePaymentRequest.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Metode Pembayaran:</span>
                          <p className="text-gray-900">{p.balancePaymentRequest.paymentMethod}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Jumlah:</span>
                          <p className="text-gray-900">Rp {p.balancePaymentRequest.amount?.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Diminta pada: {new Date(p.balancePaymentRequest.requestedAt).toLocaleString()}
                      </p>

                      {/* Balance Payment Proof */}
                      {p.balancePaymentRequest.paymentProof && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-gray-700">Bukti Pembayaran Pelunasan:</span>
                          <a
                            href={p.balancePaymentRequest.paymentProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline block mb-2"
                          >
                            Lihat Bukti (klik untuk membuka di tab baru)
                          </a>
                          <img
                            src={p.balancePaymentRequest.paymentProof}
                            alt="Bukti Pembayaran Pelunasan"
                            className="w-48 rounded-lg shadow-md border"
                          />
                        </div>
                      )}

                      {/* Approval Buttons for Pending Balance Payments */}
                      {p.balancePaymentRequest.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleBalancePaymentApproval(p.id, "approved")}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Setujui Pelunasan
                          </button>
                          <button
                            onClick={() => handleBalancePaymentApproval(p.id, "rejected")}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Tolak Pelunasan
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {/* Edit Request Approval */}
                    {p.editRequest && p.editRequest.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleEditRequestApproval(p.id, "approved")}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Setujui Edit
                        </button>
                        <button
                          onClick={() => handleEditRequestApproval(p.id, "rejected")}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Tolak Edit
                        </button>
                      </>
                    )}

                    {/* Cash Rental Approval */}
                    {p.paymentStatus === "pending_approval" && p.paymentMethod === "Cash" && (
                      <>
                        <button
                          onClick={() => handleCashRentalApproval(p.id, "approved")}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Approve Sewa
                        </button>
                        <button
                          onClick={() => handleCashRentalApproval(p.id, "rejected")}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Tolak Sewa
                        </button>
                      </>
                    )}

                    {/* Regular Order Actions */}
                    {p.status === "diproses" && (
                      <>
                        <button
                          onClick={() => handleStatus(p.id, "disetujui", p.mobilId)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleStatus(p.id, "ditolak", p.mobilId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                    {p.status === "menunggu pembayaran" && (
                      <>
                        <button
                          onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Konfirmasi Pembayaran
                        </button>
                        <button
                          onClick={() => handleStatus(p.id, "ditolak", p.mobilId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                    {p.status === "pembayaran berhasil" && (
                      <>
                        <button
                          onClick={() => generateInvoicePDF(p, user, "dp")}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Invoice DP (50%)
                        </button>
                        <button
                          onClick={() => handleStatus(p.id, "selesai", p.mobilId)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          Selesai
                        </button>
                      </>
                    )}
                    {p.status === "selesai" && (
                      <>
                        <button
                          onClick={() => generateInvoicePDF(p, user, "full")}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                        >
                          Invoice Pembayaran Penuh
                        </button>
                        <button
                          onClick={() => handleMarkAsLunas(p.id, p.mobilId)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          <DollarSign size={16} />
                          Tandai Lunas
                        </button>
                      </>
                    )}
                    {p.status === "disetujui" && (
                      <>
                        <button
                          onClick={() => handleStatus(p.id, "selesai", p.mobilId)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          Selesai
                        </button>
                      </>
                    )}
                    {p.status === "approve sewa" && (
                      <>
                        <button
                          onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Konfirmasi Pembayaran
                        </button>
                        <button
                          onClick={() => handleStatus(p.id, "ditolak", p.mobilId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleStatus(p.id, "selesai", p.mobilId)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          Selesai
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
