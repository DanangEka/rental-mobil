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
import { Search, RefreshCw, Download, Eye, DollarSign, Car, User, MapPin, Calendar, ArrowRight, AlertTriangle, FileText, Calendar as CalendarIcon } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";
import * as XLSX from 'xlsx';
import { initGoogleClient, syncOrderToCalendar } from "../services/googleCalendar";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch users:", error);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin === true) {
          setIsAdmin(true);
          fetchUsers();
        }
      } catch (error) {
        console.error("Error verifikasi admin:", error.message);
      }
      setLoading(false);
    };
    checkAdminStatus();

    // Initialize Google API
    initGoogleClient().then(() => {
      setIsGapiLoaded(true);
    }).catch(err => console.error("GAPI failure", err));
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
    try {
      const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
      const pemesananData = pemesananDoc.data();
      const userId = pemesananData.uid;

      await updateDoc(doc(db, "pemesanan", id), { status });
      if (status === "disetujui") {
        if (pemesananData.paymentMethod === 'Cash') {
          await updateDoc(doc(db, "pemesanan", id), {
            status: "disetujui_cash",
            paymentStatus: "waiting_dp_input"
          });
          await addDoc(collection(db, "notifications"), {
            userId,
            message: `Pengajuan pembayaran Cash untuk ${pemesananData.namaMobil} telah disetujui. Silakan masukkan nominal DP yang akan Anda bayarkan di halaman History Pesanan.`,
            read: false,
            timestamp: serverTimestamp()
          });
        } else {
          const dpAmount = Math.ceil(pemesananData.perkiraanHarga * 0.5);
          await updateDoc(doc(db, "pemesanan", id), {
            status: "menunggu pembayaran",
            dpAmount: dpAmount,
            paymentStatus: "pending"
          });
          await updateDoc(doc(db, "mobil", mobilId), { tersedia: false, status: "disewa" });
          await addDoc(collection(db, "notifications"), {
            userId,
            message: `Pemesanan mobil ${pemesananData.namaMobil} telah disetujui. Silakan lakukan pembayaran DP sebesar Rp ${dpAmount.toLocaleString()}.`,
            read: false,
            timestamp: serverTimestamp()
          });
        }
      } else if (status === "ditolak") {
        await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });
        await addDoc(collection(db, "notifications"), {
          userId,
          message: `Pemesanan mobil ${pemesananData.namaMobil} telah ditolak.`,
          read: false,
          timestamp: serverTimestamp()
        });
      } else if (status === "selesai") {
        await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });
        await addDoc(collection(db, "notifications"), {
          userId,
          message: `Pemesanan mobil ${pemesananData.namaMobil} telah selesai. Terima kasih telah menggunakan layanan kami.`,
          read: false,
          timestamp: serverTimestamp()
        });
      }
      alert("Status pesanan diperbarui.");
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui status.");
    }
  };

  const handleMarkAsLunas = async (id, mobilId) => {
    try {
      const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
      const pemesananData = pemesananDoc.data();
      const userId = pemesananData.uid;

      await updateDoc(doc(db, "pemesanan", id), {
        status: "lunas",
        paymentStatus: "fully_paid",
        lunasAt: new Date().toISOString()
      });

      await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });

      await addDoc(collection(db, "notifications"), {
        userId,
        message: `Pemesanan mobil ${pemesananData.namaMobil} telah lunas (pembayaran penuh).`,
        read: false,
        timestamp: serverTimestamp()
      });
      alert("Pesanan ditandai Lunas.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleBalancePaymentApproval = async (id, status) => {
    try {
      const orderDoc = await getDoc(doc(db, "pemesanan", id));
      const order = { id, ...orderDoc.data() };

      if (status === "approved") {
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
        await updateDoc(doc(db, "mobil", order.mobilId), { tersedia: true, status: "normal" });
        await addDoc(collection(db, "notifications"), {
          userId: order.uid,
          message: `Pelunasan mobil ${order.namaMobil} telah dikonfirmasi.`,
          read: false,
          timestamp: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, "pemesanan", id), {
          balancePaymentRequest: { ...order.balancePaymentRequest, status: "rejected" }
        });
      }
      alert("Status pelunasan diperbarui.");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentApproval = async (id, status) => {
    try {
      const orderDoc = await getDoc(doc(db, "pemesanan", id));
      const order = { id, ...orderDoc.data() };
      await updateDoc(doc(db, "pemesanan", id), {
        status: status,
        paymentStatus: "completed"
      });
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Pembayaran untuk ${order.namaMobil} telah dikonfirmasi.`,
        read: false,
        timestamp: serverTimestamp()
      });
      alert("Pembayaran dikonfirmasi.");
    } catch (err) {
      console.error(err);
    }
  };

  const calculatePenalty = (order) => {
    if (!order.tanggalSelesai || !order.perkiraanHarga || !order.durasiHari) return { amount: 0, hours: 0 };
    const activeStatuses = ["pembayaran berhasil", "disewa", "approve sewa"];
    if (!activeStatuses.includes(order.status)) return { amount: 0, hours: 0 };

    const end = new Date(order.tanggalSelesai);
    const now = new Date();
    if (now <= end) return { amount: 0, hours: 0 };

    const diffMs = now - end;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const dailyRate = Math.ceil(order.perkiraanHarga / order.durasiHari);
    const penaltyPerHour = Math.ceil(dailyRate * 0.1);
    return { amount: penaltyPerHour * diffHours, hours: diffHours };
  };

  const generateInvoicePDF = (order, user, type = "full") => {
    if (type === "dp") {
      InvoiceGenerator.generateDPInvoice(order, user);
    } else {
      const { amount, hours } = calculatePenalty(order);
      InvoiceGenerator.generateFullInvoice(order, user, amount, hours);
    }
  };

  const handleSyncToCalendar = async (order) => {
    try {
      if (!isGapiLoaded) {
        alert("Google API belum siap. Silakan refresh.");
        return;
      }
      await syncOrderToCalendar(order);
      alert("Pesanan berhasil disinkronkan ke Google Calendar.");
    } catch (error) {
      console.error(error);
      alert("Gagal sinkronisasi. Pastikan Anda sudah login Google.");
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredPemesanan.map(p => {
      const user = users.find(u => u.id === p.uid);
      
      // Determine delivery address based on user requirements
      let alamatLengkap = "-";
      if (p.deliveryAddress) {
        // Prioritas utama: alamat yang diisi user saat booking
        alamatLengkap = p.deliveryAddress;
      } else if (p.lokasiPenyerahan === "Rumah" || p.lokasiPenyerahan === "Titik Temu") {
        alamatLengkap = p.titikTemuAddress || "-";
      } else if (p.lokasiPenyerahan === "Kantor" || p.lokasiPenyerahan === "Garasi") {
        alamatLengkap = "Garasi Cakra Lima Tujuh";
      }

      return {
        "ID Pesanan": p.id.substring(0, 8).toUpperCase(),
        "Pelanggan": user?.nama || p.email,
        "Email": p.email,
        "Telepon": user?.nomorTelepon || p.noTelepon || "-",
        "Mobil": p.namaMobil,
        "Tujuan Pengiriman": p.lokasiPenyerahan || "Ambil di Garasi",
        "Alamat Lengkap": alamatLengkap,
        "Sewa Dari": p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString('id-ID') : "-",
        "Sewa Sampai": p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString('id-ID') : "-",
        "Durasi (Hari)": p.durasiHari || 0,
        "Total Harga": p.perkiraanHarga || 0,
        "Status": p.status,
        "Tgl Dibuat": new Date(p.tanggal).toLocaleDateString('id-ID')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pesanan");
    
    // Generate filename based on filters
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Laporan_Pesanan_${dateStr}.xlsx`);
  };

  const filteredPemesanan = pemesanan
    .filter(p => {
      const user = users.find(u => u.id === p.uid);
      let matchesStatus = filterStatus === "semua" || p.status === filterStatus;
      if (filterStatus === "balance_pending") {
        matchesStatus = p.balancePaymentRequest && p.balancePaymentRequest.status === "pending";
      }
      const matchesRentalType = filterRentalType === "semua" || (p.rentalType === filterRentalType || (filterRentalType === "Driver" && p.rentalType === "Dengan Driver"));
      const matchesSearch = searchPemesanan === "" ||
        p.namaMobil?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        user?.nama?.toLowerCase().includes(searchPemesanan.toLowerCase());
      
      // Date Range Filter
      let matchesDate = true;
      if (startDate && endDate) {
        const orderDate = new Date(p.tanggal);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59); // End of day
        matchesDate = orderDate >= start && orderDate <= end;
      }

      return matchesStatus && matchesRentalType && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
      const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "price-high") return (b.perkiraanHarga || 0) - (a.perkiraanHarga || 0);
      if (sortBy === "price-low") return (a.perkiraanHarga || 0) - (b.perkiraanHarga || 0);
      return 0;
    });

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[160px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[160px] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-red-50 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500 mb-6 italic">Anda tidak memiliki kredensial untuk manajemen keuangan & operasional.</p>
          <div className="h-1.5 w-12 bg-[#990000] mx-auto rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>Sistem Operasional Armada</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Pesanan</h1>
            <p className="text-slate-500 mt-1">Konfirmasi pembayaran, monitor durasi, dan kelola logistik persewaan.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 px-6 py-3.5 rounded-2xl transition-all font-bold shadow-sm"
            >
              <Download size={18} className="transition-transform group-hover:-translate-y-1" />
              Export Excel
            </button>
            <button
              onClick={handleRefresh}
              className="group flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl transition-all font-bold shadow-sm"
            >
              <RefreshCw size={18} className={`text-[#990000] transition-transform duration-500 ${refreshing ? "rotate-180" : "group-hover:rotate-45"}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Dynamic Filters Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 mb-10">
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Status Transaksi</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold appearance-none cursor-pointer"
                >
                  <option value="semua">Semua Status</option>
                  <option value="diproses">Masuk (Pending)</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="menunggu pembayaran">Menunggu DP</option>
                  <option value="pembayaran berhasil">DP Diterima (Disewa)</option>
                  <option value="balance_pending">Butuh Pelunasan</option>
                  <option value="lunas">Selesai (Lunas)</option>
                  <option value="ditolak">Dibatalkan</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Kategori Sewa</label>
                <select
                  value={filterRentalType}
                  onChange={(e) => setFilterRentalType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold appearance-none cursor-pointer"
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="Lepas Kunci">Lepas Kunci</option>
                  <option value="Driver">Dengan Driver</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Rentang Awal</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Rentang Akhir</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                />
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6 border-t border-slate-100 pt-6">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Pencarian Cepat</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#990000] transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Nama client, mobil, atau email..."
                    value={searchPemesanan}
                    onChange={(e) => setSearchPemesanan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-12 pr-6 py-3 focus:border-[#990000] outline-none transition-all font-semibold placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="lg:w-1/4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Urutkan</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold appearance-none cursor-pointer"
                >
                  <option value="newest">Paling Baru</option>
                  <option value="oldest">Paling Lama</option>
                  <option value="price-high">Harga Tertinggi</option>
                  <option value="price-low">Harga Terendah</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredPemesanan.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 text-center">
              <FileText size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold italic text-sm text-center">Tidak ada transaksi ditemukan pada kriteria ini.</p>
            </div>
          ) : (
            filteredPemesanan.map((p) => {
              const user = users.find(u => u.id === p.uid);
              const driverUser = users.find(u => u.id === p.driverId);
              const penalty = calculatePenalty(p);
              
              return (
                <div key={p.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-6 md:p-8">
                    
                    {/* Item Top: Header & Status */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-red-50 text-[#990000] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                           <Car size={32} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{p.namaMobil}</h3>
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              p.status === 'diproses' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              p.status === 'lunas' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              p.status === 'ditolak' ? 'bg-slate-50 text-slate-400 border-slate-200' :
                              p.status === 'disetujui_cash' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              'bg-red-50 text-[#990000] border-red-100'
                            }`}>
                              {p.status === 'disetujui_cash' ? 'Disetujui (Cash)' : p.status}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-400 mt-1">Order #{p.id.substring(0, 8).toUpperCase()} • {p.rentalType}</p>
                        </div>
                      </div>
                      
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dibuat Pada</p>
                        <p className="text-sm font-black text-slate-900 flex items-center md:justify-end gap-2">
                           <Calendar size={14} className="text-[#990000]" />
                           {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Item Middle: Data Grid */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${p.rentalType === "Dengan Driver" ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-8 mb-8`}>
                      {/* Client Info */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <User size={12} /> Data Pelanggan
                        </p>
                        <h4 className="text-slate-900 font-black mb-1 truncate">{user?.nama || p.email}</h4>
                        <p className="text-xs font-bold text-slate-500 mb-1">{user?.nomorTelepon || "No Phone"}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                      </div>

                      {/* Driver Info */}
                      {p.rentalType === "Dengan Driver" && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <User size={12} className="text-[#990000]" /> Driver Penerima
                            </p>
                            {p.driverId ? (
                              <>
                                <h4 className="text-slate-900 font-black mb-1 truncate">
                                  {driverUser?.displayName || driverUser?.nama || driverUser?.name || 'Driver Aktif'}
                                </h4>
                                <p className="text-xs font-bold text-slate-500 mb-1">
                                  ID: {p.driverId.substring(0, 12).toUpperCase()}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs font-bold text-amber-600 italic">Menunggu Driver</p>
                            )}
                          </div>
                          {p.driverId && (driverUser?.email || p.driverEmail) && (
                            <p className="text-[10px] text-slate-400 truncate mt-2">
                              {driverUser?.email || p.driverEmail}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Duration Info */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Durasi Sewa ({p.durasiHari} Hari)</p>
                        <div className="flex items-center justify-center gap-3">
                           <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold mb-0.5">MULAI</p>
                              <p className="text-sm font-black text-slate-900">{p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</p>
                           </div>
                           <ArrowRight size={14} className="text-[#990000] mt-4" />
                           <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold mb-0.5">SELESAI</p>
                              <p className="text-sm font-black text-slate-900">{p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</p>
                           </div>
                        </div>
                      </div>

                      {/* Location Info */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <MapPin size={12} /> Penyerahan
                        </p>
                        <p className="text-sm font-black text-slate-900 mb-1">{p.lokasiPenyerahan || 'Antar ke Alamat'}</p>
                        {(p.deliveryAddress || p.titikTemuAddress) && (
                          <p className="text-[10px] font-bold text-slate-400 leading-tight italic line-clamp-2">"{p.deliveryAddress || p.titikTemuAddress}"</p>
                        )}
                      </div>

                      {/* Financial Info */}
                      <div className="bg-red-50 border border-red-100/50 rounded-2xl p-5 text-right flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Estimasi Total</p>
                        <p className="text-2xl font-black text-[#990000] tracking-tighter">Rp {p.perkiraanHarga?.toLocaleString()}</p>
                        {p.dpAmount && (
                          <p className="text-[10px] font-black text-[#990000]/60 mt-1">DP: Rp {p.dpAmount.toLocaleString()}</p>
                        )}
                         {penalty.amount > 0 && (
                          <div className="mt-2 text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded inline-block">
                             DENDA: Rp {penalty.amount.toLocaleString()} ({penalty.hours}j)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Bottom: Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      
                      {/* Action Group 1: Decisions */}
                      <div className="flex flex-wrap gap-3">
                         {p.status === "diproses" && (
                          <>
                             <button onClick={() => handleStatus(p.id, "disetujui", p.mobilId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">Setujui</button>
                             <button onClick={() => handleStatus(p.id, "ditolak", p.mobilId)} className="bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Tolak</button>
                          </>
                        )}

                        {p.status === "disetujui_cash" && p.paymentStatus === "dp_cash_submitted" && (
                          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center gap-3">
                              <DollarSign size={20} className="text-amber-600" />
                              <div>
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Nominal DP Tunai</p>
                                <p className="text-lg font-black text-amber-700">Rp {p.dpAmount?.toLocaleString()}</p>
                              </div>
                            </div>
                            <button onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">
                              Konfirmasi Terima Uang
                            </button>
                          </div>
                        )}

                        {p.status === "menunggu pembayaran" && p.paymentProof && (
                           <div className="flex items-center gap-3">
                              <a href={p.paymentProof} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">
                                 <Eye size={16} /> Bukti DP
                              </a>
                              <button onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md">Verifikasi DP</button>
                           </div>
                        )}

                        {p.balancePaymentRequest?.status === "pending" && (
                           <div className="flex items-center gap-3">
                              <a href={p.balancePaymentRequest.paymentProof} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">
                                 <Eye size={16} /> Bukti Lunas
                              </a>
                              <button onClick={() => handleBalancePaymentApproval(p.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md">Selesaikan Order</button>
                              <button onClick={() => handleBalancePaymentApproval(p.id, "rejected")} className="bg-red-50 text-red-600 border border-red-100 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all">Tolak</button>
                           </div>
                        )}

                        {(p.status === "pembayaran berhasil" || p.status === "disewa" || p.status === "tugas aktif") && (
                           <button onClick={() => handleStatus(p.id, "selesai", p.mobilId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md">Tandai Selesai</button>
                        )}
                        
                        {p.status === "menunggu konfirmasi lunas" && (
                           <button onClick={() => handleMarkAsLunas(p.id, p.mobilId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md">Konfirmasi Pelunasan</button>
                        )}
                      </div>

                      {/* Action Group 2: Document Printing */}
                      <div className="flex items-center gap-3 ml-auto">
                        {(p.status === "pembayaran berhasil" || p.status === "menunggu pembayaran" || p.status === "disetujui") && (
                          <button onClick={() => generateInvoicePDF(p, user, "dp")} className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:text-blue-800 transition-colors p-2">
                             <Download size={14} /> Invoice DP
                          </button>
                        )}
                        {(p.status === "selesai" || p.status === "tugas aktif" || p.status === "pembayaran berhasil" || p.status === "lunas") && (
                          <button onClick={() => generateInvoicePDF(p, user, "full")} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all group">
                             <Download size={16} className="text-[#990000] group-hover:scale-110 transition-transform" /> 
                             Cetak Invoice Full
                          </button>
                        )}
                        {(p.status === "pembayaran berhasil" || p.status === "lunas" || p.status === "disetujui") && (
                           <button 
                            onClick={() => handleSyncToCalendar(p)}
                            className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all group"
                           >
                            <CalendarIcon size={16} className="group-hover:scale-110 transition-transform" />
                            Sync Calendar
                           </button>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  );
}
