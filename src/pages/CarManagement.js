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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
      {/* === Manajemen Mobil === */}
      <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Mobil</h2>
          <p className="text-gray-600">Kelola inventaris mobil rental Anda</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Mobil</label>
          <input
            type="text"
            placeholder="Cari berdasarkan nama, status, harga..."
            value={searchMobil}
            onChange={(e) => setSearchMobil(e.target.value)}
            className="w-full md:w-80 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          />
        </div>
        {/* Form Tambah Mobil */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Tambah Mobil Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nama Mobil</label>
              <input
                type="text"
                placeholder="Masukkan nama mobil"
                value={form.nama}
                onChange={e => setForm({ ...form, nama: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Harga per Hari</label>
              <input
                type="number"
                placeholder="Masukkan harga"
                value={form.harga}
                onChange={e => setForm({ ...form, harga: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Mobil</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                disabled={isUploading}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="mb-6">
              <button
                onClick={handleUploadImage}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isUploading ? "Mengupload..." : "Upload Gambar"}
              </button>
            </div>
          )}

          {form.gambar && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview Gambar:</p>
              <img src={form.gambar} alt="Preview" className="w-32 h-32 object-cover rounded-lg shadow-md border border-gray-200" />
            </div>
          )}

          <button
            onClick={handleTambahMobil}
            className="bg-[#990000] hover:bg-red-700 text-white px-8 py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            Tambah Mobil
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredMobil.map(m => (
            <div key={m.id} className="border p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
              <img src={m.gambar} alt={m.nama} className="h-40 w-full object-cover rounded-lg mb-4" />
              <input
                type="text"
                value={m.nama}
                onChange={e => handleEditMobil(m.id, "nama", e.target.value)}
                className="text-xl font-bold w-full mb-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
              <input
                type="number"
                value={m.harga}
                onChange={e => handleEditMobil(m.id, "harga", parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
              <input
                type="text"
                value={m.gambar}
                onChange={e => handleEditMobil(m.id, "gambar", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
              <p className="text-sm text-gray-600 mb-4">{m.tersedia ? 'Tersedia' : 'Tidak Tersedia'} | Status: {m.status}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => toggleServis(m.id, m.status)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                >
                  {m.status === 'servis' ? 'Kembalikan Normal' : 'Set Servis'}
                </button>
                <button
                  onClick={() => handleHapusMobil(m.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
