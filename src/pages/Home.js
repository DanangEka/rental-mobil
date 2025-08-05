import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { useEffect, useState } from "react";

export default function Home() {
  const [mobil, setMobil] = useState([]);
  const [tanggalMulai, setTanggalMulai] = useState({});
  const [tanggalSelesai, setTanggalSelesai] = useState({});

  // Ambil data mobil dari Firestore
  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "mobil"));
      setMobil(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  // Handler untuk ubah tanggal
  const handleTanggalChange = (id, type, value) => {
    if (type === "mulai") {
      setTanggalMulai((prev) => ({ ...prev, [id]: value }));
    } else {
      setTanggalSelesai((prev) => ({ ...prev, [id]: value }));
    }
  };

  // Fungsi ketika klik tombol "Sewa Sekarang"
  const handleSewa = async (m) => {
    if (!auth.currentUser) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    const mulai = tanggalMulai[m.id];
    const selesai = tanggalSelesai[m.id];

    if (!mulai || !selesai) {
      alert("Pilih tanggal mulai dan selesai terlebih dahulu.");
      return;
    }

    const start = new Date(mulai);
    const end = new Date(selesai);
    const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (durasiHari <= 0) {
      alert("Tanggal selesai harus setelah tanggal mulai.");
      return;
    }

    const perkiraanHarga = durasiHari * m.harga;

    try {
      // Tambah data pemesanan
      await addDoc(collection(db, "pemesanan"), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        mobilId: m.id,
        namaMobil: m.nama,
        tanggal: new Date().toISOString(),
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        durasiHari,
        hargaPerHari: m.harga,
        perkiraanHarga,
        status: "diproses"
      });

      // Ubah status mobil jadi "disewa"
      await updateDoc(doc(db, "mobil", m.id), {
        status: "disewa"
      });

      alert("Pemesanan berhasil! Silakan tunggu konfirmasi.");
      window.location.reload();
    } catch (err) {
      console.error("Gagal menyewa:", err);
      alert("Terjadi kesalahan saat menyewa.");
    }
  };

  return (
    <div className={`min-h-screen bg-black ${mobil.length > 0 ? 'pb-20' : ''}`}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#990000] to-red-800 text-white px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Sewa Mobil Terbaik</h1>
          <p className="text-sm md:text-base opacity-90">Pilih mobil impian Anda dengan harga terjangkau</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 py-4 md:px-4 md:py-6">
        {mobil.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Tidak ada mobil tersedia saat ini</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {mobil.map((m) => (
              <div key={m.id} className="bg-gray-900 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                {/* Image Container */}
                <div className="relative aspect-video bg-gray-800">
                  <img 
                    src={m.gambar} 
                    alt={m.nama} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    m.status === 'servis' ? 'bg-yellow-500 text-yellow-900'
                    : m.status === 'disewa' ? 'bg-red-500 text-white'
                    : 'bg-green-500 text-white'
                  }`}>
                    {m.status === 'servis' ? 'Servis'
                    : m.status === 'disewa' ? 'Disewa'
                    : 'Tersedia'}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-1">{m.nama}</h3>
                  <p className="text-red-400 font-semibold text-sm mb-3">
                    Rp {m.harga.toLocaleString()} <span className="text-gray-400 text-xs">/ hari</span>
                  </p>

                  {m.status === "tersedia" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Tanggal Mulai</label>
                          <input
                            type="datetime-local"
                            value={tanggalMulai[m.id] || ""}
                            onChange={(e) => handleTanggalChange(m.id, "mulai", e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Tanggal Selesai</label>
                          <input
                            type="datetime-local"
                            value={tanggalSelesai[m.id] || ""}
                            onChange={(e) => handleTanggalChange(m.id, "selesai", e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      </div>

                      {/* Estimasi harga */}
                      {tanggalMulai[m.id] && tanggalSelesai[m.id] && (
                        <div className="bg-gray-800 rounded-lg p-2">
                          <p className="text-xs text-gray-400 mb-1">Estimasi Biaya</p>
                          <p className="text-green-400 font-bold text-sm">
                            Rp{" "}
                            {(() => {
                              const durasi = Math.ceil((new Date(tanggalSelesai[m.id]) - new Date(tanggalMulai[m.id])) / (1000 * 60 * 60 * 24));
                              return durasi > 0 ? (durasi * m.harga).toLocaleString() : "0";
                            })()}
                          </p>
                        </div>
                      )}

                      <button
                        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm"
                        onClick={() => handleSewa(m)}
                      >
                        Sewa Sekarang
                      </button>
                    </div>
                  )}

                  {m.status === "disewa" && (
                    <div className="text-center py-4">
                      <div className="text-red-400 text-sm font-semibold">Mobil sedang disewa</div>
                      <div className="text-gray-500 text-xs mt-1">Cek kembali nanti</div>
                    </div>
                  )}

                  {m.status === "servis" && (
                    <div className="text-center py-4">
                      <div className="text-yellow-400 text-sm font-semibold">Sedang dalam perawatan</div>
                      <div className="text-gray-500 text-xs mt-1">Akan tersedia segera</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
