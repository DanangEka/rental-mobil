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
import { Search, Filter, RefreshCw, Download, Eye, CheckCircle, XCircle, Clock, AlertTriangle, DollarSign, Car } from "lucide-react";
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
      let matchesStatus = filterStatus === "semua" || p.status === filterStatus;

      // Special handling for balance_pending filter
      if (filterStatus === "balance_pending") {
        matchesStatus = p.balancePaymentRequest && p.balancePaymentRequest.status === "pending";
      }

      const matchesRentalType = filterRentalType === "semua" || p.rentalType === filterRentalType;
      const matchesSearch = searchPemesanan === "" ||
        p.namaMobil?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        user?.nama?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        user?.nomorTelepon?.includes(searchPemesanan) ||
        p.status?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.rentalType?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.lokasiPenyerahan?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.titikTemuAddress?.toLowerCase().includes(searchPemesanan.toLowerCase());
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
      <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-lg text-gray-600">Memuat data pesanan...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center py-8 md:py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 font-semibold text-lg">Akses Ditolak</p>
            <p className="text-gray-600">Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[5%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[5%] w-[45vw] h-[45vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-6 md:mb-10 pt-8 animate-fadeInUp">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Manajemen Pesanan</h1>
              <p className="text-gray-400 text-lg">Kelola ekosistem penyewaan dan monitor transaksi harian.</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 border border-gray-700 text-white px-4 md:px-6 py-3 rounded-2xl transition-all font-bold shadow-lg"
            >
              <RefreshCw size={18} className={`text-brand-400 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Memperbarui...' : 'Perbarui Data'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-10 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pesanan</p>
                <p className="text-2xl md:text-3xl font-black text-white">{filteredPemesanan.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                <Clock size={24} />
              </div>
            </div>
          </div>
          
          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-green-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Disetujui</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {filteredPemesanan.filter(p => p.status === "disetujui" || p.status === "pembayaran berhasil").length}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-2xl text-green-400">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-yellow-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Diproses</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {filteredPemesanan.filter(p => p.status === "diproses").length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-2xl text-yellow-400">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-red-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ditolak</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                   {filteredPemesanan.filter(p => p.status === "ditolak").length}
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-2xl text-red-400">
                <XCircle size={24} />
              </div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lunas</p>
                <p className="text-2xl md:text-3xl font-black text-white">
                   {filteredPemesanan.filter(p => p.status === "lunas").length}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                <DollarSign size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 md:mb-10 glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-gray-800 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Filter size={20} className="text-brand-400" />
              Filter Dinamis
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Urutkan</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="price-high">Harga Tertinggi</option>
                <option value="price-low">Harga Terendah</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Status Transaksi</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-gray-950/50 text-gray-300 border border-gray-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
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
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Kategori Sewa</label>
              <select
                value={filterRentalType}
                onChange={(e) => setFilterRentalType(e.target.value)}
                className="w-full bg-gray-950/50 text-gray-300 border border-gray-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              >
                <option value="semua">Semua Tipe</option>
                <option value="Lepas Kunci">Lepas Kunci</option>
                <option value="Driver">Driver</option>
              </select>
            </div>

            <div className="md:col-span-1 lg:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Cari Data</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari mobil, email, lokasi, atau ID..."
                  value={searchPemesanan}
                  onChange={(e) => setSearchPemesanan(e.target.value)}
                  className="w-full bg-gray-950/50 text-white border border-gray-800 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="space-y-6 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
          {filteredPemesanan.length === 0 ? (
            <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-20 text-center border border-gray-800">
               <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={28} className="text-gray-600" />
               </div>
               <p className="text-gray-400 font-medium">Tidak ada data pesanan yang ditemukan</p>
            </div>
          ) : (
            <>
              {filteredPemesanan.map((p, idx) => {
                const user = users.find(u => u.id === p.uid);
                return (
                  <div key={p.id} className="glass-card bg-gray-900/40 rounded-[2rem] border border-gray-800 overflow-hidden hover:border-brand-500/30 transition-all group">
                    <div className="p-4 sm:p-6 md:p-8">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8 pb-6 border-b border-gray-800/50">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-500/20 shadow-brand-sm">
                               <Car size={30} />
                            </div>
                            <div>
                               <h4 className="text-2xl font-black text-white tracking-tight">{p.namaMobil}</h4>
                               <p className="text-gray-500 text-sm font-semibold">{user?.nama || p.email} • {p.rentalType || "Lepas Kunci"}</p>
                            </div>
                         </div>
                         <div className="flex flex-wrap gap-3">
                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                              p.status === 'diproses' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                              p.status === 'disetujui' || p.status === 'pembayaran berhasil' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                              p.status === 'selesai' || p.status === 'lunas' ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' :
                              'bg-gray-800/50 border-gray-700 text-gray-400'
                            }`}>
                               {p.status}
                            </span>
                            <span className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-gray-800/50 border border-gray-700 text-gray-400 rounded-full">
                               {new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-6 md:mb-8">
                         <div className="space-y-4">
                            <div>
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Durasi Sewa</p>
                               <div className="text-gray-300 text-sm leading-relaxed">
                                  <p className="font-bold text-white">{p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString() : 'N/A'}</p>
                                  <p className="text-gray-500">sampai</p>
                                  <p className="font-bold text-white">{p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString() : 'N/A'}</p>
                               </div>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <div>
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Kontak Client</p>
                               <p className="text-white font-bold">{user?.nomorTelepon || 'No Phone'}</p>
                               <p className="text-gray-500 text-xs truncate">{p.email}</p>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lokasi Penyerahan</p>
                               <p className="text-white font-bold flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                  {p.lokasiPenyerahan || "Default"}
                               </p>
                               {p.titikTemuAddress && (
                                  <p className="text-gray-500 text-[10px] mt-1 line-clamp-2">📍 {p.titikTemuAddress}</p>
                               )}
                            </div>
                         </div>

                         <div className="space-y-4 text-right">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Estimasi Total</p>
                            <p className="text-2xl md:text-3xl font-black text-brand-400 tracking-tighter">Rp {p.perkiraanHarga?.toLocaleString()}</p>
                            {p.dpAmount && (
                               <p className="text-xs font-bold text-gray-400">DP: <span className="text-blue-400">Rp {p.dpAmount.toLocaleString()}</span></p>
                            )}
                         </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-6 md:mt-8 flex flex-wrap gap-3 pt-6 border-t border-gray-800/50">
                        {p.status === "diproses" && (
                          <>
                            <button
                              onClick={() => handleStatus(p.id, "disetujui", p.mobilId)}
                              className="bg-brand-600 hover:bg-brand-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold transition-all shadow-brand-sm"
                            >
                              Setujui Order
                            </button>
                            <button
                              onClick={() => handleStatus(p.id, "ditolak", p.mobilId)}
                              className="bg-gray-800 hover:bg-red-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold border border-gray-700 transition-all"
                            >
                              Tolak
                            </button>
                          </>
                        )}

                        {p.status === "menunggu konfirmasi lunas" && (
                          <button
                            onClick={() => handleMarkAsLunas(p.id, p.mobilId)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-900/20"
                          >
                            Konfirmasi Pelunasan
                          </button>
                        )}

                        {p.balancePaymentRequest?.status === "pending" && (
                           <div className="flex gap-2">
                              <button
                                onClick={() => handleBalancePaymentApproval(p.id, "approved")}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold"
                              >
                                Setujui Pelunasan
                              </button>
                              <button
                                onClick={() => handleBalancePaymentApproval(p.id, "rejected")}
                                className="bg-red-600 hover:bg-red-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold"
                              >
                                Tolak Pelunasan
                              </button>
                           </div>
                        )}

                        {p.paymentStatus === "pending" && p.paymentProof && p.status === "menunggu pembayaran" && (
                          <button
                            onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold"
                          >
                            Konfirmasi Pembayaran
                          </button>
                        )}

                        {p.rentalType === "Driver" && p.status === "pembayaran berhasil" && (
                           <button
                             onClick={() => handleCashRentalApproval(p.id, "approved")}
                             className="bg-purple-600 hover:bg-purple-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold"
                           >
                             Approve Sewa (Cash/Driver)
                           </button>
                        )}

                        {p.editRequest?.status === "pending" && (
                            <div className="flex gap-2">
                               <button
                                onClick={() => handleEditRequestApproval(p.id, "approved")}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold"
                               >
                                Setujui Edit Tanggal
                               </button>
                               <button
                                onClick={() => handleEditRequestApproval(p.id, "rejected")}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold"
                               >
                                Tolak Edit
                               </button>
                            </div>
                        )}

                        <button
                          onClick={() => generateInvoicePDF(p, user, "full")}
                          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold border border-gray-700 transition-all"
                        >
                          <Download size={16} className="text-brand-400" /> Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
