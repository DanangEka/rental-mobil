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

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="animate-pulse space-y-8 mt-6 md:mt-10">
            <div className="h-12 bg-gray-800 rounded-2xl w-1/3"></div>
            <div className="h-64 bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 text-center">
       <div className="glass-card bg-gray-900/40 p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-red-500/20 max-w-md w-full">
          <p className="text-red-500 font-black text-xl mb-4 uppercase tracking-tighter">Akses Ditolak</p>
          <p className="text-gray-400 font-bold mb-6 md:mb-8 italic">Identitas Anda tidak terdaftar sebagai administrator sistem.</p>
          <div className="h-1 w-20 bg-red-500/50 mx-auto rounded-full"></div>
       </div>
    </div>
  );

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Manajemen Mobil</h1>
              <p className="text-gray-400 text-lg">Kelola ketersediaan, rotasi, dan inventaris armada kendaraan.</p>
            </div>
          </div>
        </div>

        {/* Form Tambah Mobil - Glass Style */}
        <section className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] p-5 sm:p-8 md:p-10 border border-gray-800 mb-8 md:mb-12 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-4 mb-6 md:mb-8">
             <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
             <h2 className="text-xl font-bold text-white tracking-tight">Daftarkan Armada Baru</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 md:mb-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Identitas Kendaraan</label>
              <input
                type="text"
                placeholder="Contoh: Toyota Fortuner GR"
                value={form.nama}
                onChange={e => setForm({ ...form, nama: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-4 md:px-6 py-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-600 font-bold"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tarif Sewa (Hari)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs">Rp</span>
                <input
                  type="number"
                  placeholder="000.000"
                  value={form.harga}
                  onChange={e => setForm({ ...form, harga: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-600 font-bold"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Katalog Foto</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                />
                <div className="w-full bg-gray-800/50 border border-dashed border-gray-700 text-gray-500 rounded-2xl px-4 md:px-6 py-4 flex items-center justify-center gap-3 group-hover:bg-gray-800 transition-colors">
                   <div className="w-6 h-6 border-2 border-current rounded-lg flex items-center justify-center font-black text-[10px] italic">JPG</div>
                   <span className="text-xs font-black uppercase tracking-widest">{selectedFile ? selectedFile.name.substring(0, 15) + '...' : 'Pilih Berkas'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {selectedFile && (
              <button
                onClick={handleUploadImage}
                disabled={isUploading}
                className="w-full md:w-auto bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-4 md:px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isUploading ? "Mensinkronisasi..." : "Konfirmasi Upload"}
              </button>
            )}

            {form.gambar && (
              <div className="flex items-center gap-4 bg-gray-800/30 p-2 rounded-2xl border border-gray-800/50">
                <img src={form.gambar} alt="Preview" className="w-12 h-12 object-cover rounded-xl shadow-lg" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pr-4 italic">Foto Siap.</span>
              </div>
            )}

            <button
              onClick={handleTambahMobil}
              className="w-full md:w-auto md:ml-auto bg-brand-600 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-brand-sm hover:translate-y-[-2px]"
            >
              Simpan Identitas Mobil
            </button>
          </div>
        </section>

        {/* Inventory Grid */}
        <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6 md:mb-8">
             <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
                <h2 className="text-2xl font-black text-white tracking-tight">Inventaris Armada ({filteredMobil.length})</h2>
             </div>
             
             <div className="relative group w-full max-w-xs hidden md:block">
                <input 
                  type="text" 
                  placeholder="CARI ARMADA..."
                  value={searchMobil}
                  onChange={(e) => setSearchMobil(e.target.value)}
                  className="w-full bg-gray-900/40 border border-gray-800 text-white rounded-xl px-4 md:px-6 py-2.5 text-[10px] font-black tracking-widest focus:border-brand-500 transition-all outline-none"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {filteredMobil.map((m) => (
              <div key={m.id} className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] border border-gray-800 overflow-hidden hover:border-brand-500/30 transition-all group flex flex-col">
                <div className="relative h-56 overflow-hidden">
                  <img src={m.gambar} alt={m.nama} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent"></div>
                  <div className="absolute top-6 right-6">
                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${m.tersedia ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                        {m.tersedia ? 'Tersedia' : 'Disewa'}
                     </span>
                  </div>
                  <div className="absolute bottom-6 left-8">
                     <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{m.nama}</h3>
                  </div>
                </div>

                <div className="p-4 sm:p-6 md:p-8 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-4 mb-6 md:mb-8">
                    <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800/50">
                       <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Tarif / Hari</p>
                       <p className="text-xl font-black text-white">Rp {(m.harga / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800/50">
                       <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Status Unit</p>
                       <p className="text-sm font-black text-brand-400 uppercase italic">{m.status}</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6 md:mb-8">
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">Update Nama</label>
                        <input
                          type="text"
                          value={m.nama}
                          onChange={(e) => handleEditMobil(m.id, "nama", e.target.value)}
                          className="w-full bg-gray-800/30 border border-gray-800 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-500 transition-all"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">Update Tarif</label>
                        <input
                          type="number"
                          value={m.harga}
                          onChange={(e) => handleEditMobil(m.id, "harga", parseInt(e.target.value))}
                          className="w-full bg-gray-800/30 border border-gray-800 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-500 transition-all"
                        />
                     </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-4">
                    <button
                      onClick={() => toggleServis(m.id, m.status)}
                      className={`py-3 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all border ${m.status === "servis" ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-yellow-600/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-600 hover:text-white'}`}
                    >
                      {m.status === "servis" ? "NORMAL" : "SET SERVIS"}
                    </button>
                    <button
                      onClick={() => handleHapusMobil(m.id)}
                      className="bg-red-600/10 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white py-3 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Hapus Unit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
