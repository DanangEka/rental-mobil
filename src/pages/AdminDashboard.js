import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import axios from "axios";
import jsPDF from "jspdf";

export default function AdminDashboard() {
  const [pemesanan, setPemesanan] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterRentalType, setFilterRentalType] = useState("semua");
  const [searchPemesanan, setSearchPemesanan] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
      pemesananData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      setPemesanan(pemesananData);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleStatus = async (id, status, mobilId) => {
    await updateDoc(doc(db, "pemesanan", id), { status });
    if (status === "disetujui") {
      const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
      const pemesananData = pemesananDoc.data();
      const dpAmount = Math.ceil(pemesananData.perkiraanHarga * 0.5);
      await updateDoc(doc(db, "pemesanan", id), {
        status: "menunggu pembayaran",
        dpAmount: dpAmount,
        paymentStatus: "pending"
      });
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: false, status: "disewa" });
    } else if (status === "ditolak") {
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });
    } else if (status === "selesai") {
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: true, status: "normal" });
    }
  };

  const handlePaymentApproval = async (id, status) => {
    const orderDoc = await getDoc(doc(db, "pemesanan", id));
    const order = { id, ...orderDoc.data() };

    await updateDoc(doc(db, "pemesanan", id), {
      status: status,
      paymentStatus: "completed"
    });

    try {
      await axios.post('/api/payment-success', order);
    } catch (err) {
      console.error('Error calling payment success API:', err);
    }
  };

  const generateInvoicePDF = (order, user) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("INVOICE SEWA MOBIL HARIAN", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("Cakra Lima Tujuh", 105, 25, { align: "center" });
    doc.text("Lembah Harapan, Blok AA-57, Lidah Wetan, Kec. Lakarsantri, Surabaya.", 105, 32, { align: "center" });
    doc.text("Email: limatujuhcakra@gmail.com", 105, 39, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);

    let y = 55;
    doc.text("Kepada Yth.,", 15, y);
    y += 7;
    doc.text(`Nama       : ${user?.nama || order.namaClient || "-"}`, 15, y);
    y += 7;
    doc.text(`Alamat     : ${user?.alamat || "-"}`, 15, y);
    y += 7;
    doc.text(`No. Telepon: ${user?.nomorTelepon || order.telepon || "-"}`, 15, y);

    y += 15;
    doc.setFontSize(14);
    doc.text("Detail Rental Mobil", 15, y);
    y += 7;

    // Table headers
    doc.setFontSize(12);
    doc.setFillColor(220, 220, 220);
    doc.rect(15, y, 90, 10, "F");
    doc.rect(105, y, 90, 10, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, y + 7);
    doc.text("Detail", 110, y + 7);
    y += 10;

    // Table rows
    const addRow = (desc, detail) => {
      doc.rect(15, y, 90, 10);
      doc.rect(105, y, 90, 10);
      doc.text(desc, 20, y + 7);
      doc.text(detail, 110, y + 7);
      y += 10;
    };

    addRow("Merek Mobil", order.namaMobil || "-");
    addRow("Plat Nomor", order.platNomor || "-");
    addRow("Tanggal Sewa", order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString() : "-");
    addRow("Tanggal Kembali", order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString() : "-");
    addRow("Lama Sewa", (order.durasiHari || 1) + " Hari");
    addRow("Harga Sewa per Hari", `Rp ${order.hargaPerhari?.toLocaleString() || "0"}`);

    y += 10;
    doc.setFontSize(14);
    doc.text("Rincian Biaya", 15, y);
    y += 7;

    // Table headers for cost
    doc.setFontSize(12);
    doc.setFillColor(220, 220, 220);
    doc.rect(15, y, 135, 10, "F");
    doc.rect(150, y, 45, 10, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Deskripsi", 20, y + 7);
    doc.text("Jumlah", 155, y + 7);
    y += 10;

    // Cost rows
    addRow(`Biaya Sewa (${order.durasiHari || 1} Hari)`, `Rp ${order.perkiraanHarga?.toLocaleString() || "0"}`);
    addRow("Biaya Driver", "Rp 0");
    addRow("Total Pembayaran", `Rp ${order.perkiraanHarga.toLocaleString()}`);

    // Open in new tab
    const pdfData = doc.output('dataurlnewwindow');
  };

  const filteredPemesanan = pemesanan.filter(p => {
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
  });

  if (loading) return <p className="p-4">Memuat data...</p>;
  if (!isAdmin) return <p className="p-4 text-red-600 font-semibold">Anda tidak memiliki akses ke halaman ini.</p>;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
      <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin</h1>
          <p className="text-gray-600">Kelola pemesanan dan status pembayaran</p>
        </div>

        {/* Filter */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Pencarian</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="semua">Semua Status</option>
                <option value="diproses">Diproses</option>
                <option value="disetujui">Disetujui</option>
                <option value="menunggu pembayaran">Menunggu Pembayaran</option>
                <option value="pembayaran berhasil">Pembayaran Berhasil</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Tipe Sewa</label>
              <select
                value={filterRentalType}
                onChange={(e) => setFilterRentalType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="semua">Semua Tipe</option>
                <option value="Lepas Kunci">Lepas Kunci</option>
                <option value="Driver">Driver</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari Pesanan</label>
              <input
                type="text"
                placeholder="Cari berdasarkan mobil, email, status..."
                value={searchPemesanan}
                onChange={(e) => setSearchPemesanan(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* List Pesanan */}
        <div className="space-y-6">
          {filteredPemesanan.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">Tidak ada pemesanan yang ditemukan</div>
            </div>
          ) : (
            filteredPemesanan.map((p) => {
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
                        p.status === 'menunggu pembayaran' ? 'bg-orange-100 text-orange-800' :
                        p.status === 'pembayaran berhasil' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'selesai' ? 'bg-purple-100 text-purple-800' :
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

                  <div className="flex flex-wrap gap-3">
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
                          onClick={() => generateInvoicePDF(p, user)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Lihat Invoice PDF
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
            })
          )}
        </div>
      </section>
    </div>
  );
}
