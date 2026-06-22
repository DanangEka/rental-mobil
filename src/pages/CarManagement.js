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
import { Car, Search, Plus, Trash2, Settings, Image as ImageIcon, Luggage, BatteryCharging, Users as UsersIcon, Check } from "lucide-react";

export default function CarManagement() {
  const [mobil, setMobil] = useState([]);
  const [form, setForm] = useState({ nama: "", harga: "", gambar: "", layanan: "Lepas Kunci", seats: 4, chargingPort: true, luggage: true });
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
    }
  };

  const checkAdmin = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims.admin === true) {
        setIsAdmin(true);
        fetchData();
      }
    } catch (error) {
      console.error("Error verifikasi admin:", error.message);
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
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, gambar: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `mobil/${Date.now()}_${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setForm({ ...form, gambar: downloadURL });
      setSelectedFile(null);
      alert("Gambar berhasil diunggah!");
    } catch (error) {
      console.error("Gagal upload gambar:", error);
      alert("Gagal upload gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTambahMobil = async () => {
    if (!form.nama || !form.harga || !form.gambar) {
      alert("Lengkapi data mobil!");
      return;
    }

    try {
      await addDoc(collection(db, "mobil"), {
        nama: form.nama,
        harga: parseInt(form.harga),
        gambar: form.gambar,
        layanan: form.layanan,
        withDriver: form.layanan === "Dengan Driver",
        seats: parseInt(form.seats),
        chargingPort: form.chargingPort,
        luggage: form.luggage,
        tersedia: true,
        status: "normal"
      });
      setForm({ nama: "", harga: "", gambar: "", layanan: "Lepas Kunci", seats: 4, chargingPort: true, luggage: true });
      setSelectedFile(null);
      fetchData();
      alert("Mobil berhasil ditambahkan!");
    } catch (error) {
      console.error("Gagal tambah mobil:", error.message);
    }
  };

  const handleHapusMobil = async (id) => {
    if(window.confirm("Hapus armada ini dari daftar?")) {
      await deleteDoc(doc(db, "mobil", id));
      fetchData();
    }
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
           m.status?.toLowerCase().includes(searchMobil.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[100px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-slate-50 pt-[100px] flex items-center justify-center p-6 text-center">
       <div className="bg-white p-10 rounded-3xl shadow-xl shadow-red-900/5 max-w-md w-full border border-red-50">
          <div className="w-20 h-20 bg-red-50 text-[#990000] rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Akses Terbatas</h2>
          <p className="text-slate-500 mb-8 italic">Halaman ini hanya dapat diakses oleh Administrator sistem Cakra Lima Tujuh.</p>
          <div className="h-1.5 w-12 bg-[#990000] mx-auto rounded-full"></div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
            <Car size={14} />
            <span>Manajemen Inventaris</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Katalog Armada</h1>
              <p className="text-slate-500 mt-1">Kelola data kendaraan, ketersediaan, dan status layanan.</p>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#990000] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Cari armada..."
                value={searchMobil}
                onChange={(e) => setSearchMobil(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-6 py-3.5 focus:ring-2 focus:ring-red-100 focus:border-[#990000] outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Form Create (Sticky left) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sticky top-[120px]">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-red-50 text-[#990000] rounded-xl flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Tambah Armada</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Identitas Mobil</label>
                  <input
                    type="text"
                    placeholder="Contoh: Toyota Alphard Gen 4"
                    value={form.nama}
                    onChange={e => setForm({ ...form, nama: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tarif Per Hari (Rp)</label>
                  <input
                    type="number"
                    placeholder="000.000"
                    value={form.harga}
                    onChange={e => setForm({ ...form, harga: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Layanan</label>
                    <select
                      value={form.layanan}
                      onChange={e => setForm({ ...form, layanan: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold appearance-none cursor-pointer"
                    >
                      <option value="Lepas Kunci">Lepas Kunci</option>
                      <option value="Dengan Driver">Dengan Driver</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Kursi</label>
                    <input
                      type="number"
                      value={form.seats}
                      onChange={e => setForm({ ...form, seats: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-6 py-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={form.chargingPort} onChange={e => setForm({ ...form, chargingPort: e.target.checked })} className="w-4 h-4 accent-[#990000]" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Port</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={form.luggage} onChange={e => setForm({ ...form, luggage: e.target.checked })} className="w-4 h-4 accent-[#990000]" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bagasi</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Foto Armada</label>
                  <div className="relative group overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 transition-all hover:border-[#990000]/30">
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {form.gambar ? (
                      <div className="flex items-center gap-4">
                        <img src={form.gambar} alt="Preview" className="w-16 h-12 object-cover rounded-lg shadow-sm" />
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{selectedFile?.name || "Foto Terpilih"}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 py-2">
                        <ImageIcon size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Pilih Gambar</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFile && (
                  <button onClick={handleUploadImage} disabled={isUploading} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-black disabled:opacity-50">
                    {isUploading ? "Mengunggah..." : "Konfirmasi Unggah Foto"}
                  </button>
                )}

                <button onClick={handleTambahMobil} className="w-full py-4 bg-[#990000] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-[#7a0000] shadow-lg shadow-red-900/10 active:scale-95">
                  Simpan Unit Baru
                </button>
              </div>
            </div>
          </div>

          {/* Table/List View */}
          <div className="lg:col-span-2 space-y-6">
            {filteredMobil.map((m) => (
              <div key={m.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                {/* Car Image Area */}
                <div className="w-full md:w-48 h-36 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                  <img src={m.gambar} alt={m.nama} className="w-full h-full object-cover" />
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{m.nama}</h3>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${m.tersedia ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-[#990000] border border-red-100'}`}>
                          {m.tersedia ? 'Tersedia' : 'Disewa'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400">ID: {m.id.substring(0, 10)}...</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarif Sewa</p>
                      <p className="text-2xl font-black text-[#990000]">Rp {(m.harga / 1000).toFixed(0)}k<span className="text-xs text-slate-400 font-bold">/hari</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center gap-1">
                      <UsersIcon size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-600">{m.seats || 4} Seat</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center gap-1">
                      <BatteryCharging size={14} className={` ${m.chargingPort !== false ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className="text-[10px] font-bold text-slate-600">Port</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center gap-1">
                      <Luggage size={14} className={` ${m.luggage !== false ? 'text-amber-500' : 'text-slate-300'}`} />
                      <span className="text-[10px] font-bold text-slate-600">Bagasi</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center gap-1">
                      <Settings size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-[#990000] uppercase italic">{m.status}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2">
                       <select
                        value={m.layanan || "Lepas Kunci"}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleEditMobil(m.id, "layanan", val);
                          handleEditMobil(m.id, "withDriver", val === "Dengan Driver");
                        }}
                        className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg outline-none focus:border-[#990000] cursor-pointer"
                      >
                        <option value="Lepas Kunci">Lepas Kunci</option>
                        <option value="Dengan Driver">Dengan Driver</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={m.harga}
                          onChange={(e) => handleEditMobil(m.id, "harga", parseInt(e.target.value))}
                          className="w-24 bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg outline-none focus:border-[#990000]"
                        />
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg" title="Auto-saved">
                          <Check size={14} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                       <button
                        onClick={() => toggleServis(m.id, m.status)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${m.status === "servis" ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'}`}
                      >
                        {m.status === "servis" ? "KEMBALI NORMAL" : "SET SERVIS"}
                      </button>
                      <button
                        onClick={() => handleHapusMobil(m.id)}
                        className="p-2.5 bg-red-50 text-[#990000] hover:bg-[#990000] hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredMobil.length === 0 && (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold italic">Tidak ada armada ditemukan.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
