import { useEffect, useState } from "react";
import { auth, db, storage } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  addDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function CarManagement() {
  const [mobil, setMobil] = useState([]);
  const [form, setForm] = useState({ nama: "", harga: "", gambar: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchMobil, setSearchMobil] = useState("");

  const fetchData = async () => {
    try {
      const snapM = await getDocs(collection(db, "mobil"));
      setMobil(snapM.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch data:", error);
      alert("Terjadi kesalahan saat mengambil data. Error: " + error.message);
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Preview the selected image
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, gambar: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) {
      alert("Pilih gambar terlebih dahulu!");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `mobil/${Date.now()}_${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setForm({ ...form, gambar: downloadURL });
      setSelectedFile(null);
      alert("Gambar berhasil diupload!");
    } catch (error) {
      console.error("Gagal upload gambar:", error);
      alert("Gagal upload gambar: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTambahMobil = async () => {
    if (!form.nama || !form.harga || !form.gambar) {
      alert("Semua field harus diisi!");
      return;
    }

    try {
      await addDoc(collection(db, "mobil"), {
        nama: form.nama,
        harga: parseInt(form.harga),
        gambar: form.gambar,
        tersedia: true,
        status: "normal"
      });
      setForm({ nama: "", harga: "", gambar: "" });
      setSelectedFile(null);
      fetchData();
    } catch (error) {
      console.error("Gagal tambah mobil:", error.message);
      alert("Gagal menambah mobil.");
    }
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

  const filteredMobil = mobil.filter(m => {
    if (searchMobil === "") return true;
    return m.nama?.toLowerCase().includes(searchMobil.toLowerCase()) ||
           m.status?.toLowerCase().includes(searchMobil.toLowerCase()) ||
           m.harga?.toString().includes(searchMobil);
  });

  if (loading) return <p className="p-4">Memuat data...</p>;
  if (!isAdmin) return <p className="p-4 text-red-600 font-semibold">Anda tidak memiliki akses ke halaman ini.</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* === Manajemen Mobil === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-[#990000] mb-4">Manajemen Mobil</h2>
        <div className="mb-4">
          <label className="font-semibold mr-2">Cari Mobil:</label>
          <input
            type="text"
            placeholder="Cari berdasarkan nama, status, harga..."
            value={searchMobil}
            onChange={(e) => setSearchMobil(e.target.value)}
            className="border rounded px-3 py-1 w-64"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input type="text" placeholder="Nama Mobil" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="border p-2 rounded" />
          <input type="number" placeholder="Harga" value={form.harga} onChange={e => setForm({ ...form, harga: e.target.value })} className="border p-2 rounded" />
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="border p-2 rounded w-full"
              disabled={isUploading}
            />
            {selectedFile && (
              <button
                onClick={handleUploadImage}
                disabled={isUploading}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
              >
                {isUploading ? "Uploading..." : "Upload Gambar"}
              </button>
            )}
            {form.gambar && (
              <div className="mt-2">
                <img src={form.gambar} alt="Preview" className="w-20 h-20 object-cover rounded" />
              </div>
            )}
          </div>
        </div>
        <button onClick={handleTambahMobil} className="bg-[#990000] text-white px-4 py-2 rounded hover:bg-red-800 mb-6">Tambah Mobil</button>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredMobil.map(m => (
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
