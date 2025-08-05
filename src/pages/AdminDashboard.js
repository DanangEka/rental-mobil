// === File: src/pages/AdminDashboard.jsx ===
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  getDoc
} from "firebase/firestore";

export default function AdminDashboard() {
  const [pemesanan, setPemesanan] = useState([]);
  const [mobil, setMobil] = useState([]);
  const [form, setForm] = useState({ nama: "", harga: "", gambar: "" });
  const [filterStatus, setFilterStatus] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = async () => {
    try {
      const snapP = await getDocs(collection(db, "pemesanan"));
      setPemesanan(snapP.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const snapM = await getDocs(collection(db, "mobil"));
      setMobil(snapM.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch data:", error.message);
      alert("Terjadi kesalahan saat mengambil data.");
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
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("Akun tidak ditemukan di database.");
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      if (userData.role === "admin") {
        setIsAdmin(true);
        fetchData();
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

  const handleStatus = async (id, status, mobilId) => {
    await updateDoc(doc(db, "pemesanan", id), { status });
    if (status === "selesai") {
      await updateDoc(doc(db, "mobil", mobilId), { tersedia: true });
    }
    fetchData();
  };

  const handleTambahMobil = async () => {
    await addDoc(collection(db, "mobil"), {
      nama: form.nama,
      harga: parseInt(form.harga),
      gambar: form.gambar,
      tersedia: true,
      status: "normal"
    });
    setForm({ nama: "", harga: "", gambar: "" });
    fetchData();
  };

  const handleHapusMobil = async (id) => {
    await deleteDoc(doc(db, "mobil", id));
    fetchData();
  };

  const handleEditMobil = async (id, field, value) => {
    await updateDoc(doc(db, "mobil", id), { [field]: value });
    fetchData();
  };

  const toggleServis = async (id, currentStatus) => {
    const newStatus = currentStatus === "servis" ? "normal" : "servis";
    const tersedia = newStatus === "normal";
    await updateDoc(doc(db, "mobil", id), { status: newStatus, tersedia });
    fetchData();
  };

  const filteredPemesanan = pemesanan.filter(p => {
    if (filterStatus === "semua") return true;
    return p.status === filterStatus;
  });

  if (loading) return <p className="p-4">Memuat data...</p>;
  if (!isAdmin) return <p className="p-4 text-red-600 font-semibold">Anda tidak memiliki akses ke halaman ini.</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-10">
      {/* === Daftar Pemesanan === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-[#990000] mb-4">Daftar Pemesanan</h1>
        <div className="mb-4">
          <label className="font-semibold mr-2">Filter Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded px-3 py-1">
            <option value="semua">Semua</option>
            <option value="diproses">Diproses</option>
            <option value="disetujui">Disetujui</option>
            <option value="selesai">Selesai</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>

        <div className="grid gap-4">
          {filteredPemesanan.map((p) => (
            <div key={p.id} className="border p-4 rounded bg-gray-50 shadow-sm">
              <p><strong>Mobil:</strong> {p.namaMobil}</p>
              <p><strong>User:</strong> {p.email}</p>
              <p><strong>Tanggal:</strong> {new Date(p.tanggal).toLocaleString()}</p>
              <p><strong>Status:</strong> {p.status}</p>
              <div className="mt-3 space-x-2">
                {p.status === "diproses" && (
                  <>
                    <button onClick={() => handleStatus(p.id, "disetujui", p.mobilId)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Setujui</button>
                    <button onClick={() => handleStatus(p.id, "ditolak", p.mobilId)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Tolak</button>
                  </>
                )}
                {p.status === "disetujui" && (
                  <button onClick={() => handleStatus(p.id, "selesai", p.mobilId)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Selesai</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === Manajemen Mobil === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-[#990000] mb-4">Manajemen Mobil</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input type="text" placeholder="Nama Mobil" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="border p-2 rounded" />
          <input type="number" placeholder="Harga" value={form.harga} onChange={e => setForm({ ...form, harga: e.target.value })} className="border p-2 rounded" />
          <input type="text" placeholder="URL Gambar" value={form.gambar} onChange={e => setForm({ ...form, gambar: e.target.value })} className="border p-2 rounded" />
        </div>
        <button onClick={handleTambahMobil} className="bg-[#990000] text-white px-4 py-2 rounded hover:bg-red-800 mb-6">Tambah Mobil</button>

        <div className="grid gap-4 md:grid-cols-2">
          {mobil.map(m => (
            <div key={m.id} className="border p-4 rounded bg-gray-50 shadow-sm">
              <img src={m.gambar} alt={m.nama} className="h-32 w-full object-cover rounded" />
              <input type="text" value={m.nama} onChange={e => handleEditMobil(m.id, "nama", e.target.value)} className="text-lg font-bold w-full mt-2 border p-1 rounded" />
              <input type="number" value={m.harga} onChange={e => handleEditMobil(m.id, "harga", parseInt(e.target.value))} className="w-full border p-1 rounded mt-1" />
              <input type="text" value={m.gambar} onChange={e => handleEditMobil(m.id, "gambar", e.target.value)} className="w-full border p-1 rounded mt-1" />
              <p className="text-sm text-gray-600 mt-1">{m.tersedia ? 'Tersedia' : 'Tidak Tersedia'} | Status: {m.status}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => toggleServis(m.id, m.status)} className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">
                  {m.status === 'servis' ? 'Kembalikan Normal' : 'Set Servis'}
                </button>
                <button onClick={() => handleHapusMobil(m.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
