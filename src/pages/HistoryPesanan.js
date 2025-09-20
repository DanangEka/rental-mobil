import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { Calendar, Edit, X, AlertTriangle, Clock, CheckCircle, RefreshCw, Filter, Check } from "lucide-react";

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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      alert("Anda belum login.");
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "pemesanan"),
      where("uid", "==", user.uid),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pemesananData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPemesanan(pemesananData);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
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
    // The onSnapshot will automatically update the data
    // This is just for user feedback
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

      // Update order with edit request
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
      // Update the main order with approved edit details
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



  const handleCancelSubmit = async () => {
    if (!selectedOrder) return;

    try {
      // Update order status to cancelled
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        status: "dibatalkan"
      });

      // Make car available again
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
    return ["diproses", "disetujui", "menunggu pembayaran", "pembayaran berhasil"].includes(status);
  };

  const canEditOrder = (order) => {
    if (!order.tanggalMulai) return false;

    // Cannot edit if there's already a pending edit request
    if (order.editRequest && order.editRequest.status === "pending") {
      return false;
    }

    const startDate = new Date(order.tanggalMulai);
    const today = new Date();
    const oneDayBefore = new Date(startDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    // Cannot edit if today is H-1 or later (same day or after start date)
    return today < oneDayBefore;
  };

  const getDaysUntilStart = (order) => {
    if (!order.tanggalMulai) return null;

    const startDate = new Date(order.tanggalMulai);
    const today = new Date();
    const diffTime = startDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "diproses": return "bg-yellow-100 text-yellow-800";
      case "disetujui": return "bg-green-100 text-green-800";
      case "menunggu pembayaran": return "bg-orange-100 text-orange-800";
      case "pembayaran berhasil": return "bg-blue-100 text-blue-800";
      case "selesai": return "bg-purple-100 text-purple-800";
      case "ditolak": return "bg-red-100 text-red-800";
      case "dibatalkan": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
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

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
      <section className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">History Pesanan</h1>
              <p className="text-gray-600 text-sm sm:text-base">Kelola dan lihat semua pesanan Anda</p>
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

          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari mobil atau plat nomor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="ongoing">Sedang Berlangsung</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
                <option value="ditolak">Ditolak</option>
                <option value="edit_approved">Edit Disetujui</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="price-high">Harga Tertinggi</option>
                <option value="price-low">Harga Terendah</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-blue-50 p-4 sm:p-6 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-blue-900">Total Pesanan</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{filteredPemesanan.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 sm:p-6 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-green-900">Selesai</h3>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {filteredPemesanan.filter(p => p.status === "selesai").length}
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
                <h3 className="text-sm sm:text-lg font-semibold text-yellow-900">Sedang Berlangsung</h3>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                  {filteredPemesanan.filter(p => isOngoingOrder(p.status)).length}
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
                <h3 className="text-sm sm:text-lg font-semibold text-red-900">Dibatalkan</h3>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">
                  {filteredPemesanan.filter(p => p.status === "dibatalkan").length}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 sm:p-6 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-green-900">Edit Disetujui</h3>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {filteredPemesanan.filter(p => p.editRequest && p.editRequest.status === 'approved').length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4 sm:space-y-6">
          {filteredPemesanan.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="text-gray-500 text-lg">
                {pemesanan.length === 0 ? "Belum ada pesanan" : "Tidak ada pesanan yang sesuai filter"}
              </div>
              <p className="text-gray-400">
                {pemesanan.length === 0 ? "Pesanan Anda akan muncul di sini" : "Coba ubah filter atau pencarian"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan {filteredPemesanan.length} dari {pemesanan.length} pesanan
                </p>
              </div>
              {filteredPemesanan.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Mobil</span>
                    <p className="text-lg font-semibold text-gray-900">{p.namaMobil}</p>
                    <p className="text-sm text-gray-600">Plat: {p.platNomor}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Periode Sewa</span>
                    <p className="text-gray-900">
                      {p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-gray-900">
                      {p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">{p.durasiHari || 1} hari</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Tipe Sewa</span>
                    <p className="text-gray-900">{p.rentalType || "Lepas Kunci"}</p>
                    <span className="text-sm font-medium text-gray-500">Tanggal Pesan</span>
                    <p className="text-gray-900">{new Date(p.tanggal).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                      {p.editRequest && (
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                          p.editRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          p.editRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {p.editRequest.status === 'approved' ? 'Edit telah disetujui' : `Edit: ${p.editRequest.status}`}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-500">Total Biaya</span>
                      <p className="text-xl font-bold text-green-600">Rp {p.perkiraanHarga?.toLocaleString()}</p>

                      {/* Show approved edit details */}
                      {p.editRequest && p.editRequest.status === 'approved' && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">Detail Edit yang Disetujui:</p>
                          <div className="text-xs text-green-700 space-y-1">
                            <p>Tanggal Mulai: {new Date(p.editRequest.tanggalMulai).toLocaleDateString()}</p>
                            <p>Tanggal Selesai: {new Date(p.editRequest.tanggalSelesai).toLocaleDateString()}</p>
                            <p>Durasi: {p.editRequest.durasiHari} hari</p>
                            <p>Total Baru: Rp {p.editRequest.perkiraanHarga?.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Ongoing Orders */}
                {isOngoingOrder(p.status) && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-3">
                      {/* Show edit button only if no approved edit request */}
                      {canEditOrder(p) && (!p.editRequest || p.editRequest.status !== "approved") ? (
                        <button
                          onClick={() => handleRequestEdit(p)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                          Ajukan Edit
                        </button>
                      ) : p.editRequest && p.editRequest.status === "pending" ? (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Edit size={16} />
                          <span className="text-sm">Permintaan edit menunggu persetujuan admin</span>
                        </div>
                      ) : p.editRequest && p.editRequest.status === "approved" ? (
                        <button
                          onClick={() => handleApplyApprovedEdit(p)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Check size={16} />
                          Terapkan Edit yang Disetujui
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Edit size={16} className="text-gray-400" />
                          <span className="text-sm">
                            Edit tidak tersedia (H-{getDaysUntilStart(p) <= 1 ? '1' : getDaysUntilStart(p) - 1})
                          </span>
                        </div>
                      )}

                      {/* Show cancel button only if no approved edit request */}
                      {(!p.editRequest || p.editRequest.status !== "approved") && (
                        <button
                          onClick={() => handleCancel(p)}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <X size={16} />
                          Batalkan
                        </button>
                      )}
                    </div>
                    {getDaysUntilStart(p) <= 1 && getDaysUntilStart(p) > 0 && (!p.editRequest || p.editRequest.status !== "approved") && (
                      <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                        <AlertTriangle size={14} />
                        Edit tanggal tidak dapat dilakukan H-1 sebelum tanggal sewa
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            </>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {editModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ajukan Edit Tanggal Sewa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={editForm.tanggalMulai}
                  onChange={(e) => setEditForm({...editForm, tanggalMulai: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={editForm.tanggalSelesai}
                  onChange={(e) => setEditForm({...editForm, tanggalSelesai: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={editForm.tanggalMulai || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ajukan Permintaan
              </button>
              <button
                onClick={() => setEditModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-xl font-bold text-gray-900">Batalkan Pesanan</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin membatalkan pesanan <strong>{selectedOrder.namaMobil}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelSubmit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ya, Batalkan
              </button>
              <button
                onClick={() => setCancelModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
