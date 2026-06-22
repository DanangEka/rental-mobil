import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import axios from "axios";
import { 
  Calendar, 
  Edit, 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  Filter, 
  Check, 
  FileText, 
  CreditCard, 
  Upload, 
  History,
  Search, 
  ChevronRight, 
  MapPin, 
  Car, 
  User, 
  ArrowRight,
  Info
} from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";

export default function HistoryPesanan() {
  const [pemesanan, setPemesanan] = useState([]);
  const [filteredPemesanan, setFilteredPemesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    tanggalMulai: "",
    tanggalSelesai: ""
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState({});
  const [paymentProof, setPaymentProof] = useState({});
  const [showPaymentSection, setShowPaymentSection] = useState({});
  const [showBalancePaymentModal, setShowBalancePaymentModal] = useState(false);
  const [selectedOrderForBalance, setSelectedOrderForBalance] = useState(null);
  const [balancePaymentMethod, setBalancePaymentMethod] = useState("");
  const [balancePaymentProof, setBalancePaymentProof] = useState(null);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        setPemesanan([]);
        return;
      }

      const q = query(
        collection(db, "pemesanan"),
        where("uid", "==", user.uid),
        orderBy("tanggal", "desc")
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const pemesananData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPemesanan(pemesananData);
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error("Firestore snapshot error:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Filter and sort orders
  useEffect(() => {
    let filtered = [...pemesanan];

    // Filter by status
    if (filterStatus !== "all") {
      if (filterStatus === "ongoing") {
        filtered = filtered.filter(p => isOngoingOrder(p.status));
      } else if (filterStatus === "edit_approved") {
        filtered = filtered.filter(p => p.editRequest && p.editRequest.status === 'approved');
      } else {
        filtered = filtered.filter(p => p.status === filterStatus);
      }
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.namaMobil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.platNomor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.tanggal) - new Date(a.tanggal);
        case "oldest":
          return new Date(a.tanggal) - new Date(b.tanggal);
        case "price-high":
          return (b.perkiraanHarga || 0) - (a.perkiraanHarga || 0);
        case "price-low":
          return (a.perkiraanHarga || 0) - (b.perkiraanHarga || 0);
        default:
          return 0;
      }
    });

    setFilteredPemesanan(filtered);
  }, [pemesanan, filterStatus, sortBy, searchTerm]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleRequestEdit = (order) => {
    if (!canEditOrder(order)) {
      alert("Tidak dapat mengajukan edit karena sudah mendekati tanggal sewa (H-1).");
      return;
    }

    setSelectedOrder(order);
    setEditForm({
      tanggalMulai: order.tanggalMulai ? new Date(order.tanggalMulai).toISOString().split('T')[0] : "",
      tanggalSelesai: order.tanggalSelesai ? new Date(order.tanggalSelesai).toISOString().split('T')[0] : ""
    });
    setEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedOrder || !editForm.tanggalMulai || !editForm.tanggalSelesai) {
      alert("Mohon lengkapi semua field");
      return;
    }

    const startDate = new Date(editForm.tanggalMulai);
    const endDate = new Date(editForm.tanggalSelesai);

    if (startDate >= endDate) {
      alert("Tanggal selesai harus setelah tanggal mulai");
      return;
    }

    try {
      const newPrice = calculateNewPrice(editForm.tanggalMulai, editForm.tanggalSelesai, selectedOrder.hargaPerhari);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        editRequest: {
          tanggalMulai: editForm.tanggalMulai,
          tanggalSelesai: editForm.tanggalSelesai,
          durasiHari: diffDays,
          perkiraanHarga: newPrice,
          status: "pending",
          requestedAt: new Date().toISOString(),
          requestedBy: auth.currentUser.uid
        }
      });

      alert("Permintaan edit tanggal telah diajukan. Menunggu persetujuan admin.");
      setEditModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error submitting edit request:", error);
      alert("Gagal mengajukan permintaan edit");
    }
  };

  const handleCancel = (order) => {
    setSelectedOrder(order);
    setCancelModal(true);
  };

  const handleApplyApprovedEdit = async (order) => {
    if (!order.editRequest || order.editRequest.status !== 'approved') {
      alert("Tidak ada edit yang disetujui untuk diterapkan");
      return;
    }

    try {
      await updateDoc(doc(db, "pemesanan", order.id), {
        tanggalMulai: order.editRequest.tanggalMulai,
        tanggalSelesai: order.editRequest.tanggalSelesai,
        durasiHari: order.editRequest.durasiHari,
        perkiraanHarga: order.editRequest.perkiraanHarga,
        editRequest: {
          ...order.editRequest,
          appliedAt: new Date().toISOString(),
          appliedBy: auth.currentUser.uid
        }
      });

      alert("Edit yang disetujui telah berhasil diterapkan!");
    } catch (error) {
      console.error("Error applying approved edit:", error);
      alert("Gagal menerapkan edit yang disetujui");
    }
  };

  const calculateNewPrice = (tanggalMulai, tanggalSelesai, hargaPerhari) => {
    const startDate = new Date(tanggalMulai);
    const endDate = new Date(tanggalSelesai);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * hargaPerhari;
  };

  const addNotification = async (message) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        message,
        timestamp: serverTimestamp(),
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
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      console.error("Failed to add admin notification:", error);
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
      const formData = new FormData();
      formData.append("file", paymentProof[order.id]);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const paymentProofURL = cloudinaryRes.data.secure_url;

      const orderDocRef = doc(db, "pemesanan", order.id);
      await updateDoc(orderDocRef, {
        paymentMethod: paymentMethod[order.id] || order.paymentMethod,
        paymentProof: paymentProofURL,
        paymentStatus: "submitted",
        waktuUpload: new Date().toISOString(),
      });

      await addNotification("Bukti Pembayaran Telah Terkirim");
      await addAdminNotification(`Pembayaran diterima dari ${order.email}: ${order.namaMobil}`);

      try {
        const updatedOrder = {
          ...order,
          paymentMethod: paymentMethod[order.id] || order.paymentMethod,
          paymentProof: paymentProofURL,
          paymentStatus: "submitted"
        };
        InvoiceGenerator.generateDPInvoice(updatedOrder, auth.currentUser);
        await addNotification("Invoice DP telah dibuat dan didownload");
      } catch (invoiceError) {
        console.error("Error generating DP invoice:", invoiceError);
      }
      alert("Bukti pembayaran berhasil dikirim.");
    } catch (err) {
      console.error("Gagal mengirim bukti pembayaran:", err);
      alert("Terjadi kesalahan saat mengirim bukti pembayaran.");
    }
  };

  const handleCashPayment = async (order) => {
    if (!paymentMethod[order.id] && !order.paymentMethod) {
      alert("Silakan pilih metode pembayaran.");
      return;
    }

    try {
      const orderDocRef = doc(db, "pemesanan", order.id);
      await updateDoc(orderDocRef, {
        paymentMethod: paymentMethod[order.id] || order.paymentMethod,
        paymentStatus: "cash_submitted",
        waktuUpload: new Date().toISOString(),
      });

      await addNotification("Permintaan pembayaran cash telah diajukan");
      await addAdminNotification(`Permintaan pembayaran cash dari ${order.email}: ${order.namaMobil}`);

      try {
        const updatedOrder = {
          ...order,
          paymentMethod: paymentMethod[order.id] || order.paymentMethod,
          paymentStatus: "cash_submitted"
        };
        InvoiceGenerator.generateDPInvoice(updatedOrder, auth.currentUser);
        await addNotification("Invoice DP untuk pembayaran cash telah dibuat");
      } catch (invoiceError) {
        console.error("Error generating DP invoice for cash payment:", invoiceError);
      }
      alert("Permintaan pembayaran cash berhasil diajukan.");
    } catch (err) {
      console.error("Gagal mengajukan pembayaran cash:", err);
      alert("Terjadi kesalahan saat mengajukan pembayaran cash.");
    }
  };

  const togglePaymentSection = (orderId) => {
    setShowPaymentSection((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleBalancePaymentClick = (order) => {
    setSelectedOrderForBalance(order);
    setBalancePaymentMethod("");
    setBalancePaymentProof(null);
    setShowBalancePaymentModal(true);
  };

  const handleBalancePaymentSubmit = async () => {
    if (!balancePaymentMethod) {
      alert("Silakan pilih metode pembayaran.");
      return;
    }

    if (balancePaymentMethod !== "Cash" && !balancePaymentProof) {
      alert("Silakan unggah bukti pembayaran.");
      return;
    }

    try {
      let balancePaymentProofURL = null;

      if (balancePaymentMethod !== "Cash" && balancePaymentProof) {
        const formData = new FormData();
        formData.append("file", balancePaymentProof);
        formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

        const cloudinaryRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
          formData
        );

        balancePaymentProofURL = cloudinaryRes.data.secure_url;
      }

      const orderRef = doc(db, "pemesanan", selectedOrderForBalance.id);
      await updateDoc(orderRef, {
        balancePaymentRequest: {
          paymentMethod: balancePaymentMethod,
          paymentProof: balancePaymentProofURL,
          status: "pending",
          requestedAt: new Date().toISOString(),
          amount: selectedOrderForBalance.perkiraanHarga * 0.5 
        }
      });

      await addNotification(`Permintaan pembayaran pelunasan telah diajukan untuk ${selectedOrderForBalance.namaMobil}`);
      await addAdminNotification(`Permintaan pembayaran pelunasan dari ${selectedOrderForBalance.email}: ${selectedOrderForBalance.namaMobil} - ${balancePaymentMethod}`);

      setShowBalancePaymentModal(false);
      setSelectedOrderForBalance(null);
      setBalancePaymentMethod("");
      setBalancePaymentProof(null);

      alert("Permintaan pembayaran pelunasan telah diajukan. Menunggu konfirmasi admin.");
    } catch (error) {
      console.error("Error submitting balance payment:", error);
      alert("Terjadi kesalahan saat mengajukan pembayaran pelunasan.");
    }
  };

  const handleCancelSubmit = async () => {
    if (!selectedOrder) return;

    try {
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        status: "dibatalkan"
      });

      await updateDoc(doc(db, "mobil", selectedOrder.mobilId), {
        tersedia: true,
        status: "normal"
      });

      alert("Pesanan berhasil dibatalkan");
      setCancelModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Gagal membatalkan pesanan");
    }
  };

  const isOngoingOrder = (status) => {
    return ["diproses", "disetujui", "menunggu pembayaran", "pembayaran berhasil", "approve sewa"].includes(status);
  };

  const canEditOrder = (order) => {
    if (!order.tanggalMulai) return false;
    if (order.editRequest && order.editRequest.status === "pending") return false;

    const startDate = new Date(order.tanggalMulai);
    const today = new Date();
    const oneDayBefore = new Date(startDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    return today < oneDayBefore;
  };


  const getStatusColor = (status) => {
    switch (status) {
      case "diproses": return "bg-amber-100 text-amber-700 border-amber-200";
      case "disetujui": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "menunggu pembayaran": return "bg-orange-100 text-orange-700 border-orange-200";
      case "pembayaran berhasil": return "bg-blue-100 text-blue-700 border-blue-200";
      case "selesai": return "bg-violet-100 text-violet-700 border-violet-200";
      case "lunas": return "bg-teal-100 text-teal-700 border-teal-200";
      case "ditolak": return "bg-red-100 text-red-700 border-red-200";
      case "dibatalkan": return "bg-slate-100 text-slate-700 border-slate-200";
      case "approve sewa": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-[100px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-[0.2em] mb-2">
              <History size={14} />
              <span>Log Perjalanan Anda</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">History Pesanan</h1>
            <p className="text-slate-500 mt-1">Kelola reservasi, pembayaran, dan dokumen perjalanan Anda.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="group flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl transition-all font-bold shadow-sm"
          >
            <RefreshCw size={18} className={`text-[#990000] transition-transform duration-500 ${refreshing ? "rotate-180" : "group-hover:rotate-45"}`} />
            Refresh Data
          </button>
        </div>

        {/* Search & Statistics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          {/* Filters Card */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cari Reservasi</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#990000] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Nama mobil atau plat nomor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-12 pr-6 py-3 focus:border-[#990000] outline-none transition-all font-semibold placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="md:w-1/3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold appearance-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="ongoing">Berjalan</option>
                <option value="selesai">Selesai</option>
                <option value="lunas">Lunas</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>
            <div className="md:w-1/3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold appearance-none cursor-pointer"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="price-high">Harga Tertinggi</option>
                <option value="price-low">Harga Terendah</option>
              </select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-4 bg-[#990000] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-red-900/20">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Transaksi</p>
              <p className="text-4xl font-black mb-4 tracking-tight">{filteredPemesanan.length} <span className="text-xl font-normal opacity-60">Order</span></p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1">Ongoing</p>
                  <p className="text-lg font-black">{filteredPemesanan.filter(p => isOngoingOrder(p.status)).length}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1">Success</p>
                  <p className="text-lg font-black">{filteredPemesanan.filter(p => p.status === "lunas" || p.status === "selesai").length}</p>
                </div>
              </div>
            </div>
            <div className="absolute top-[-10%] right-[-10%] w-[150px] h-[150px] bg-white/5 rounded-full blur-[40px]"></div>
          </div>
        </div>

        {/* Order Cards List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredPemesanan.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Tidak Ada Data</h3>
              <p className="text-slate-400 font-medium italic">Belum ada transaksi yang sesuai dengan filter Anda.</p>
            </div>
          ) : (
            filteredPemesanan.map((p) => (
              <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group animate-fadeInUp">
                <div className="p-6 md:p-10">
                  {/* Card Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-50">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-red-50 text-[#990000] rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <Car size={36} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">{p.namaMobil}</h3>
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                          <span>Order #{p.id.substring(0, 8).toUpperCase()}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-[#990000]">{p.rentalType || "Lepas Kunci"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Biaya</p>
                        <p className="text-3xl font-black text-[#990000] tracking-tighter">Rp {p.perkiraanHarga?.toLocaleString()}</p>
                      </div>
                      <ChevronRight className="text-slate-200 hidden lg:block" size={32} />
                    </div>
                  </div>

                  {/* Card Main Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                    {/* Period */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-colors hover:bg-white hover:border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar size={12} className="text-[#990000]" /> Periode Sewa
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900">{p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                        <div className="h-4 w-px bg-slate-200 ml-2"></div>
                        <p className="text-sm font-black text-slate-900">{p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                      </div>
                      <p className="text-[10px] font-black text-[#990000] mt-3 uppercase tracking-widest">{p.durasiHari || 1} Hari Sewa</p>
                    </div>

                    {/* Pickup Point */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-colors hover:bg-white hover:border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MapPin size={12} className="text-[#990000]" /> Penyerahan
                      </p>
                      <p className="text-sm font-black text-slate-900 mb-1 leading-tight">{p.lokasiPenyerahan || "Antar ke Alamat"}</p>
                      {p.titikTemuAddress && (
                        <p className="text-[10px] font-bold text-slate-400 italic line-clamp-2 mt-1">"{p.titikTemuAddress}"</p>
                      )}
                    </div>

                    {/* Payment Info */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-colors hover:bg-white hover:border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={12} className="text-[#990000]" /> Transaksi
                      </p>
                      <p className="text-sm font-black text-slate-900">{p.paymentMethod || "Belum dipilih"}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${p.paymentStatus === 'completed' || p.paymentStatus === 'fully_paid' ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {p.paymentStatus === 'completed' || p.paymentStatus === 'fully_paid' ? 'Verified' : p.paymentStatus || 'Pending'}
                      </p>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-colors hover:bg-white hover:border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info size={12} className="text-[#990000]" /> Plat Nomor
                      </p>
                      <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl inline-block">
                        <p className="text-sm font-black text-slate-900 tracking-widest">{p.platNomor || "TBA"}</p>
                      </div>
                      {p.editRequest && (
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                           <AlertTriangle size={12} /> Edit Diajukan
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Bottom */}
                  <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-slate-50">
                    <div className="flex flex-wrap gap-4">
                      {isOngoingOrder(p.status) && (
                        <>
                          {canEditOrder(p) && (!p.editRequest || p.editRequest.status !== "approved") ? (
                            <button onClick={() => handleRequestEdit(p)} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                              <Edit size={14} /> Ajukan Edit
                            </button>
                          ) : p.editRequest && p.editRequest.status === "approved" ? (
                            <button onClick={() => handleApplyApprovedEdit(p)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                              <Check size={14} /> Konfirmasi Edit
                            </button>
                          ) : null}

                          {(!p.editRequest || p.editRequest.status !== "approved") && (
                            <button onClick={() => handleCancel(p)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                              <X size={14} /> Batalkan
                            </button>
                          )}
                        </>
                      )}

                      {/* Payment Action */}
                      {isOngoingOrder(p.status) && p.status !== "pembayaran berhasil" && (
                        <button onClick={() => togglePaymentSection(p.id)} className="flex items-center gap-2 bg-[#990000] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-800 transition-all shadow-xl shadow-red-900/10 active:scale-95">
                          <CreditCard size={14} /> {showPaymentSection[p.id] ? 'Tutup Form' : 'Kirim Pembayaran'}
                        </button>
                      )}

                      {/* Invoice Downloads */}
                      {p.status === "pembayaran berhasil" && (
                        <button onClick={() => InvoiceGenerator.generateDPInvoice(p, auth.currentUser)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                          <Download size={14} /> Invoice DP (50%)
                        </button>
                      )}
                      
                      {(p.status === "selesai" || p.status === "lunas") && (
                        <button onClick={() => InvoiceGenerator.generateFullInvoice(p, auth.currentUser)} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg active:scale-95">
                          <FileText size={14} /> Download Invoice Full
                        </button>
                      )}

                      {p.status === "selesai" && (
                        <button onClick={() => handleBalancePaymentClick(p)} className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg active:scale-95">
                          <CreditCard size={14} /> Bayar Pelunasan
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                       <Clock size={12} />
                       Reservasi: {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>

                  {/* Expanded Payment Section */}
                  {showPaymentSection[p.id] && (
                    <div className="mt-10 p-8 md:p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 animate-fadeInUp">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-6 bg-[#990000] rounded-full"></div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Detail Konfirmasi Pembayaran</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Pilih Metode</label>
                            <select
                              value={paymentMethod[p.id] || p.paymentMethod || ""}
                              onChange={(e) => setPaymentMethod((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 focus:border-[#990000] outline-none transition-all font-semibold appearance-none"
                            >
                              <option value="">Pilih metode pembayaran</option>
                              <option value="Transfer Bank">Transfer Bank</option>
                              <option value="E-Wallet">E-Wallet</option>
                              <option value="Cash">Cash (Bayar di Kantor)</option>
                            </select>
                          </div>

                          {((paymentMethod[p.id] || p.paymentMethod) !== "Cash") && (
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Unggah Bukti Transfer</label>
                              <div className="relative group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setPaymentProof((prev) => ({ ...prev, [p.id]: e.target.files[0] }))}
                                  className="w-full bg-white border border-slate-200 text-slate-600 text-xs rounded-2xl p-4 file:mr-6 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#990000] file:text-white hover:file:bg-red-800 transition-colors cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col justify-end">
                          <button
                            onClick={() => {
                              if ((paymentMethod[p.id] || p.paymentMethod) === "Cash") handleCashPayment(p);
                              else handlePaymentSubmit(p);
                              setShowPaymentSection(prev => ({ ...prev, [p.id]: false }));
                            }}
                            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl transition-all hover:bg-black shadow-xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95"
                          >
                            <Upload size={16} />
                            {(paymentMethod[p.id] || p.paymentMethod) === "Cash" ? "Kirim Permintaan Cash" : "Kirim Bukti & Selesaikan"}
                          </button>
                          <p className="text-[10px] text-slate-400 font-bold text-center mt-4 italic uppercase tracking-widest">Pastikan data sudah benar sebelum mengirim.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals are kept with standard premium styling but updated buttons/spacing */}
      {editModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg shadow-2xl animate-popIn">
            <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Edit Reservasi</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">Sesuaikan tanggal perjalanan Anda. Mohon tunggu persetujuan admin setelah pengajuan.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Mulai Sewa</label>
                <input
                  type="date"
                  value={editForm.tanggalMulai}
                  onChange={(e) => setEditForm({...editForm, tanggalMulai: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#990000] focus:ring-4 focus:ring-red-50 outline-none transition-all font-semibold"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Berakhir Sewa</label>
                <input
                  type="date"
                  value={editForm.tanggalSelesai}
                  onChange={(e) => setEditForm({...editForm, tanggalSelesai: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#990000] focus:ring-4 focus:ring-red-50 outline-none transition-all font-semibold"
                  min={editForm.tanggalMulai || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <button
                onClick={handleEditSubmit}
                className="bg-[#990000] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/10 hover:bg-red-800 transition-all"
              >
                Kirim Update
              </button>
              <button
                onClick={() => setEditModal(false)}
                className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg shadow-2xl animate-popIn text-center border border-red-50">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={36} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Batalkan Pesanan?</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed italic">
              "Pesanan mobil <strong>{selectedOrder.namaMobil}</strong> akan dihapus dari sistem."
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleCancelSubmit}
                className="bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all"
              >
                Ya, Batalkan
              </button>
              <button
                onClick={() => setCancelModal(false)}
                className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Tidak, Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Modal */}
      {showBalancePaymentModal && selectedOrderForBalance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-xl shadow-2xl animate-popIn">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl shrink-0">
                <CreditCard size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Pelunasan Reservasi</h3>
            </div>
            <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jumlah Pelunasan (50%)</p>
                <p className="text-2xl font-black text-[#990000]">Rp {(selectedOrderForBalance.perkiraanHarga * 0.5).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Mobil</p>
                <p className="text-sm font-black text-slate-900 uppercase">{selectedOrderForBalance.namaMobil}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Metode Pembayaran</label>
                <select
                  value={balancePaymentMethod}
                  onChange={(e) => setBalancePaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all font-semibold"
                >
                  <option value="">Pilih metode pembayaran</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="E-Wallet">E-Wallet</option>
                  <option value="Cash">Cash (Bayar di Kantor)</option>
                </select>
              </div>

              {balancePaymentMethod !== "Cash" && balancePaymentMethod && (
                <div className="animate-fadeInUp">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Bukti Pelunasan</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBalancePaymentProof(e.target.files[0])}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-2xl p-4 file:mr-6 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-600 file:text-white transition-all cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <button
                onClick={handleBalancePaymentSubmit}
                className="bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
              >
                Proses Pelunasan
              </button>
              <button
                onClick={() => setShowBalancePaymentModal(false)}
                className="bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Download(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
