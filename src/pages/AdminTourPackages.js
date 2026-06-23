import { useEffect, useState } from "react";
import { auth, db, storage } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Map, Search, Plus, Trash2, Settings, Image as ImageIcon, MapPin, Check, ListChecks } from "lucide-react";

export default function AdminTourPackages() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({ 
    judul: "", 
    description: "", 
    harga: "", 
    durasi: "", 
    destinasi: "", 
    imageUrl: "", 
    fasilitas: "" 
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, "tour_packages"));
      setPackages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch data:", error);
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
          fetchData();
        }
      } catch (error) {
        console.error("Error verifikasi admin:", error.message);
      }

      setLoading(false);
    };
    checkAdminStatus();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, imageUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `packages/${Date.now()}_${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setForm({ ...form, imageUrl: downloadURL });
      setSelectedFile(null);
      alert("Gambar berhasil diunggah!");
    } catch (error) {
      console.error("Gagal upload gambar:", error);
      alert("Gagal upload gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTambahPackage = async () => {
    if (!form.judul || !form.harga || !form.imageUrl || !form.durasi) {
      alert("Lengkapi data paket wisata!");
      return;
    }

    try {
      await addDoc(collection(db, "tour_packages"), {
        ...form,
        harga: parseInt(form.harga),
        status: "Tersedia",
        timestamp: serverTimestamp()
      });
      setForm({ 
        judul: "", 
        description: "", 
        harga: "", 
        durasi: "", 
        destinasi: "", 
        imageUrl: "", 
        fasilitas: "" 
      });
      setSelectedFile(null);
      fetchData();
      alert("Paket Wisata berhasil ditambahkan!");
    } catch (error) {
      console.error("Gagal tambah paket:", error.message);
    }
  };

  const handleHapusPackage = async (id) => {
    if(window.confirm("Hapus paket wisata ini?")) {
      await deleteDoc(doc(db, "tour_packages", id));
      fetchData();
    }
  };


  const filteredPackages = packages.filter(p => {
    if (searchTerm === "") return true;
    return p.judul?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.destinasi?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[160px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-slate-50 pt-[160px] flex items-center justify-center p-6 text-center">
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
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
            <Map size={14} />
            <span>Manajemen Layanan</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paket Wisata</h1>
              <p className="text-slate-500 mt-1">Buat dan kelola paket perjalanan wisata eksklusif.</p>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#990000] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Cari paket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-6 py-3.5 focus:ring-2 focus:ring-red-100 focus:border-[#990000] outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Form Create */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sticky top-[180px] max-h-[calc(100vh-210px)] overflow-y-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-red-50 text-[#990000] rounded-xl flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Tambah Paket</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Judul Paket</label>
                  <input
                    type="text"
                    placeholder="Contoh: Explore Bali 3D2N"
                    value={form.judul}
                    onChange={e => setForm({ ...form, judul: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Harga (Rp)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={form.harga}
                      onChange={e => setForm({ ...form, harga: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Durasi</label>
                    <input
                      type="text"
                      placeholder="e.g. 3 Hari 2 Malam"
                      value={form.durasi}
                      onChange={e => setForm({ ...form, durasi: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Destinasi Utama</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kuta, Ubud, Uluwatu"
                    value={form.destinasi}
                    onChange={e => setForm({ ...form, destinasi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Keterangan / Fasilitas</label>
                  <textarea
                    placeholder="Detail paket..."
                    rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:border-[#990000] outline-none transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Banner Paket</label>
                  <div className="relative group overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 transition-all hover:border-[#990000]/30">
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {form.imageUrl ? (
                      <div className="flex items-center gap-4">
                        <img src={form.imageUrl} alt="Preview" className="w-16 h-12 object-cover rounded-lg shadow-sm" />
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

                <button onClick={handleTambahPackage} className="w-full py-4 bg-[#990000] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-[#7a0000] shadow-lg shadow-red-900/10 active:scale-95">
                  Publikasikan Paket
                </button>
              </div>
            </div>
          </div>

          {/* List View */}
          <div className="lg:col-span-2 space-y-6">
            {filteredPackages.map((p) => (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow group">
                <div className="w-full md:w-64 h-48 bg-slate-100 flex-shrink-0 relative overflow-hidden">
                  <img src={p.imageUrl} alt={p.judul} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-[#990000] border border-red-100 shadow-sm">
                      {p.durasi}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{p.judul}</h3>
                      <p className="text-2xl font-black text-[#990000]">Rp {(p.harga / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 mb-4">
                      <MapPin size={14} className="text-[#990000]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{p.destinasi}</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 italic mb-4 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex gap-2">
                      <div className="px-3 py-1 bg-emerald-50 rounded-lg flex items-center gap-2">
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{p.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleHapusPackage(p.id)}
                        className="p-2.5 bg-red-50 text-[#990000] hover:bg-[#990000] hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredPackages.length === 0 && (
              <div className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#990000]/10"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <ListChecks size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Belum ada Paket Wisata</h3>
                  <p className="text-sm text-slate-400 italic max-w-xs mx-auto">
                    Mulai buat paket perjalanan menarik untuk klien Anda dengan formulir di samping.
                  </p>
                  <div className="mt-8 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-100 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-red-200 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-red-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
