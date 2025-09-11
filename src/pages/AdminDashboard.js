
// === File: src/pages/AdminDashboard.jsx ===
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


export default function AdminDashboard() {
  const [pemesanan, setPemesanan] = useState([]);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterRentalType, setFilterRentalType] = useState("semua");
  const [searchPemesanan, setSearchPemesanan] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);



  // Removed fetchClients as client management is moved to ClientManagement.js



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
        // fetchData(); // removed because real-time listener is used now
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
      // When approved, set to waiting for payment and calculate DP
      const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
      const pemesananData = pemesananDoc.data();
      const dpAmount = Math.ceil(pemesananData.perkiraanHarga * 0.5); // 50% DP
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
    // fetchData(); // removed because real-time listener is used now
  };

  const handlePaymentApproval = async (id, status) => {
    await updateDoc(doc(db, "pemesanan", id), {
      status: status,
      paymentStatus: "completed"
    });
    // fetchData(); // removed because real-time listener is used now
  };

  // Removed client management functions as they are moved to ClientManagement.js







  const filteredPemesanan = pemesanan.filter(p => {
    const matchesStatus = filterStatus === "semua" || p.status === filterStatus;
    const matchesRentalType = filterRentalType === "semua" || p.rentalType === filterRentalType;
    const matchesSearch = searchPemesanan === "" ||
      p.namaMobil?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
      p.status?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
      p.rentalType?.toLowerCase().includes(searchPemesanan.toLowerCase());
    return matchesStatus && matchesRentalType && matchesSearch;
  });

  // Removed filteredClients and searchClients from AdminDashboard as client management is moved to ClientManagement.js

  if (loading) return <p className="p-4">Memuat data...</p>;
  if (!isAdmin) return <p className="p-4 text-red-600 font-semibold">Anda tidak memiliki akses ke halaman ini.</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-10">
      {/* === Daftar Pemesanan === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-[#990000] mb-4">Daftar Pemesanan</h1>
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div>
            <label className="font-semibold mr-2">Filter Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded px-3 py-1">
              <option value="semua">Semua</option>
              <option value="diproses">Diproses</option>
              <option value="disetujui">Disetujui</option>
              <option value="menunggu pembayaran">Menunggu Pembayaran</option>
              <option value="pembayaran berhasil">Pembayaran Berhasil</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
          <div>
            <label className="font-semibold mr-2">Filter Tipe Sewa:</label>
            <select value={filterRentalType} onChange={(e) => setFilterRentalType(e.target.value)} className="border rounded px-3 py-1">
              <option value="semua">Semua</option>
              <option value="Lepas Kunci">Lepas Kunci</option>
              <option value="Driver">Driver</option>
            </select>
          </div>
          <div>
            <label className="font-semibold mr-2">Cari Pesanan:</label>
            <input
              type="text"
              placeholder="Cari berdasarkan mobil, email, status, tipe sewa..."
              value={searchPemesanan}
              onChange={(e) => setSearchPemesanan(e.target.value)}
              className="border rounded px-3 py-1 w-64"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredPemesanan.map((p) => (
            <div key={p.id} className="border p-4 rounded bg-gray-50 shadow-sm">
              <p><strong>Mobil:</strong> {p.namaMobil}</p>
              <p><strong>User:</strong> {p.email}</p>
              <p><strong>Tanggal:</strong> {new Date(p.tanggal).toLocaleString()}</p>
              <p><strong>Tipe Sewa:</strong> {p.rentalType || "Lepas Kunci"}</p>
              <p><strong>Total Biaya:</strong> Rp {p.perkiraanHarga?.toLocaleString()}</p>
              {p.dpAmount && <p><strong>DP 50%:</strong> Rp {p.dpAmount.toLocaleString()}</p>}
              <p><strong>Status:</strong> {p.status}</p>
              {p.paymentMethod && <p><strong>Metode Pembayaran:</strong> {p.paymentMethod}</p>}
              {p.paymentProof ? (
                <p>
                  <strong>Bukti Pembayaran:</strong>{" "}
                  <a
                    href={p.paymentProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Lihat Bukti
                  </a>
                </p>
              ) : (
                <p className="text-gray-500 italic">Belum ada bukti pembayaran</p>
              )}
              <div className="mt-3 space-x-2">
                {p.status === "diproses" && (
                  <>
                    <button onClick={() => handleStatus(p.id, "disetujui", p.mobilId)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Setujui</button>
                    <button onClick={() => handleStatus(p.id, "ditolak", p.mobilId)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Tolak</button>
                  </>
                )}
                {p.status === "menunggu pembayaran" && (
                  <>
                    <button onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Konfirmasi Pembayaran</button>
                    <button onClick={() => handleStatus(p.id, "ditolak", p.mobilId)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Tolak</button>
                  </>
                )}
                {p.status === "pembayaran berhasil" && (
                  <button onClick={() => handleStatus(p.id, "selesai", p.mobilId)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Selesai</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Manajemen Client section removed - moved to separate ClientManagement.js page */}
    </div>
  );
}
